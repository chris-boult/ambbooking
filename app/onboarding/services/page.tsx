'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Briefcase,
  Clock,
  CreditCard,
  Layers3,
  Loader2,
  Plus,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string
  created_at: string
}

type Service = {
  id: string
  name: string
  description?: string | null
  duration_minutes: number
  price: number
  payment_type: string
  deposit_amount: number
}

const STORAGE_KEY = 'amb_onboarding_business_id'

function OnboardingServicesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessId, setBusinessId] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingBusiness, setLoadingBusiness] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('30')
  const [price, setPrice] = useState('')
  const [paymentType, setPaymentType] = useState('none')
  const [depositAmount, setDepositAmount] = useState('')

  const selectedBusiness = businesses.find((business) => business.id === businessId)
  const canContinue = Boolean(businessId) && services.length > 0

  const servicePreview = useMemo(() => {
    return {
      name: name.trim() || 'Example service',
      duration: Number(duration || 30),
      price: price ? Number(price) : 0,
      payment:
        paymentType === 'deposit'
          ? `Deposit £${depositAmount || '0'}`
          : paymentType === 'full'
            ? 'Full payment required'
            : 'No payment required',
    }
  }, [name, duration, price, paymentType, depositAmount])

  useEffect(() => {
    loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadBusinesses() {
    setLoadingBusiness(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push('/login')
      return
    }

    const { data, error: businessError } = await supabase
      .from('businesses')
      .select('id,business_name,created_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })

    if (businessError) {
      setError(businessError.message)
      setLoadingBusiness(false)
      return
    }

    if (!data || data.length === 0) {
      router.push('/business/create')
      return
    }

    setBusinesses(data as Business[])

    const queryBusinessId = searchParams.get('businessId')
    const storedBusinessId =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY)
        : null

    const chosenBusiness =
      data.find((business) => business.id === queryBusinessId) ||
      data.find((business) => business.id === storedBusinessId)

    if (!chosenBusiness) {
      setBusinessId('')
      setServices([])
      setLoadingBusiness(false)
      setError('Please select the business you want to set up.')
      return
    }

    await selectBusiness(chosenBusiness.id, false)
    setLoadingBusiness(false)
  }

  async function selectBusiness(nextBusinessId: string, shouldReplaceUrl = true) {
    setError('')
    setBusinessId(nextBusinessId)
    setServices([])

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextBusinessId)
    }

    if (shouldReplaceUrl) {
      router.replace(`/onboarding/services?businessId=${nextBusinessId}`)
    }

    const { data, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', nextBusinessId)
      .order('created_at', { ascending: false })

    if (servicesError) {
      setError(servicesError.message)
      return
    }

    setServices((data || []) as Service[])
  }

  async function addService() {
    setError('')

    if (!businessId) {
      setError('Please select the business you want to set up first.')
      return
    }

    if (!name.trim()) {
      setError('Please enter a service name.')
      return
    }

    if (!price || Number(price) < 0) {
      setError('Please enter a valid price.')
      return
    }

    if (paymentType === 'deposit' && (!depositAmount || Number(depositAmount) <= 0)) {
      setError('Please enter a valid deposit amount.')
      return
    }

    if (paymentType === 'deposit' && Number(depositAmount) > Number(price)) {
      setError('The deposit cannot be more than the service price.')
      return
    }

    setLoading(true)

    const { error: insertError } = await supabase.from('services').insert({
      business_id: businessId,
      name: name.trim(),
      description: description.trim(),
      duration_minutes: Number(duration),
      price: Number(price),
      payment_type: paymentType,
      deposit_required: paymentType === 'deposit',
      deposit_amount: paymentType === 'deposit' ? Number(depositAmount) : 0,
    })

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setName('')
    setDescription('')
    setDuration('30')
    setPrice('')
    setPaymentType('none')
    setDepositAmount('')

    await selectBusiness(businessId, false)
  }

  async function deleteService(serviceId: string) {
    if (!businessId) return

    const confirmed = window.confirm('Delete this service?')
    if (!confirmed) return

    const { error: deleteError } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)
      .eq('business_id', businessId)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    await selectBusiness(businessId, false)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] px-6 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.22),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,.16),transparent_30%),radial-gradient(circle_at_20%_70%,rgba(124,58,237,.15),transparent_28%)]" />

      <header className="mx-auto flex h-32 max-w-[1500px] items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="AMB Booking"
            width={340}
            height={104}
            priority
            className="h-20 w-auto object-contain"
          />
        </Link>

        <Link
          href="/business/dashboard"
          className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[0.08] md:inline-flex"
        >
          Skip to dashboard
        </Link>
      </header>

      <section className="mx-auto max-w-[1500px] pb-20">
        <div className="mb-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="mb-6 text-xs font-black uppercase tracking-[0.38em] text-cyan-300">
              Step 2 of 5
            </p>

            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.055em] md:text-7xl">
              Add the services customers can book.
            </h1>
          </motion.div>

          <div className="max-w-2xl space-y-5 text-lg leading-8 text-slate-300">
            <p>
              Services are the foundation of your booking page. Add the treatments, appointments,
              sessions or jobs your customers can choose online.
            </p>

            <p>
              Each service can have its own duration, price and payment rule, including no payment,
              deposit or full payment at the time of booking.
            </p>
          </div>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-5">
          {['Business', 'Services', 'Team', 'Availability', 'Launch'].map((item, index) => (
            <div
              key={item}
              className={`rounded-2xl border px-5 py-4 ${
                index === 1
                  ? 'border-cyan-300 bg-cyan-400 text-slate-950'
                  : index < 1
                    ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/10 bg-white/[0.035] text-slate-400'
              }`}
            >
              <div className="text-xs font-black uppercase tracking-[0.22em]">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="mt-2 font-black">{item}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        <div className="mb-8 rounded-[2rem] border border-white/10 bg-[#07111f] p-6">
          <div className="mb-4 flex items-center gap-3">
            <Briefcase size={20} className="text-cyan-300" />
            <label className="block text-sm font-black text-cyan-300">
              Choose the business you are setting up
            </label>
          </div>

          <select
            value={businessId}
            onChange={(e) => selectBusiness(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
          >
            <option value="" disabled>
              Select a business
            </option>

            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.business_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative">
            <div className="absolute -inset-8 rounded-[4rem] bg-cyan-400/10 blur-[120px]" />

            <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.7)]">
              <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-cyan-300">
                    {selectedBusiness?.business_name || 'Select a business first'}
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                    Create a bookable service
                  </h2>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.35)]">
                  <Layers3 size={24} />
                </div>
              </div>

              <div className="space-y-5">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
                  placeholder="Service name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!businessId}
                />

                <textarea
                  className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
                  placeholder="Service description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!businessId}
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    disabled={!businessId}
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                    <option value="120">120 minutes</option>
                  </select>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
                    placeholder="Price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={!businessId}
                  />
                </div>

                <div className="grid gap-3">
                  {[
                    ['none', 'No payment required', 'Customer books now and pays later.'],
                    ['deposit', 'Deposit required', 'Customer pays part of the service price when booking.'],
                    ['full', 'Full payment required', 'Customer pays the full service price before attending.'],
                  ].map(([value, title, text]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentType(value)}
                      disabled={!businessId}
                      className={`rounded-2xl border p-5 text-left transition ${
                        paymentType === value
                          ? 'border-cyan-300 bg-cyan-400 text-slate-950'
                          : 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <div className="font-black">{title}</div>
                      <div className={`mt-1 text-sm ${paymentType === value ? 'text-slate-700' : 'text-slate-400'}`}>
                        {text}
                      </div>
                    </button>
                  ))}
                </div>

                {paymentType === 'deposit' && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
                    placeholder="Deposit amount"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    disabled={!businessId}
                  />
                )}

                <button
                  onClick={addService}
                  disabled={loading || loadingBusiness || !businessId}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 py-5 text-sm font-black text-slate-950 shadow-[0_0_80px_rgba(34,211,238,.35)] transition hover:-translate-y-1 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Adding service
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Add service
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.55)]">
              <p className="text-sm font-bold text-cyan-300">Booking preview</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                How customers will see it
              </h2>

              <div className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950 p-6">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <h3 className="text-2xl font-black">{servicePreview.name}</h3>
                    <p className="mt-3 max-w-xl leading-7 text-slate-400">
                      {description || 'Your service description will appear here for customers.'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950">
                    £{servicePreview.price}
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <Clock size={18} className="mb-3 text-cyan-300" />
                    <div className="font-black">{servicePreview.duration} mins</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:col-span-2">
                    <CreditCard size={18} className="mb-3 text-cyan-300" />
                    <div className="font-black">{servicePreview.payment}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.55)]">
              <p className="text-sm font-bold text-cyan-300">Your services</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                {services.length} added
              </h2>

              <div className="mt-8 space-y-4">
                {services.map((service) => (
                  <div key={service.id} className="rounded-2xl border border-white/10 bg-slate-950 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-black text-white">{service.name}</div>
                        <div className="mt-1 text-sm text-slate-400">
                          {service.duration_minutes} mins · £{service.price}
                        </div>
                        <div className="mt-2 text-sm font-bold text-cyan-300">
                          {service.payment_type === 'none' && 'No payment required'}
                          {service.payment_type === 'deposit' && `Deposit £${service.deposit_amount}`}
                          {service.payment_type === 'full' && 'Full payment required'}
                        </div>
                      </div>

                      <button
                        onClick={() => deleteService(service.id)}
                        className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-slate-400 transition hover:bg-red-400/10 hover:text-red-300"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

                {services.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-500">
                    No services added for this business yet.
                  </div>
                )}
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => router.push(`/onboarding/team?businessId=${businessId}`)}
                  disabled={!canContinue}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 py-5 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue to team
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={() => router.push('/business/dashboard')}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-7 py-5 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/[0.09]"
                >
                  Go to dashboard
                  <Settings size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function OnboardingServicesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
          Loading services...
        </main>
      }
    >
      <OnboardingServicesContent />
    </Suspense>
  )
}
