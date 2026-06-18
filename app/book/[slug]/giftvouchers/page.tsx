'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Theme = {
  page: string
  card: string
  innerCard: string
  text: string
  muted: string
}

const themes: Record<string, Theme> = {
  classic_dark: {
    page: 'bg-[#020617] text-white',
    card: 'border-white/10 bg-white/[0.05]',
    innerCard: 'border-white/10 bg-black/20',
    text: 'text-slate-300',
    muted: 'text-slate-500',
  },
  clean_light: {
    page: 'bg-slate-50 text-slate-950',
    card: 'border-slate-200 bg-white',
    innerCard: 'border-slate-200 bg-slate-50',
    text: 'text-slate-600',
    muted: 'text-slate-400',
  },
  luxury_gold: {
    page: 'bg-black text-white',
    card: 'border-yellow-700/30 bg-yellow-950/10',
    innerCard: 'border-yellow-700/30 bg-black/30',
    text: 'text-yellow-100/80',
    muted: 'text-yellow-600',
  },
  clinic_rose: {
    page: 'bg-rose-50 text-rose-950',
    card: 'border-rose-200 bg-white',
    innerCard: 'border-rose-200 bg-rose-50',
    text: 'text-rose-700',
    muted: 'text-rose-400',
  },
  electric_blue: {
    page: 'bg-slate-950 text-white',
    card: 'border-blue-500/20 bg-blue-950/20',
    innerCard: 'border-blue-500/20 bg-black/20',
    text: 'text-blue-100/80',
    muted: 'text-blue-400',
  },
  forest_green: {
    page: 'bg-emerald-950 text-white',
    card: 'border-emerald-500/20 bg-emerald-900/20',
    innerCard: 'border-emerald-500/20 bg-black/20',
    text: 'text-emerald-100/80',
    muted: 'text-emerald-400',
  },
  monochrome: {
    page: 'bg-neutral-950 text-white',
    card: 'border-neutral-700 bg-neutral-900',
    innerCard: 'border-neutral-700 bg-black/20',
    text: 'text-neutral-300',
    muted: 'text-neutral-500',
  },
}

const presetAmounts = [10, 25, 50, 100]

export default function GiftVouchersPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [business, setBusiness] = useState<any>(null)
  const [loadingBusiness, setLoadingBusiness] = useState(true)

  const [selectedAmount, setSelectedAmount] = useState(25)
  const [customAmount, setCustomAmount] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [fromName, setFromName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadBusiness() {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      setBusiness(data)
      setLoadingBusiness(false)
    }

    if (slug) loadBusiness()
  }, [slug])

  if (loadingBusiness) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading gift vouchers...</p>
      </main>
    )
  }

  if (!business) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <h1 className="text-4xl font-bold">Business not found</h1>
      </main>
    )
  }

  const theme =
    themes[business.brand_theme || 'classic_dark'] || themes.classic_dark

  const primaryColour = business.primary_colour || '#7c3aed'
  const secondaryColour = business.secondary_colour || '#2563eb'

  const finalAmount = customAmount ? Number(customAmount) : selectedAmount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!recipientName || !recipientEmail || !fromName) {
      setError('Please complete all required fields.')
      return
    }

    if (!finalAmount || finalAmount < 5) {
      setError('Please choose an amount of at least £5.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/create-voucher-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug: slug,
          amount: finalAmount,
          recipientName,
          recipientEmail,
          fromName,
          message,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Something went wrong.')

      window.location.href = data.url
    } catch (err: any) {
      setError(err.message || 'Unable to start checkout.')
      setLoading(false)
    }
  }

  return (
    <main className={`min-h-screen relative overflow-hidden ${theme.page}`}>
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(circle at top left, ${primaryColour}66 0%, transparent 32%), radial-gradient(circle at bottom right, ${secondaryColour}66 0%, transparent 34%)`,
        }}
      />

      {business.hero_image_url && (
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${business.hero_image_url})` }}
        />
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <header className="mb-10">
          <div className={`rounded-[32px] border backdrop-blur-2xl p-8 md:p-10 ${theme.card}`}>
            {business.logo_url && (
              <div className="mb-8">
                <img
                  src={business.logo_url}
                  alt={business.business_name}
                  className="max-h-20 max-w-56 object-contain"
                />
              </div>
            )}

            <div
              className="inline-flex rounded-full px-4 py-2 text-sm font-bold mb-6 text-white"
              style={{
                background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
              }}
            >
              Gift vouchers
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
              Give the gift of great service
            </h1>

            <p className={`text-xl leading-8 max-w-3xl ${theme.text}`}>
              Buy a digital gift voucher for {business.business_name}. Choose an amount,
              add a personal message and send the perfect gift by email.
            </p>
          </div>
        </header>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
          <form
            onSubmit={handleSubmit}
            className={`rounded-[32px] border backdrop-blur-2xl p-8 md:p-10 ${theme.card}`}
          >
            <p className={`text-sm font-bold uppercase tracking-[0.25em] mb-2 ${theme.muted}`}>
              Step one
            </p>

            <h2 className="text-3xl font-bold mb-8">Choose your amount</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {presetAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amount)
                    setCustomAmount('')
                  }}
                  className={`border rounded-2xl p-5 text-xl font-black transition ${theme.innerCard}`}
                  style={
                    selectedAmount === amount && !customAmount
                      ? {
                          background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
                          color: '#fff',
                        }
                      : {}
                  }
                >
                  £{amount}
                </button>
              ))}
            </div>

            <div className="mb-8">
              <label className={`block text-sm font-bold mb-2 ${theme.muted}`}>
                Custom amount
              </label>
              <input
                type="number"
                min="5"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                className={`w-full rounded-2xl border px-5 py-4 bg-transparent outline-none ${theme.innerCard}`}
              />
            </div>

            <p className={`text-sm font-bold uppercase tracking-[0.25em] mb-2 ${theme.muted}`}>
              Step two
            </p>

            <h2 className="text-3xl font-bold mb-8">Personalise the voucher</h2>

            <div className="grid gap-5">
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Recipient name"
                className={`w-full rounded-2xl border px-5 py-4 bg-transparent outline-none ${theme.innerCard}`}
              />

              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Recipient email"
                className={`w-full rounded-2xl border px-5 py-4 bg-transparent outline-none ${theme.innerCard}`}
              />

              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="From"
                className={`w-full rounded-2xl border px-5 py-4 bg-transparent outline-none ${theme.innerCard}`}
              />

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Personal message"
                className={`w-full resize-none rounded-2xl border px-5 py-4 bg-transparent outline-none ${theme.innerCard}`}
              />
            </div>

            {error && (
              <div className="mt-6 rounded-2xl bg-red-500/10 border border-red-500/20 px-5 py-4 text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-8 w-full rounded-2xl px-6 py-5 text-lg font-black text-white transition disabled:opacity-60"
              style={{
                background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
              }}
            >
              {loading ? 'Taking you to checkout...' : `Buy £${finalAmount || 0} gift voucher`}
            </button>
          </form>

          <aside className="space-y-6">
            <section className={`rounded-[28px] border backdrop-blur-xl p-8 ${theme.card}`}>
              <p className={`text-sm font-bold uppercase tracking-[0.25em] mb-2 ${theme.muted}`}>
                Why buy one?
              </p>

              <h2 className="text-3xl font-bold mb-6">A simple gift that always works</h2>

              <div className={`space-y-4 leading-7 ${theme.text}`}>
                <p>Instant email delivery after payment.</p>
                <p>Redeemable against services.</p>
                <p>Valid for 12 months.</p>
                <p>Perfect for birthdays, Christmas, thank you gifts and last-minute presents.</p>
              </div>
            </section>

            <section className={`rounded-[28px] border backdrop-blur-xl p-8 ${theme.card}`}>
              <p className={`text-sm font-bold uppercase tracking-[0.25em] mb-2 ${theme.muted}`}>
                Details
              </p>

              <h2 className="text-3xl font-bold mb-6">How it works</h2>

              <div className={`space-y-5 ${theme.text}`}>
                <p>Choose the voucher amount.</p>
                <p>Add the recipient details and your message.</p>
                <p>Pay securely online.</p>
                <p>The voucher is sent by email.</p>
              </div>
            </section>
          </aside>
        </div>

        <footer className={`text-center text-sm mt-10 ${theme.muted}`}>
          Powered by AMB Booking
        </footer>
      </div>
    </main>
  )
}