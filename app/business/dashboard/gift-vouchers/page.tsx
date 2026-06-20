'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type GiftVoucher = {
  id: string
  business_id: string
  code: string
  amount: number
  remaining_amount: number
  recipient_name: string | null
  recipient_email: string | null
  purchaser_name: string | null
  purchaser_email: string | null
  expiry_date: string | null
  status: string | null
  created_at?: string | null
}

export default function GiftVouchersDashboardPage() {
  const [businessId, setBusinessId] = useState('')
  const [vouchers, setVouchers] = useState<GiftVoucher[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [manualAmount, setManualAmount] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [purchaserName, setPurchaserName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('You need to be logged in.')
      setLoading(false)
      return
    }

    let business = null

    const { data: ownedBusiness } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (ownedBusiness) {
      business = ownedBusiness
    } else {
      const { data: firstBusiness } = await supabase
        .from('businesses')
        .select('id')
        .limit(1)
        .maybeSingle()

      business = firstBusiness
    }

    if (!business) {
      setError('No business found.')
      setLoading(false)
      return
    }

    setBusinessId(business.id)

    const { data, error: vouchersError } = await supabase
      .from('gift_vouchers')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    if (vouchersError) setError(vouchersError.message)
    else setVouchers(data || [])

    setLoading(false)
  }

  function generateCode() {
    return `GV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  }

  async function createManualVoucher(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const amount = Number(manualAmount)

    if (!businessId) {
      setError('No business selected.')
      return
    }

    if (!amount || amount < 1) {
      setError('Enter a valid voucher amount.')
      return
    }

    if (!recipientName || !recipientEmail) {
      setError('Recipient name and email are required.')
      return
    }

    setSaving(true)

    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)

    const { error } = await supabase.from('gift_vouchers').insert({
      business_id: businessId,
      code: generateCode(),
      amount,
      remaining_amount: amount,
      recipient_name: recipientName,
      recipient_email: recipientEmail.trim().toLowerCase(),
      purchaser_name: purchaserName || 'Manual voucher',
      purchaser_email: null,
      expiry_date: expiryDate.toISOString().split('T')[0],
      status: 'active',
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Gift voucher created.')
      setManualAmount('')
      setRecipientName('')
      setRecipientEmail('')
      setPurchaserName('')
      await loadData()
    }

    setSaving(false)
  }

  async function markRedeemed(voucher: GiftVoucher) {
    const { error } = await supabase
      .from('gift_vouchers')
      .update({
        remaining_amount: 0,
        status: 'redeemed',
      })
      .eq('id', voucher.id)

    if (error) setError(error.message)
    else await loadData()
  }

  async function cancelVoucher(voucher: GiftVoucher) {
    const { error } = await supabase
      .from('gift_vouchers')
      .update({ status: 'cancelled' })
      .eq('id', voucher.id)

    if (error) setError(error.message)
    else await loadData()
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setSuccess(`Copied ${code}`)
  }

  function exportCsv() {
    const headers = [
      'Code',
      'Recipient Name',
      'Recipient Email',
      'Purchaser Name',
      'Purchaser Email',
      'Original Amount',
      'Remaining Amount',
      'Expiry Date',
      'Status',
      'Created At',
    ]

    const rows = filteredVouchers.map((voucher) => [
      voucher.code,
      voucher.recipient_name || '',
      voucher.recipient_email || '',
      voucher.purchaser_name || '',
      voucher.purchaser_email || '',
      Number(voucher.amount || 0).toFixed(2),
      Number(voucher.remaining_amount || 0).toFixed(2),
      voucher.expiry_date || '',
      voucher.status || 'active',
      voucher.created_at || '',
    ])

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(',')
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `gift-vouchers-${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    URL.revokeObjectURL(url)
  }

  const filteredVouchers = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return vouchers

    return vouchers.filter((voucher) => {
      return (
        voucher.code?.toLowerCase().includes(q) ||
        voucher.recipient_name?.toLowerCase().includes(q) ||
        voucher.recipient_email?.toLowerCase().includes(q) ||
        voucher.purchaser_name?.toLowerCase().includes(q) ||
        voucher.purchaser_email?.toLowerCase().includes(q) ||
        voucher.status?.toLowerCase().includes(q)
      )
    })
  }, [search, vouchers])

  const today = new Date().toISOString().split('T')[0]
  const monthKey = new Date().toISOString().slice(0, 7)

  const totalSold = vouchers.reduce((sum, v) => sum + Number(v.amount || 0), 0)
  const totalRemaining = vouchers.reduce(
    (sum, v) => sum + Number(v.remaining_amount || 0),
    0
  )

  const soldToday = vouchers
    .filter((v) => v.created_at?.startsWith(today))
    .reduce((sum, v) => sum + Number(v.amount || 0), 0)

  const soldThisMonth = vouchers
    .filter((v) => v.created_at?.startsWith(monthKey))
    .reduce((sum, v) => sum + Number(v.amount || 0), 0)

  const activeCount = vouchers.filter((v) => v.status === 'active').length
  const redeemedCount = vouchers.filter((v) => v.status === 'redeemed').length
  const cancelledCount = vouchers.filter((v) => v.status === 'cancelled').length
  const expiredCount = vouchers.filter((v) => v.status === 'expired').length

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <p className="text-slate-400">Loading gift vouchers...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen space-y-8 bg-slate-950 p-6 text-white md:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">
            Revenue tools
          </p>
          <h1 className="mt-2 text-4xl font-black">Gift vouchers</h1>
          <p className="mt-3 max-w-2xl text-slate-400">
            Manage voucher sales, outstanding balances, redemptions, expiry dates
            and manual voucher creation.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCsv}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 font-black text-white hover:bg-white/10"
        >
          Export CSV
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
          {success}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Sold today" value={`£${soldToday.toFixed(2)}`} />
        <StatCard label="Sold this month" value={`£${soldThisMonth.toFixed(2)}`} />
        <StatCard label="Total sold" value={`£${totalSold.toFixed(2)}`} />
        <StatCard label="Outstanding liability" value={`£${totalRemaining.toFixed(2)}`} />
        <StatCard label="Active vouchers" value={activeCount} />
        <StatCard label="Redeemed" value={redeemedCount} />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatusCard label="Active" count={activeCount} tone="emerald" />
        <StatusCard label="Redeemed" count={redeemedCount} tone="blue" />
        <StatusCard label="Expired" count={expiredCount} tone="amber" />
        <StatusCard label="Cancelled" count={cancelledCount} tone="red" />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
        <h2 className="text-2xl font-black">Create manual voucher</h2>
        <p className="mt-2 text-slate-400">
          Issue goodwill vouchers, competition prizes, offline purchases or refund credits.
        </p>

        <form
          onSubmit={createManualVoucher}
          className="mt-6 grid gap-4 md:grid-cols-4"
        >
          <input
            type="number"
            min="1"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            placeholder="Amount"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
          />

          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Recipient name"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
          />

          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="Recipient email"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
          />

          <input
            value={purchaserName}
            onChange={(e) => setPurchaserName(e.target.value)}
            placeholder="Purchaser name"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
          />

          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-white px-5 py-4 font-black text-slate-950 disabled:opacity-50 md:col-span-4"
          >
            {saving ? 'Creating...' : 'Create voucher'}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">All vouchers</h2>
            <p className="mt-2 text-slate-400">
              Search by code, recipient, purchaser, email or status.
            </p>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vouchers..."
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
          />
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="border-b border-white/10 text-sm text-slate-500">
                <th className="py-4">Code</th>
                <th className="py-4">Recipient</th>
                <th className="py-4">Purchaser</th>
                <th className="py-4">Amount</th>
                <th className="py-4">Remaining</th>
                <th className="py-4">Expiry</th>
                <th className="py-4">Status</th>
                <th className="py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredVouchers.map((voucher) => (
                <tr key={voucher.id} className="border-b border-white/10">
                  <td className="py-5 font-black text-white">{voucher.code}</td>

                  <td className="py-5">
                    <p className="font-bold text-white">
                      {voucher.recipient_name || 'No name'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {voucher.recipient_email || 'No email'}
                    </p>
                  </td>

                  <td className="py-5">
                    <p className="font-bold text-slate-300">
                      {voucher.purchaser_name || 'Unknown'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {voucher.purchaser_email || 'No email'}
                    </p>
                  </td>

                  <td className="py-5 text-slate-300">
                    £{Number(voucher.amount || 0).toFixed(2)}
                  </td>

                  <td className="py-5 text-slate-300">
                    £{Number(voucher.remaining_amount || 0).toFixed(2)}
                  </td>

                  <td className="py-5 text-slate-300">
                    {voucher.expiry_date
                      ? new Date(voucher.expiry_date).toLocaleDateString('en-GB')
                      : 'No expiry'}
                  </td>

                  <td className="py-5">
                    <VoucherBadge status={voucher.status || 'active'} />
                  </td>

                  <td className="py-5">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => copyCode(voucher.code)}
                        className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/10"
                      >
                        Copy
                      </button>

                      {voucher.status === 'active' && (
                        <button
                          onClick={() => markRedeemed(voucher)}
                          className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/25"
                        >
                          Redeem
                        </button>
                      )}

                      {voucher.status !== 'cancelled' && (
                        <button
                          onClick={() => cancelVoucher(voucher)}
                          className="rounded-xl bg-red-500/15 px-3 py-2 text-sm font-bold text-red-300 hover:bg-red-500/25"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredVouchers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No gift vouchers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  )
}

function StatusCard({
  label,
  count,
  tone,
}: {
  label: string
  count: number
  tone: 'emerald' | 'blue' | 'amber' | 'red'
}) {
  const classes = {
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    blue: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    red: 'border-red-500/20 bg-red-500/10 text-red-300',
  }

  return (
    <div className={`rounded-3xl border p-5 ${classes[tone]}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-black">{count}</p>
    </div>
  )
}

function VoucherBadge({ status }: { status: string }) {
  const normalised = status.toLowerCase()

  if (normalised === 'redeemed') {
    return (
      <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm font-bold text-blue-300">
        Redeemed
      </span>
    )
  }

  if (normalised === 'expired') {
    return (
      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-sm font-bold text-amber-300">
        Expired
      </span>
    )
  }

  if (normalised === 'cancelled') {
    return (
      <span className="rounded-full bg-red-500/10 px-3 py-1 text-sm font-bold text-red-300">
        Cancelled
      </span>
    )
  }

  return (
    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-300">
      Active
    </span>
  )
}