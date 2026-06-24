'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'

type PassPayload = {
  pass: {
    id: string
    pass_token: string
    created_at: string
  }
  membership: {
    id: string
    membership_name: string
    status: string | null
    billing_interval: string | null
    monthly_amount: number | null
    included_sessions: number | null
    sessions_used: number | null
    current_period_start: string | null
    current_period_end: string | null
    created_at: string | null
  }
  customer: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
  }
  business: {
    id: string
    business_name: string | null
    logo_url: string | null
    primary_colour: string | null
    secondary_colour: string | null
  }
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

function sessionsRemaining(membership: PassPayload['membership']) {
  return Math.max(0, Number(membership.included_sessions || 0) - Number(membership.sessions_used || 0))
}

export default function MembershipWalletPassPage() {
  const params = useParams()
  const token = String(params.token || '')
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

    const response = await fetch(`/api/memberships/wallet-pass?token=${encodeURIComponent(token)}`)
    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setMessage(result?.error || 'Could not load membership pass.')
      setLoading(false)
      return
    }

    setPayload(result as PassPayload)
    setLoading(false)
  }

  const cardStyle = useMemo(() => {
    const primary = payload?.business?.primary_colour || '#06b6d4'
    const secondary = payload?.business?.secondary_colour || '#0f172a'

    return {
      background: `linear-gradient(135deg, ${secondary}, ${primary})`,
    }
  }, [payload])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        Loading membership pass...
      </main>
    )
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

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
            Membership pass
          </p>
          <h1 className="mt-3 text-3xl font-black">
            {payload.business.business_name || 'Membership'}
          </h1>
          <p className="mt-2 text-slate-400">
            Show this pass at reception to check in.
          </p>
        </div>

        <article
          className="overflow-hidden rounded-[36px] border border-white/10 p-6 shadow-2xl"
          style={cardStyle}
        >
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-white/70">
                {payload.membership.status || 'active'}
              </p>
              <h2 className="mt-3 text-3xl font-black">
                {payload.membership.membership_name}
              </h2>
              <p className="mt-2 text-lg font-bold text-white/80">
                {customerName(payload.customer)}
              </p>
            </div>

            {payload.business.logo_url && (
              <img
                src={payload.business.logo_url}
                alt={payload.business.business_name || 'Logo'}
                className="h-16 w-16 rounded-2xl bg-white object-contain p-2"
              />
            )}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <PassStat label="Sessions remaining" value={`${sessionsRemaining(payload.membership)} / ${payload.membership.included_sessions || 0}`} />
            <PassStat label="Renews" value={formatDate(payload.membership.current_period_end)} />
            <PassStat label="Member since" value={formatDate(payload.membership.created_at || payload.membership.current_period_start)} />
            <PassStat label="Pass ID" value={payload.pass.pass_token.slice(0, 8).toUpperCase()} />
          </div>

          <div className="mt-8 rounded-[28px] bg-white p-5">
            <div className="mx-auto w-fit">
              <QRCode value={payload.qrValue} size={220} />
            </div>
          </div>
        </article>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h3 className="font-black">Wallet V1</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            This is a live digital membership pass. Apple Wallet and Google Wallet buttons can be added once certificates and wallet issuer settings are configured.
          </p>
        </div>
      </section>
    </main>
  )
}

function PassStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">{label}</p>
      <p className="mt-2 font-black">{value}</p>
    </div>
  )
}
