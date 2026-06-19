'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const industries = [
  'Barber',
  'Hair Salon',
  'Beauty Salon',
  'Nail Technician',
  'Aesthetics Clinic',
  'Tattoo Studio',
  'Massage Therapist',
  'Personal Trainer',
  'Gym',
  'Yoga Studio',
  'Physiotherapy',
  'Chiropractor',
  'Dentist',
  'Veterinary Practice',
  'Garage',
  'Vehicle Detailing',
  'Electrician',
  'Plumber',
  'Heating Engineer',
  'Builder',
  'Carpenter',
  'Painter & Decorator',
  'Landscaper',
  'Tree Surgeon',
  'Cleaning Company',
  'Dog Groomer',
  'Driving Instructor',
  'Tutor',
  'Photographer',
  'Videographer',
  'Marketing Agency',
  'Web Design Agency',
  'Accountancy Practice',
  'Estate Agent',
  'Other',
]

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return ''

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)

  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || ''
  }

  return ''
}

const cleanReferralCode = (value: string | null | undefined) =>
  String(value || '')
    .trim()
    .toUpperCase()

export default function CreateBusinessPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [referralPartnerName, setReferralPartnerName] = useState('')

  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [slug, setSlug] = useState('')

  const bookingBaseUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://app.ambbooking.co.uk'
  }, [])

  useEffect(() => {
    async function loadReferral() {
      const localRef = typeof window !== 'undefined' ? localStorage.getItem('partner_ref') : ''
      const cookieRef = getCookie('partner_ref')
      const userRef = await getUserReferralCode()
      const code = cleanReferralCode(localRef || cookieRef || userRef)

      if (!code) return

      setReferralCode(code)

      const { data } = await supabase
        .from('partners')
        .select('company_name, full_name')
        .eq('referral_code', code)
        .maybeSingle()

      if (data) {
        setReferralPartnerName(data.company_name || data.full_name || '')
      }
    }

    loadReferral()
  }, [])

  async function getUserReferralCode() {
    const { data } = await supabase.auth.getUser()
    return cleanReferralCode(data.user?.user_metadata?.partner_ref)
  }

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

  const handleBusinessName = (value: string) => {
    setBusinessName(value)

    if (!slug) {
      setSlug(generateSlug(value))
    }
  }

  async function createBusiness() {
    try {
      setLoading(true)
      setMessage('')

      if (!businessName.trim()) {
        setMessage('Please enter your business name.')
        return
      }

      if (!industry) {
        setMessage('Please select your industry.')
        return
      }

      if (!email.trim()) {
        setMessage('Please enter your business email.')
        return
      }

      if (!slug.trim()) {
        setMessage('Please choose your booking URL.')
        return
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) {
        router.push('/login')
        return
      }

      const finalReferralCode = cleanReferralCode(
        referralCode ||
          localStorage.getItem('partner_ref') ||
          getCookie('partner_ref') ||
          user.user_metadata?.partner_ref
      )

      let partnerId: string | null = null

      if (finalReferralCode) {
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id, company_name, full_name')
          .eq('referral_code', finalReferralCode)
          .eq('status', 'active')
          .maybeSingle()

        if (partnerError) {
          setMessage(partnerError.message)
          return
        }

        if (partnerData) {
          partnerId = partnerData.id
        }
      }

      const trialEnds = new Date()
      trialEnds.setDate(trialEnds.getDate() + 7)

      const { data: businessData, error } = await supabase
        .from('businesses')
        .insert({
          user_id: user.id,
          business_name: businessName.trim(),
          industry,
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          website: website.trim(),
          slug: generateSlug(slug),
          timezone: 'Europe/London',
          plan: 'starter',
          subscription_status: 'trial',
          trial_ends_at: trialEnds.toISOString(),
          is_internal: false,
          partner_id: partnerId,
          acquisition_source: partnerId ? 'Partner' : 'Direct',
          acquisition_reference: partnerId ? finalReferralCode : null,
          acquisition_date: partnerId ? new Date().toISOString() : null,
        })
        .select('id, monthly_amount, plan')
        .maybeSingle()

      if (error) {
        setMessage(error.message)
        return
      }

      if (partnerId && businessData?.id) {
        const monthlyValue = Number(businessData.monthly_amount || 0)

        await supabase.from('partner_referrals').insert({
          partner_id: partnerId,
          business_id: businessData.id,
          referral_code: finalReferralCode,
          referral_source: 'signup',
          referral_url: typeof window !== 'undefined' ? window.location.href : null,
          subscription_value: monthlyValue,
          monthly_recurring_revenue: monthlyValue,
          status: 'trial',
        })
      }

      if (partnerId) {
        localStorage.removeItem('partner_ref')
        document.cookie = 'partner_ref=; path=/; max-age=0; SameSite=Lax'
      }

      router.push('/onboarding/services')
    } catch (error) {
      console.error(error)
      setMessage('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#0ea5e933_0%,transparent_30%),radial-gradient(circle_at_bottom_right,#7c3aed33_0%,transparent_30%)]" />
      <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-16">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-8 inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300">
              AMB BOOKING
            </div>

            <h1 className="mb-6 text-5xl font-bold leading-tight text-white md:text-6xl">
              Let's get your
              <span className="block bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                business online.
              </span>
            </h1>

            <p className="mb-10 max-w-xl text-lg leading-8 text-slate-400">
              Create your booking system in under five minutes. Add services, staff, availability and start accepting bookings online.
            </p>

            {referralCode && (
              <div className="mb-8 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-6 text-cyan-100">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Referral applied</p>
                <p className="mt-3 text-lg font-bold">{referralCode}</p>
                <p className="mt-2 text-sm text-cyan-100/80">
                  {referralPartnerName
                    ? `This business will be attributed to ${referralPartnerName}.`
                    : 'This business will be attributed to the referring partner.'}
                </p>
              </div>
            )}

            <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <div className="mb-6 text-sm font-semibold text-sky-300">STEP 1 OF 5</div>

              <div className="space-y-4 text-slate-300">
                <Step active label="Business Details" />
                <Step label="Services" />
                <Step label="Team" />
                <Step label="Availability" />
                <Step label="Plan & Trial" />
              </div>
            </div>

            <div className="grid gap-4">
              {[
                'Online booking page',
                'Customer database',
                'Availability & time off',
                'Automated confirmations',
                '7-day free trial',
                'No payment today',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-slate-300">
                  <span className="text-green-400">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl lg:p-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-bold text-white">Business Details</h2>

              <div className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-300">
                7-Day Free Trial
              </div>
            </div>

            {message && (
              <div className="mb-5 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
                {message}
              </div>
            )}

            <div className="grid gap-5">
              <input
                className="h-14 rounded-xl border border-slate-700 bg-slate-900/80 px-4 text-white outline-none focus:border-cyan-300"
                placeholder="Business Name"
                value={businessName}
                onChange={(e) => handleBusinessName(e.target.value)}
              />

              <select
                className="h-14 rounded-xl border border-slate-700 bg-slate-900/80 px-4 text-white outline-none focus:border-cyan-300"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="">Select Industry</option>
                {industries.map((industry) => (
                  <option key={industry}>{industry}</option>
                ))}
              </select>

              <input
                className="h-14 rounded-xl border border-slate-700 bg-slate-900/80 px-4 text-white outline-none focus:border-cyan-300"
                placeholder="Business Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className="h-14 rounded-xl border border-slate-700 bg-slate-900/80 px-4 text-white outline-none focus:border-cyan-300"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <input
                className="h-14 rounded-xl border border-slate-700 bg-slate-900/80 px-4 text-white outline-none focus:border-cyan-300"
                placeholder="Website (optional)"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />

              <input
                className="h-14 rounded-xl border border-slate-700 bg-slate-900/80 px-4 text-white outline-none focus:border-cyan-300"
                placeholder="Booking URL"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
              />

              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
                <div className="mb-2 text-sm text-slate-500">Your booking page</div>
                <div className="break-all font-mono text-sky-400">
                  {bookingBaseUrl}/{slug || 'your-business'}
                </div>
              </div>

              <button
                onClick={createBusiness}
                disabled={loading}
                className="h-14 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? 'Creating Business...' : 'Create Business & Continue →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function Step({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${active ? '' : 'opacity-60'}`}>
      <div className={`h-3 w-3 rounded-full ${active ? 'bg-sky-400' : 'bg-slate-600'}`} />
      {label}
    </div>
  )
}
