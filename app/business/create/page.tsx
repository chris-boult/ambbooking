'use client'

import { useState } from 'react'
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

export default function CreateBusinessPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)

  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [slug, setSlug] = useState('')

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

  const handleBusinessName = (value: string) => {
    setBusinessName(value)

    if (!slug) {
      setSlug(generateSlug(value))
    }
  }

  async function createBusiness() {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        alert('Please log in first')
        return
      }

      const trialEnds = new Date()
      trialEnds.setDate(trialEnds.getDate() + 7)

      const { error } = await supabase.from('businesses').insert({
        user_id: user.id,
        business_name: businessName,
        industry,
        email,
        phone,
        website,
        slug,
        timezone: 'Europe/London',
        plan: 'starter',
        subscription_status: 'trial',
        trial_ends_at: trialEnds.toISOString(),
        is_internal: false,
      })

      if (error) {
        alert(error.message)
        return
      }

      router.push('/onboarding/services')
    } catch (error) {
      console.error(error)
      alert('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#0ea5e933_0%,transparent_30%),radial-gradient(circle_at_bottom_right,#7c3aed33_0%,transparent_30%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          <div>
            <div className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sky-300 text-sm font-medium mb-8">
              AMB BOOKING
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
              Let's get your
              <span className="block bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                business online.
              </span>
            </h1>

            <p className="text-slate-400 text-lg leading-8 max-w-xl mb-10">
              Create your booking system in under five minutes.
              Add services, staff, availability and start accepting bookings online.
            </p>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 mb-8">
              <div className="text-sm text-sky-300 font-semibold mb-6">
                STEP 1 OF 5
              </div>

              <div className="space-y-4 text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-sky-400" />
                  Business Details
                </div>

                <div className="flex items-center gap-3 opacity-60">
                  <div className="w-3 h-3 rounded-full bg-slate-600" />
                  Services
                </div>

                <div className="flex items-center gap-3 opacity-60">
                  <div className="w-3 h-3 rounded-full bg-slate-600" />
                  Team
                </div>

                <div className="flex items-center gap-3 opacity-60">
                  <div className="w-3 h-3 rounded-full bg-slate-600" />
                  Availability
                </div>

                <div className="flex items-center gap-3 opacity-60">
                  <div className="w-3 h-3 rounded-full bg-slate-600" />
                  Plan & Trial
                </div>
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

          <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-[32px] p-8 lg:p-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white">
                Business Details
              </h2>

              <div className="rounded-full bg-sky-500/10 border border-sky-500/30 px-4 py-2 text-sky-300 text-sm">
                7-Day Free Trial
              </div>
            </div>

            <div className="grid gap-5">

              <input
                className="h-14 rounded-xl bg-slate-900/80 border border-slate-700 px-4 text-white outline-none"
                placeholder="Business Name"
                value={businessName}
                onChange={(e) => handleBusinessName(e.target.value)}
              />

              <select
                className="h-14 rounded-xl bg-slate-900/80 border border-slate-700 px-4 text-white outline-none"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="">Select Industry</option>

                {industries.map((industry) => (
                  <option key={industry}>{industry}</option>
                ))}
              </select>

              <input
                className="h-14 rounded-xl bg-slate-900/80 border border-slate-700 px-4 text-white outline-none"
                placeholder="Business Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className="h-14 rounded-xl bg-slate-900/80 border border-slate-700 px-4 text-white outline-none"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <input
                className="h-14 rounded-xl bg-slate-900/80 border border-slate-700 px-4 text-white outline-none"
                placeholder="Website (optional)"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />

              <input
                className="h-14 rounded-xl bg-slate-900/80 border border-slate-700 px-4 text-white outline-none"
                placeholder="Booking URL"
                value={slug}
                onChange={(e) =>
                  setSlug(generateSlug(e.target.value))
                }
              />

              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
                <div className="text-slate-500 text-sm mb-2">
                  Your booking page
                </div>

                <div className="font-mono text-sky-400 break-all">
                  https://app.ambbooking.co.uk/{slug || 'your-business'}
                </div>
              </div>

              <button
                onClick={createBusiness}
                disabled={loading}
                className="h-14 rounded-xl font-semibold text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:opacity-90 transition"
              >
                {loading
                  ? 'Creating Business...'
                  : 'Create Business & Continue →'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}