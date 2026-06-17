'use client'

export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'

export default function BookingSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      background: '#f8fafc'
    }}>
      <div style={{
        maxWidth: '620px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '24px',
        padding: '42px',
        boxShadow: '0 20px 60px rgba(15, 23, 42, 0.12)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '999px',
          background: '#dcfce7',
          color: '#166534',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '36px',
          fontWeight: 800
        }}>
          ✓
        </div>

        <h1 style={{
          fontSize: '34px',
          lineHeight: '1.1',
          marginBottom: '16px',
          color: '#0f172a'
        }}>
          Payment received. Booking confirmed.
        </h1>

        <p style={{
          fontSize: '17px',
          lineHeight: '1.7',
          color: '#475569',
          marginBottom: '28px'
        }}>
          Your payment has been completed successfully and your booking is now confirmed.
          A confirmation email will be sent shortly.
        </p>

        {sessionId && (
          <p style={{
            fontSize: '13px',
            color: '#94a3b8',
            wordBreak: 'break-all'
          }}>
            Stripe reference: {sessionId}
          </p>
        )}
      </div>
    </main>
  )
}