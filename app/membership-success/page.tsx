'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function MembershipSuccessContent() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const [message, setMessage] = useState('Activating your membership...')

  useEffect(() => {
    activate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  async function activate() {
    if (!sessionId) {
      setMessage('No Stripe session found.')
      return
    }

    const response = await fetch('/api/memberships/activate-from-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setMessage(result?.error || 'Could not activate membership.')
      return
    }

    setMessage('Your membership is active.')
  }

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-12 text-white">
      <div className="mx-auto max-w-xl rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-300">
          Membership
        </p>
        <h1 className="mt-3 text-4xl font-black">Membership checkout</h1>
        <p className="mt-4 text-slate-400">{message}</p>
      </div>
    </main>
  )
}

export default function MembershipSuccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading...</div>}>
      <MembershipSuccessContent />
    </Suspense>
  )
}