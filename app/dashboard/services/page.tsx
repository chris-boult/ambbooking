'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PaymentType = 'pay_later' | 'deposit' | 'full_payment'

type Service = {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  payment_type: PaymentType | null
  deposit_amount: number | null
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [businessId, setBusinessId] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [price, setPrice] = useState('')
  const [paymentType, setPaymentType] = useState<PaymentType>('pay_later')
  const [depositAmount, setDepositAmount] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setMessage('')

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      setMessage('You need to be logged in.')
      return
    }

    const { data: businesses } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: true })

    const business = businesses?.[0]

    if (!business) {
      setMessage('No business found for this account.')
      return
    }

    setBusinessId(business.id)

    const { data: servicesData, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      return
    }

    setServices((servicesData || []) as Service[])
  }

  function resetForm() {
    setName('')
    setDescription('')
    setDuration('')
    setPrice('')
    setPaymentType('pay_later')
    setDepositAmount('')
    setEditingId(null)
  }

  function startEdit(service: Service) {
    setEditingId(service.id)
    setName(service.name || '')
    setDescription(service.description || '')
    setDuration(String(service.duration_minutes || ''))
    setPrice(String(service.price || ''))
    setPaymentType(service.payment_type || 'pay_later')
    setDepositAmount(String(service.deposit_amount || ''))
    setMessage('')
  }

  async function handleSaveService(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    if (!businessId) {
      setMessage('No business selected.')
      return
    }

    if (!name || !duration || !price) {
      setMessage('Please complete service name, duration and price.')
      return
    }

    const numericPrice = Number(price)
    const numericDuration = Number(duration)
    const numericDeposit = Number(depositAmount || 0)

    if (numericDuration <= 0 || numericPrice < 0) {
      setMessage('Please enter a valid duration and price.')
      return
    }

    if (paymentType === 'deposit') {
      if (numericDeposit <= 0) {
        setMessage('Please enter a deposit amount.')
        return
      }

      if (numericDeposit > numericPrice) {
        setMessage('Deposit cannot be greater than the service price.')
        return
      }
    }

    setLoading(true)

    const payload = {
      business_id: businessId,
      name,
      description,
      duration_minutes: numericDuration,
      price: numericPrice,
      payment_type: paymentType,
      deposit_amount: paymentType === 'deposit' ? numericDeposit : 0,
    }

    const { error } = editingId
      ? await supabase.from('services').update(payload).eq('id', editingId)
      : await supabase.from('services').insert(payload)

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(editingId ? 'Service updated successfully.' : 'Service created successfully.')
    resetForm()
    await loadData()
  }

  async function deleteService(serviceId: string) {
    setMessage('')

    const confirmed = window.confirm('Delete this service? This cannot be undone.')

    if (!confirmed) return

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Service deleted.')
    await loadData()
  }

  function paymentLabel(type: PaymentType | null) {
    if (type === 'deposit') return 'Deposit required'
    if (type === 'full_payment') return 'Full payment required'
    return 'Pay at appointment'
  }

  function paymentBadgeClass(type: PaymentType | null) {
    if (type === 'deposit') return 'bg-amber-500/10 text-amber-300'
    if (type === 'full_payment') return 'bg-emerald-500/10 text-emerald-300'
    return 'bg-blue-500/10 text-blue-300'
  }

  return (
    <main className="min-h-screen space-y-8 bg-slate-950 p-6 text-white md:p-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">
          Setup
        </p>

        <h1 className="mt-2 text-4xl font-black">Services</h1>

        <p className="mt-3 max-w-2xl text-slate-400">
          Create and manage bookable services, pricing, duration and payment rules.
        </p>
      </div>

      {message && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
          {message}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
          <h2 className="text-2xl font-black">
            {editingId ? 'Edit service' : 'Add service'}
          </h2>

          <p className="mt-2 text-slate-400">
            Set how customers book and pay for this service.
          </p>

          <form onSubmit={handleSaveService} className="mt-6 space-y-4">
            <input
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
              placeholder="Service name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <textarea
              className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="number"
                min="1"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                placeholder="Duration in minutes"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />

              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                placeholder="Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                Payment rule
              </p>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('pay_later')
                    setDepositAmount('')
                  }}
                  className={`rounded-2xl border p-4 text-left font-bold ${
                    paymentType === 'pay_later'
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                      : 'border-white/10 text-slate-300'
                  }`}
                >
                  Pay at appointment
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('deposit')}
                  className={`rounded-2xl border p-4 text-left font-bold ${
                    paymentType === 'deposit'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      : 'border-white/10 text-slate-300'
                  }`}
                >
                  Deposit required
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('full_payment')
                    setDepositAmount('')
                  }}
                  className={`rounded-2xl border p-4 text-left font-bold ${
                    paymentType === 'full_payment'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-white/10 text-slate-300'
                  }`}
                >
                  Full payment required
                </button>
              </div>

              {paymentType === 'deposit' && (
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-bold text-slate-400">
                    Deposit amount
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                    placeholder="Deposit amount"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                disabled={loading}
                className="rounded-2xl bg-white px-5 py-4 font-black text-slate-950 disabled:opacity-50"
              >
                {loading
                  ? 'Saving...'
                  : editingId
                    ? 'Update service'
                    : 'Create service'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-white/10 px-5 py-4 font-black text-white hover:bg-white/10"
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Your services</h2>
              <p className="mt-2 text-slate-400">
                Manage what customers can book.
              </p>
            </div>

            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-300">
              {services.length} service{services.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-xl font-black">{service.name}</h3>

                    {service.description && (
                      <p className="mt-2 max-w-xl text-slate-400">
                        {service.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                      <span className="rounded-full bg-white/10 px-3 py-1 font-bold text-slate-300">
                        {service.duration_minutes} mins
                      </span>

                      <span className="rounded-full bg-white/10 px-3 py-1 font-bold text-slate-300">
                        £{Number(service.price || 0).toFixed(2)}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 font-bold ${paymentBadgeClass(
                          service.payment_type
                        )}`}
                      >
                        {paymentLabel(service.payment_type)}
                      </span>

                      {service.payment_type === 'deposit' && (
                        <span className="rounded-full bg-amber-500/10 px-3 py-1 font-bold text-amber-300">
                          Deposit £{Number(service.deposit_amount || 0).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(service)}
                      className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteService(service.id)}
                      className="rounded-xl bg-red-500/15 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/25"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {services.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-slate-500">
                No services created yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}