'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'

type PassPayload = {
  pass: { id: string; pass_token: string; created_at: string }
  loyalty: {
    id: string
    reward_label: string | null
    status: string | null
    visits_required: number | null
    visits_completed: number | null
    created_at: string | null
  }
  customer: { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null }
  business: { id: string; business_name: string | null; logo_url: string | null; primary_colour: string | null; secondary_colour: string | null }
  qrValue: string
}

function customerName(customer: PassPayload['customer']) {
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Customer'
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function loyaltyProgress(loyalty: PassPayload['loyalty']) {
  const required = Number(loyalty.visits_required || 0)
  const completed = Number(loyalty.visits_completed || 0)
  if (required <= 0) return 0
  return Math.min(100, Math.round((completed / required) * 100))
}

function visitsRemaining(loyalty: PassPayload['loyalty']) {
  return Math.max(0, Number(loyalty.visits_required || 0) - Number(loyalty.visits_completed || 0))
}

function rewardEarned(loyalty: PassPayload['loyalty']) {
  return loyalty.status === 'earned' || loyaltyProgress(loyalty) >= 100
}

export default function LoyaltyWalletPassPage() {
  const params = useParams()
  const token = String(params.loyaltyToken || '')
  const [payload, setPayload] = useState<PassPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadPass()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function loadPass() {
    setLoading(true)
    setMessage('')

    const response = await fetch(`/api/loyalty/wallet-pass?token=${encodeURIComponent(token)}`)
    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setMessage(result?.error || 'Could not load loyalty pass.')
      setLoading(false)
      return
    }

    setPayload(result as PassPayload)
    setLoading(false)
  }

  const cardStyle = useMemo(() => {
    const primary = payload?.business?.primary_colour || '#06b6d4'
    const secondary = payload?.business?.secondary_colour || '#0f172a'
    return { background: `linear-gradient(135deg, ${secondary}, ${primary})` }
  }, [payload])

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">Loading loyalty pass...</main>
  }

  if (!payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center">
          <h1 className="text-2xl font-black">Pass unavailable</h1>
          <p className="mt-3 text-slate-400">{message}</p>
        </div>
      </main>
    )
  }

  const progress = loyaltyProgress(payload.loyalty)
  const earned = rewardEarned(payload.loyalty)

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">Loyalty pass</p>
          <h1 className="mt-3 text-3xl font-black">{payload.business.business_name || 'Loyalty Card'}</h1>
          <p className="mt-2 text-slate-400">Show this pass at reception to collect visits and redeem rewards.</p>
        </div>

        <article className="overflow-hidden rounded-[36px] border border-white/10 p-6 shadow-2xl" style={cardStyle}>
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-white/70">
                {earned ? 'reward earned' : payload.loyalty.status || 'active'}
              </p>
              <h2 className="mt-3 text-3xl font-black">{payload.loyalty.reward_label || 'Loyalty reward'}</h2>
              <p className="mt-2 text-lg font-bold text-white/80">{customerName(payload.customer)}</p>
            </div>

            {payload.business.logo_url && (
              <img src={payload.business.logo_url} alt={payload.business.business_name || 'Logo'} className="h-16 w-16 rounded-2xl bg-white object-contain p-2" />
            )}
          </div>

          {earned && (
            <div className="mt-6 rounded-2xl border border-emerald-300/30 bg-emerald-300/20 p-4">
              <p className="font-black text-emerald-100">Reward available</p>
              <p className="mt-1 text-sm text-white/80">Ask staff to scan this pass and redeem your reward.</p>
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <PassStat label="Progress" value={`${payload.loyalty.visits_completed || 0} / ${payload.loyalty.visits_required || 0}`} />
            <PassStat label="Remaining" value={earned ? 'Reward ready' : `${visitsRemaining(payload.loyalty)} visits`} />
            <PassStat label="Started" value={formatDate(payload.loyalty.created_at)} />
            <PassStat label="Pass ID" value={payload.pass.pass_token.slice(0, 8).toUpperCase()} />
          </div>

          <div className="mt-8 h-4 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-8 rounded-[28px] bg-white p-5">
            <div className="mx-auto w-fit">
              <QRCode value={payload.qrValue} size={220} />
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}

function PassStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">{label}</p>
      <p className="mt-2 font-black">{value}</p>
    </div>
  )
}