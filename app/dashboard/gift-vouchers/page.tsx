'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Voucher = {
  id: string
  code: string
  amount: number
  remaining_amount: number
  recipient_name: string | null
  recipient_email: string | null
  purchaser_name: string | null
  purchaser_email: string | null
  expiry_date: string | null
  status: string
  created_at: string
}

type Business = {
  id: string
}

export default function GiftVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [businessId, setBusinessId] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [amount, setAmount] = useState('50')

  useEffect(() => {
    loadVouchers()
  }, [])

  async function getBusinessId() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return ''

    const { data: ownerBusiness } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (ownerBusiness) return (ownerBusiness as Business).id

    const { data: userBusiness } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (userBusiness) return (userBusiness as Business).id

    const { data: anyBusiness } = await supabase
      .from('businesses')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (anyBusiness) return (anyBusiness as Business).id

    return ''
  }

  async function loadVouchers() {
    setLoading(true)
    setMessage('')

    const foundBusinessId = await getBusinessId()

    if (!foundBusinessId) {
      setMessage('No business found.')
      setLoading(false)
      return
    }

    setBusinessId(foundBusinessId)

    const { data, error } = await supabase
      .from('gift_vouchers')
      .select('*')
      .eq('business_id', foundBusinessId)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setVouchers((data as Voucher[]) || [])
    setLoading(false)
  }

  function generateCode() {
    return (
      'AMB-' +
      Math.random().toString(36).substring(2, 6).toUpperCase() +
      '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase()
    )
  }

  async function createVoucher() {
    setMessage('')

    if (!businessId) {
      setMessage('No business found.')
      return
    }

    const numericAmount = Number(amount)

    if (!numericAmount || numericAmount <= 0) {
      setMessage('Please enter a valid voucher amount.')
      return
    }

    const voucherCode = generateCode()

    const { error } = await supabase.from('gift_vouchers').insert({
      business_id: businessId,
      code: voucherCode,
      amount: numericAmount,
      remaining_amount: numericAmount,
      recipient_name: recipientName || null,
      recipient_email: recipientEmail || null,
      status: 'active',
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setRecipientName('')
    setRecipientEmail('')
    setAmount('50')
    setMessage(`Voucher created: ${voucherCode}`)

    await loadVouchers()
  }

  async function updateVoucherStatus(id: string, status: string) {
    const { error } = await supabase
      .from('gift_vouchers')
      .update({
        status,
        redeemed_at: status === 'redeemed' ? new Date().toISOString() : null,
        remaining_amount: status === 'redeemed' ? 0 : undefined,
      })
      .eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadVouchers()
  }

  const activeCount = vouchers.filter(
    (voucher) => voucher.status === 'active'
  ).length

  const redeemedCount = vouchers.filter(
    (voucher) => voucher.status === 'redeemed'
  ).length

  const cancelledCount = vouchers.filter(
    (voucher) => voucher.status === 'cancelled'
  ).length

  const activeValue = vouchers
    .filter((voucher) => voucher.status === 'active')
    .reduce((sum, voucher) => sum + Number(voucher.remaining_amount || 0), 0)

  if (loading) {
    return <div className="p-8 text-white">Loading gift vouchers...</div>
  }

  return (
    <div className="p-8 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Gift Vouchers</h1>
        <p className="text-slate-400">
          Create, track and redeem gift vouchers.
        </p>
      </div>

      {message && (
        <div className="mb-6 bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-300">
          {message}
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Active vouchers" value={activeCount.toString()} />
        <StatCard title="Redeemed" value={redeemedCount.toString()} />
        <StatCard title="Cancelled" value={cancelledCount.toString()} />
        <StatCard title="Outstanding value" value={`£${activeValue.toFixed(2)}`} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Create voucher</h2>

        <div className="grid md:grid-cols-3 gap-4">
          <input
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
            placeholder="Recipient name"
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
          />

          <input
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
            placeholder="Recipient email"
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
          />

          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Amount"
            type="number"
            min="1"
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
          />
        </div>

        <button
          type="button"
          onClick={createVoucher}
          className="mt-4 bg-white text-slate-950 font-bold px-6 py-3 rounded-lg"
        >
          Create voucher
        </button>
      </div>

      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Voucher register</h2>

        {vouchers.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400">
            No vouchers created yet.
          </div>
        )}

        <div className="space-y-4">
          {vouchers.map((voucher) => (
            <div
              key={voucher.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold font-mono">
                    {voucher.code}
                  </h3>

                  <p className="text-slate-400">
                    {voucher.recipient_name || 'No recipient name'}{' '}
                    {voucher.recipient_email
                      ? `• ${voucher.recipient_email}`
                      : ''}
                  </p>

                  <div className="mt-4 grid gap-2 text-sm text-slate-300">
                    <p>
                      <span className="text-slate-500">Original value:</span>{' '}
                      £{Number(voucher.amount).toFixed(2)}
                    </p>

                    <p>
                      <span className="text-slate-500">Remaining:</span>{' '}
                      £{Number(voucher.remaining_amount).toFixed(2)}
                    </p>

                    <p>
                      <span className="text-slate-500">Status:</span>{' '}
                      <span
                        className={
                          voucher.status === 'active'
                            ? 'text-emerald-400'
                            : voucher.status === 'redeemed'
                              ? 'text-sky-400'
                              : 'text-red-400'
                        }
                      >
                        {voucher.status}
                      </span>
                    </p>

                    <p>
                      <span className="text-slate-500">Created:</span>{' '}
                      {new Date(voucher.created_at).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {voucher.status === 'active' && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          updateVoucherStatus(voucher.id, 'redeemed')
                        }
                        className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg font-semibold"
                      >
                        Mark redeemed
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateVoucherStatus(voucher.id, 'cancelled')
                        }
                        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-slate-400 text-sm mb-2">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}