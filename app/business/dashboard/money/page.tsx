'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
  email: string | null
  stripe_connect_account_id: string | null
  stripe_connect_onboarding_complete: boolean | null
  stripe_connect_charges_enabled: boolean | null
  stripe_connect_payouts_enabled: boolean | null
  stripe_connect_details_submitted: boolean | null
  stripe_connect_status: string | null
  stripe_connect_last_checked_at: string | null
  platform_fee_percent: number | null
  platform_fee_fixed: number | null
}

type BookingPayment = {
  id: string
  booking_date: string | null
  booking_time: string | null
  payment_status: string | null
  amount_paid: number | null
  amount_due: number | null
  total_price: number | null
  created_at: string | null
  customers?: { first_name: string; last_name: string | null; email: string | null } | { first_name: string; last_name: string | null; email: string | null }[] | null
  services?: { name: string } | { name: string }[] | null
}

function joinOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] || null
  return value
}

function money(value: number | string | null | undefined) {
  return `£${Number(value || 0).toFixed(2)}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function customerName(booking: BookingPayment) {
  const customer = joinOne(booking.customers as any)
  if (!customer) return 'Unknown customer'
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Unknown customer'
}

function serviceName(booking: BookingPayment) {
  const service = joinOne(booking.services as any)
  return service?.name || 'Service'
}

function cleanStatus(value?: string | null) {
  return String(value || 'unknown').replaceAll('_', ' ')
}

export default function MoneyPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [payments, setPayments] = useState<BookingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [openingDashboard, setOpeningDashboard] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function getBusinessForUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('You need to be logged in.')

    const { data: ownedBusiness } = await supabase.from('businesses').select('*').eq('user_id', user.id).maybeSingle()
    if (ownedBusiness) return ownedBusiness as Business

    const { data: firstBusiness } = await supabase.from('businesses').select('*').limit(1).maybeSingle()
    if (!firstBusiness) throw new Error('No business found.')
    return firstBusiness as Business
  }

  async function load() {
    setLoading(true)
    setMessage('')

    try {
      const foundBusiness = await getBusinessForUser()
      setBusiness(foundBusiness)

      const { data, error } = await supabase
        .from('bookings')
        .select('id,booking_date,booking_time,payment_status,amount_paid,amount_due,total_price,created_at,customers(first_name,last_name,email),services(name)')
        .eq('business_id', foundBusiness.id)
        .order('created_at', { ascending: false })
        .limit(25)

      if (error) setMessage(error.message)
      else setPayments((data as unknown as BookingPayment[]) || [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load money portal.')
    }

    setLoading(false)
  }

  async function connectStripe() {
    if (!business) return
    setConnecting(true)
    setMessage('')

    const response = await fetch('/api/stripe-connect/create-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.url) {
      setMessage(result?.error || 'Could not start Stripe onboarding.')
      setConnecting(false)
      return
    }

    window.location.href = result.url
  }

  async function refreshStatus() {
    if (!business) return
    setChecking(true)
    setMessage('')

    const response = await fetch('/api/stripe-connect/refresh-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setMessage(result?.error || 'Could not refresh Stripe status.')
      setChecking(false)
      return
    }

    setBusiness((current) => current ? {
      ...current,
      stripe_connect_charges_enabled: result.chargesEnabled,
      stripe_connect_payouts_enabled: result.payoutsEnabled,
      stripe_connect_details_submitted: result.detailsSubmitted,
      stripe_connect_onboarding_complete: result.complete,
      stripe_connect_status: result.status,
      stripe_connect_last_checked_at: new Date().toISOString(),
    } : current)

    setChecking(false)
    setMessage('Stripe Connect status refreshed.')
  }

  async function openStripeDashboard() {
    if (!business) return
    setOpeningDashboard(true)
    setMessage('')

    const response = await fetch('/api/stripe-connect/dashboard-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.url) {
      setMessage(result?.error || 'Could not open Stripe dashboard.')
      setOpeningDashboard(false)
      return
    }

    window.location.href = result.url
  }

  const stats = useMemo(() => {
    const paid = payments.filter((payment) => ['paid', 'succeeded', 'complete', 'membership'].includes(String(payment.payment_status || '').toLowerCase()))
    const totalTaken = paid.reduce((sum, payment) => sum + Number(payment.amount_paid || payment.total_price || 0), 0)
    const outstanding = payments.reduce((sum, payment) => sum + Number(payment.amount_due || 0), 0)
    const feePercent = Number(business?.platform_fee_percent || 0)
    const estimatedPlatformFees = totalTaken * (feePercent / 100)

    return { paidCount: paid.length, totalTaken, outstanding, estimatedPlatformFees }
  }, [payments, business])

  const connected = Boolean(business?.stripe_connect_account_id)
  const enabled = Boolean(business?.stripe_connect_charges_enabled && business?.stripe_connect_payouts_enabled && business?.stripe_connect_onboarding_complete)

  if (loading) {
    return <main className="min-h-screen bg-[#020617] p-8 text-white"><p className="text-slate-400">Loading money portal...</p></main>
  }

  return (
    <main className="min-h-screen bg-[#020617] p-6 text-white md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-300">Money portal</p>
            <h1 className="mt-2 text-4xl font-black">Payments & Stripe</h1>
            <p className="mt-3 max-w-3xl text-slate-400">
              Connect the business bank account, monitor payment activity and manage Stripe payouts.
            </p>
          </div>

          <button type="button" onClick={load} className="rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950 hover:bg-cyan-300">Refresh</button>
        </section>

        {message && <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">{message}</div>}

        <section className="grid gap-4 md:grid-cols-4">
          <Kpi title="Payments taken" value={money(stats.totalTaken)} />
          <Kpi title="Paid bookings" value={String(stats.paidCount)} />
          <Kpi title="Outstanding" value={money(stats.outstanding)} />
          <Kpi title="Est. platform fees" value={money(stats.estimatedPlatformFees)} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Stripe Connect">
            <div className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Account status</p>
                    <h2 className="mt-2 text-2xl font-black">{enabled ? 'Connected and ready' : connected ? 'Onboarding in progress' : 'Not connected'}</h2>
                    <p className="mt-2 text-slate-400">
                      {enabled ? 'This business can accept payments and receive payouts.' : connected ? 'Finish Stripe onboarding or refresh status after completion.' : 'Connect Stripe so customer payments go to this business.'}
                    </p>
                  </div>

                  <StatusPill value={business?.stripe_connect_status || 'not_connected'} good={enabled} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <MiniStatus title="Account created" active={connected} />
                <MiniStatus title="Charges enabled" active={Boolean(business?.stripe_connect_charges_enabled)} />
                <MiniStatus title="Payouts enabled" active={Boolean(business?.stripe_connect_payouts_enabled)} />
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm text-slate-400">Stripe account ID</p>
                <p className="mt-2 break-all font-mono text-sm text-cyan-200">{business?.stripe_connect_account_id || 'Not created yet'}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">Last checked</p>
                <p className="mt-1 text-sm text-slate-300">{business?.stripe_connect_last_checked_at ? formatDate(business.stripe_connect_last_checked_at) : 'Never'}</p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <button type="button" onClick={connectStripe} disabled={connecting} className="rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
                  {connecting ? 'Opening Stripe...' : connected ? 'Continue onboarding' : 'Connect Stripe account'}
                </button>

                <button type="button" onClick={refreshStatus} disabled={checking || !connected} className="rounded-2xl border border-white/10 px-5 py-4 font-black text-slate-200 hover:bg-white/10 disabled:opacity-50">
                  {checking ? 'Checking...' : 'Refresh status'}
                </button>

                <button type="button" onClick={openStripeDashboard} disabled={openingDashboard || !connected} className="rounded-2xl border border-white/10 px-5 py-4 font-black text-slate-200 hover:bg-white/10 disabled:opacity-50">
                  {openingDashboard ? 'Opening...' : 'Open Stripe dashboard'}
                </button>
              </div>
            </div>
          </Panel>

          <Panel title="Revenue settings">
            <div className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <p className="text-lg font-black">Platform fee</p>
                <p className="mt-2 text-slate-400">This controls the estimated AMB fee shown in this portal. Checkout wiring will use this value when Connect payments are enabled.</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div><p className="text-sm font-bold text-slate-400">Percentage fee</p><p className="mt-2 text-3xl font-black">{Number(business?.platform_fee_percent || 0)}%</p></div>
                  <div><p className="text-sm font-bold text-slate-400">Fixed fee</p><p className="mt-2 text-3xl font-black">{money(business?.platform_fee_fixed)}</p></div>
                </div>
              </div>

              <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-100">
                <p className="font-black">Next payment engine step</p>
                <p className="mt-2 text-sm leading-6">Once Connect is confirmed, booking checkout should use destination charges so payments go to the business and AMB takes the platform fee automatically.</p>
              </div>
            </div>
          </Panel>
        </section>

        <Panel title="Recent payment activity">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="border-b border-white/10 px-4 py-3">Date</th>
                  <th className="border-b border-white/10 px-4 py-3">Customer</th>
                  <th className="border-b border-white/10 px-4 py-3">Service</th>
                  <th className="border-b border-white/10 px-4 py-3">Status</th>
                  <th className="border-b border-white/10 px-4 py-3 text-right">Paid</th>
                  <th className="border-b border-white/10 px-4 py-3 text-right">Due</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-white/5">
                    <td className="px-4 py-4 text-slate-300">{formatDate(payment.booking_date || payment.created_at)}</td>
                    <td className="px-4 py-4 font-bold">{customerName(payment)}</td>
                    <td className="px-4 py-4 text-slate-300">{serviceName(payment)}</td>
                    <td className="px-4 py-4"><StatusPill value={cleanStatus(payment.payment_status)} good={payment.payment_status === 'paid'} /></td>
                    <td className="px-4 py-4 text-right font-bold">{money(payment.amount_paid || payment.total_price)}</td>
                    <td className="px-4 py-4 text-right text-slate-300">{money(payment.amount_due)}</td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No payment activity yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </main>
  )
}

function Kpi({ title, value }: { title: string; value: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{title}</p><p className="mt-3 text-3xl font-black">{value}</p></div>
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><h2 className="mb-5 text-2xl font-black">{title}</h2>{children}</section>
}

function MiniStatus({ title, active }: { title: string; active: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className={`mb-3 h-3 w-3 rounded-full ${active ? 'bg-emerald-400' : 'bg-slate-600'}`} /><p className="font-black">{title}</p><p className="mt-1 text-sm text-slate-500">{active ? 'Complete' : 'Pending'}</p></div>
}

function StatusPill({ value, good }: { value: string; good?: boolean }) {
  const isGood = good || value === 'paid' || value === 'enabled'
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${isGood ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>{value}</span>
}
