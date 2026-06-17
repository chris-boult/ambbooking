'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function BookingSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        background: '#f8fafc',
      }}
    >
      <div
        style={{
          maxWidth: '620px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '42px',
          boxShadow: '0 20px 60px rgba(15, 23, 42, 0.12)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '34px', color: '#0f172a' }}>
          Payment received. Booking confirmed.
        </h1>

        <p style={{ fontSize: '17px', color: '#475569' }}>
          Your payment has been completed successfully and your booking is now confirmed.
          A confirmation email will be sent shortly.
        </p>

        {sessionId && (
          <p style={{ fontSize: '13px', color: '#94a3b8', wordBreak: 'break-all' }}>
            Stripe reference: {sessionId}
          </p>
        )}
      </div>
    </main>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingSuccessContent />
    </Suspense>
  )
}