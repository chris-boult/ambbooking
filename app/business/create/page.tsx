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

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value)

    if (!slug) {
      setSlug(generateSlug(value))
    }
  }

  const createBusiness = async () => {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        alert('Please log in first')
        return
      }

      if (
        !businessName ||
        !industry ||
        !email ||
        !phone ||
        !slug
      ) {
        alert('Please complete all required fields')
        return
      }

      const trialEnds = new Date()
      trialEnds.setDate(trialEnds.getDate() + 7)

      const { error } = await supabase
        .from('businesses')
        .insert({
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
        console.error(error)
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
    <main
      style={{
        minHeight: '100vh',
        background: '#0f172a',
        padding: '60px 20px',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
        }}
      >
        <div>
          <div
            style={{
              color: '#38bdf8',
              fontWeight: 700,
              marginBottom: '16px',
            }}
          >
            AMB BOOKING
          </div>

          <h1
            style={{
              color: '#fff',
              fontSize: '52px',
              lineHeight: 1.1,
              marginBottom: '24px',
            }}
          >
            Start your 7-day free trial
          </h1>

          <p
            style={{
              color: '#94a3b8',
              fontSize: '18px',
              lineHeight: 1.8,
            }}
          >
            Create your business, set up your services,
            add your team and start taking bookings online.
          </p>

          <div
            style={{
              marginTop: '40px',
              padding: '24px',
              background: '#1e293b',
              borderRadius: '16px',
            }}
          >
            <div style={{ color: '#fff', marginBottom: '10px' }}>
              Booking URL Preview
            </div>

            <div style={{ color: '#38bdf8' }}>
              app.ambbooking.co.uk/{slug || 'your-business'}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '24px',
            padding: '32px',
          }}
        >
          <h2
            style={{
              marginBottom: '24px',
              color: '#0f172a',
            }}
          >
            Business Details
          </h2>

          <div style={{ display: 'grid', gap: '16px' }}>
            <input
              placeholder="Business Name"
              value={businessName}
              onChange={(e) =>
                handleBusinessNameChange(e.target.value)
              }
            />

            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              <option value="">Select Industry</option>

              {industries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              placeholder="Business Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <input
              placeholder="Website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />

            <input
              placeholder="Booking URL Slug"
              value={slug}
              onChange={(e) =>
                setSlug(generateSlug(e.target.value))
              }
            />

            <button
              onClick={createBusiness}
              disabled={loading}
              style={{
                background: '#0ea5e9',
                color: '#fff',
                border: 'none',
                padding: '16px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              {loading
                ? 'Creating business...'
                : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}