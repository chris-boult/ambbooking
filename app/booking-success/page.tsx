'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function BookingSuccessPage() {
  const searchParams = useSearchParams()

  const isPackage = searchParams.get('package') === 'success'
  const isVoucher = searchParams.get('voucher') === 'success'

  let title = 'Booking confirmed'
  let message = 'Your appointment has been booked successfully.'
  let detail =
    'A confirmation has been sent to the email address provided during booking.'

  if (isPackage) {
    title = 'Package purchased successfully'
    message = 'Your package has been purchased and added to your customer account.'
    detail =
      'You can now use your package sessions when booking future appointments with this business.'
  }

  if (isVoucher) {
    title = 'Gift voucher purchased successfully'
    message = 'Your gift voucher has been purchased and is ready to use.'
    detail =
      'The voucher code and voucher details have been sent to the recipient email address provided during purchase.'
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-10 text-center">
        <div
          className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${
            isVoucher
              ? 'bg-purple-500/15 text-purple-400'
              : isPackage
                ? 'bg-blue-500/15 text-blue-400'
                : 'bg-emerald-500/15 text-emerald-400'
          }`}
        >
          {isVoucher ? '🎁' : isPackage ? '📦' : '✓'}
        </div>

        <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">
          {isVoucher
            ? 'Gift Voucher'
            : isPackage
              ? 'Package Purchase'
              : 'Booking'}
        </p>

        <h1 className="text-4xl md:text-5xl font-black mb-4">
          {title}
        </h1>

        <p className="text-slate-300 text-lg mb-4">
          {message}
        </p>

        <p className="text-slate-400 mb-8">
          {detail}
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <Link
            href="/"
            className="rounded-xl bg-white text-slate-950 font-bold px-6 py-4"
          >
            Done
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-slate-700 text-white font-bold px-6 py-4"
          >
            Return home
          </Link>
        </div>
      </div>
    </main>
  )
}