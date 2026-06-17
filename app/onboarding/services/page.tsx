'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OnboardingServicesPage() {
  const router = useRouter()

  const [businessId, setBusinessId] = useState('')
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('30')
  const [price, setPrice] = useState('')
  const [paymentType, setPaymentType] = useState('none')
  const [depositAmount, setDepositAmount] = useState('')

  const [services, setServices] = useState<any[]>([])

  useEffect(() => {
    loadBusiness()
  }, [])

  async function loadBusiness() {
    const { data } = await supabase.auth.getUser()

    if (!data.user) return

    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', data.user.id)
      .single()

    if (!business) return

    setBusinessId(business.id)

    const { data: serviceData } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)

    setServices(serviceData || [])
  }

  async function addService() {
    if (!name || !price) {
      alert('Please complete service name and price')
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from('services')
      .insert({
        business_id: businessId,
        name,
        description,
        duration_minutes: Number(duration),
        price: Number(price),
        payment_type: paymentType,
        deposit_required: paymentType === 'deposit',
        deposit_amount:
          paymentType === 'deposit'
            ? Number(depositAmount)
            : 0,
      })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setName('')
    setDescription('')
    setDuration('30')
    setPrice('')
    setPaymentType('none')
    setDepositAmount('')

    loadBusiness()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">

        <div className="mb-12">
          <div className="text-sky-400 font-semibold mb-3">
            STEP 2 OF 5
          </div>

          <h1 className="text-5xl font-bold mb-4">
            Add your services
          </h1>

          <p className="text-slate-400 text-lg">
            Create the services customers can book online.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">

            <h2 className="text-2xl font-bold mb-6">
              New Service
            </h2>

            <div className="space-y-4">

              <input
                className="w-full p-4 rounded-xl bg-slate-800"
                placeholder="Service Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <textarea
                className="w-full p-4 rounded-xl bg-slate-800"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <select
                className="w-full p-4 rounded-xl bg-slate-800"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">60 Minutes</option>
                <option value="90">90 Minutes</option>
                <option value="120">120 Minutes</option>
              </select>

              <input
                className="w-full p-4 rounded-xl bg-slate-800"
                placeholder="Price (£)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />

              <div className="space-y-3">

                <label className="flex gap-3">
                  <input
                    type="radio"
                    checked={paymentType === 'none'}
                    onChange={() => setPaymentType('none')}
                  />
                  No payment required
                </label>

                <label className="flex gap-3">
                  <input
                    type="radio"
                    checked={paymentType === 'deposit'}
                    onChange={() => setPaymentType('deposit')}
                  />
                  Deposit required
                </label>

                <label className="flex gap-3">
                  <input
                    type="radio"
                    checked={paymentType === 'full'}
                    onChange={() => setPaymentType('full')}
                  />
                  Full payment required
                </label>

              </div>

              {paymentType === 'deposit' && (
                <input
                  className="w-full p-4 rounded-xl bg-slate-800"
                  placeholder="Deposit Amount (£)"
                  value={depositAmount}
                  onChange={(e) =>
                    setDepositAmount(e.target.value)
                  }
                />
              )}

              <button
                onClick={addService}
                disabled={loading}
                className="w-full h-14 rounded-xl bg-sky-500 font-semibold"
              >
                Add Service
              </button>

            </div>

          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">

            <h2 className="text-2xl font-bold mb-6">
              Your Services
            </h2>

            <div className="space-y-4">

              {services.map((service) => (
                <div
                  key={service.id}
                  className="border border-slate-800 rounded-2xl p-4"
                >
                  <div className="font-semibold">
                    {service.name}
                  </div>

                  <div className="text-slate-400 text-sm mt-1">
                    {service.duration_minutes} mins • £{service.price}
                  </div>

                  <div className="text-sky-400 text-sm mt-2">
                    {service.payment_type === 'none' &&
                      'No payment required'}

                    {service.payment_type === 'deposit' &&
                      `Deposit £${service.deposit_amount}`}

                    {service.payment_type === 'full' &&
                      'Full payment required'}
                  </div>
                </div>
              ))}

            </div>

            <button
              onClick={() => router.push('/onboarding/team')}
              className="w-full mt-8 h-14 rounded-xl bg-white text-slate-950 font-bold"
            >
              Continue →
            </button>

          </div>

        </div>

      </div>
    </main>
  )
}