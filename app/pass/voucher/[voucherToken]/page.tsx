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
  voucher: {
    id: string
    business_id: string
    code: string | null
    amount: number | null
    remaining_amount: number | null
    recipient_name: string | null
    recipient_email: string | null
    purchaser_name: string | null
    purchaser_email: string | null
    expiry_date: string | null
    status: string | null
    redeemed_at: string | null
    created_at: string | null
  }
  customer: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
  } | null
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
  if (!customer) return 'Voucher holder'
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Voucher holder'
}

function money(value: number | string | null | undefined) {
  return `£${Number(value || 0).toFixed(2)}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function voucherCode(voucher: PassPayload['voucher']) {
  return voucher.code || voucher.id.slice(0, 8).toUpperCase()
}

function voucherBalance(voucher: PassPayload['voucher']) {
  return Number(voucher.remaining_amount ?? voucher.amount ?? 0)
}

function isRedeemed(voucher: PassPayload['voucher']) {
  return voucher.status === 'redeemed' || voucherBalance(voucher) <= 0
}

function isExpired(voucher: PassPayload['voucher']) {
  if (!voucher.expiry_date) return false
  const expiry = new Date(`${voucher.expiry_date}T23:59:59`)
  return expiry.getTime() < Date.now()
}

export default function VoucherWalletPassPage() {
  const params = useParams()
  const token = String(params.voucherToken || '')
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

    const response = await fetch(`/api/vouchers/wallet-pass?token=${encodeURIComponent(token)}`)
    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setMessage(result?.error || 'Could not load voucher pass.')
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
        Loading voucher pass...
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

  const redeemed = isRedeemed(payload.voucher)
  const expired = isExpired(payload.voucher)

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
            Voucher pass
          </p>
          <h1 className="mt-3 text-3xl font-black">
            {payload.business.business_name || 'Gift Voucher'}
          </h1>
          <p className="mt-2 text-slate-400">
            Show this pass at reception to redeem your voucher balance.
          </p>
        </div>

        <article
          className="overflow-hidden rounded-[36px] border border-white/10 p-6 shadow-2xl"
          style={cardStyle}
        >
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-white/70">
                {redeemed ? 'redeemed' : expired ? 'expired' : payload.voucher.status || 'active'}
              </p>
              <h2 className="mt-3 font-mono text-3xl font-black">
                {voucherCode(payload.voucher)}
              </h2>
              <p className="mt-2 text-lg font-bold text-white/80">
                {payload.voucher.recipient_name || customerName(payload.customer)}
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

          {(redeemed || expired) && (
            <div className="mt-6 rounded-2xl border border-red-300/30 bg-red-300/20 p-4">
              <p className="font-black text-red-100">
                {redeemed ? 'Voucher redeemed' : 'Voucher expired'}
              </p>
              <p className="mt-1 text-sm text-white/80">
                This voucher can no longer be used.
              </p>
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <PassStat label="Balance" value={money(voucherBalance(payload.voucher))} />
            <PassStat label="Original value" value={money(payload.voucher.amount)} />
            <PassStat label="Expires" value={formatDate(payload.voucher.expiry_date)} />
            <PassStat label="Pass ID" value={payload.pass.pass_token.slice(0, 8).toUpperCase()} />
          </div>

          <div className="mt-8 rounded-[28px] bg-white p-5">
            <div className="mx-auto w-fit">
              <QRCode value={payload.qrValue} size={220} />
            </div>
          </div>
        </article>

        {payload.voucher.purchaser_name && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Purchased by</p>
            <p className="mt-2 font-black">{payload.voucher.purchaser_name}</p>
          </div>
        )}
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
