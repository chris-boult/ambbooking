'use client'

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  name?: string | null
  business_name?: string | null
  primary_colour?: string | null
  secondary_colour?: string | null
}

type PackageType = {
  id: string
  business_id: string
  name: string
  description: string | null
  total_sessions: number
  price: number
  active: boolean
}

export default function PackagePurchasePage() {
  const params = useParams()
  const slug = params?.slug as string

  const [business, setBusiness] = useState<Business | null>(null)
  const [packages, setPackages] = useState<PackageType[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [message, setMessage] = useState('')

  const primaryColour = business?.primary_colour || '#7c3aed'
  const secondaryColour = business?.secondary_colour || '#2563eb'
  const businessName =
    business?.business_name || business?.name || 'this business'

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (businessError || !businessData) {
        setMessage('Business not found.')
        setLoading(false)
        return
      }

      setBusiness(businessData as Business)

      const { data: packageData, error: packageError } = await supabase
  .from('packages')
  .select('*')
  .eq('business_id', businessData.id)
  .eq('active', true)
  .order('price', { ascending: true })

      if (packageError) {
        setMessage(packageError.message)
        setLoading(false)
        return
      }

      setPackages((packageData as PackageType[]) || [])
      setLoading(false)
    }

    if (slug) {
      loadData()
    }
  }, [slug])

  async function startCheckout() {
    setMessage('')

    if (!business?.id || !selectedPackageId || !firstName || !email) {
      setMessage('Please choose a package and enter your name and email.')
      return
    }

    setCheckoutLoading(true)

    const response = await fetch('/api/create-package-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package_id: selectedPackageId,
        business_id: business.id,
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_email: email,
        success_url: `${window.location.origin}/booking-success?package=success`,
        cancel_url: `${window.location.origin}/book/${slug}/packages`,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setMessage(result.error || 'Could not start checkout.')
      setCheckoutLoading(false)
      return
    }

    if (result.url) {
      window.location.href = result.url
      return
    }

    setMessage('Checkout URL was not returned.')
    setCheckoutLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        Loading packages...
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">
            Packages
          </p>

          <h1 className="text-4xl md:text-5xl font-black mb-4">
            Buy a package from {businessName}
          </h1>

          <p className="text-slate-400 text-lg">
            Purchase prepaid sessions and use them when booking future appointments.
          </p>
        </div>

        {message && (
          <div className="mb-6 bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-300">
            {message}
          </div>
        )}

        {packages.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-slate-400">
            No packages are currently available to buy.
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid md:grid-cols-2 gap-4">
              {packages.map((packageItem) => {
                const selected = selectedPackageId === packageItem.id

                return (
                  <button
                    key={packageItem.id}
                    type="button"
                    onClick={() => setSelectedPackageId(packageItem.id)}
                    className={`text-left rounded-2xl border p-6 transition ${
                      selected
                        ? 'border-transparent text-white shadow-xl'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                    }`}
                    style={
                      selected
                        ? {
                            background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
                          }
                        : undefined
                    }
                  >
                    <h2 className="text-2xl font-black mb-2">
                      {packageItem.name}
                    </h2>

                    <p className={selected ? 'text-white/80' : 'text-slate-400'}>
                      {packageItem.description ||
                        `${packageItem.total_sessions} prepaid sessions`}
                    </p>

                    <div className="mt-6">
                      <p className="text-sm font-bold uppercase tracking-[0.16em] opacity-70">
                        Included
                      </p>
                      <p className="text-xl font-black">
                        {packageItem.total_sessions} sessions
                      </p>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-bold uppercase tracking-[0.16em] opacity-70">
                        Price
                      </p>
                      <p className="text-3xl font-black">
                        £{Number(packageItem.price).toFixed(2)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
              <h2 className="text-2xl font-bold mb-2">
                Your details
              </h2>

              <p className="text-slate-400 mb-6">
                We’ll attach the package to this email address after payment.
              </p>

              <div className="grid gap-4">
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First name *"
                  className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                />

                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last name"
                  className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                />

                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address *"
                  className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                />

                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={checkoutLoading}
                  className="mt-2 text-white font-black px-6 py-4 rounded-xl disabled:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
                  }}
                >
                  {checkoutLoading ? 'Opening checkout...' : 'Buy package'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}