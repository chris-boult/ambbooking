import Link from 'next/link'

export default function BookingCancelledPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <p className="text-orange-400 font-bold mb-3">
          Payment cancelled
        </p>

        <h1 className="text-4xl font-bold mb-4">
          Booking not completed
        </h1>

        <p className="text-slate-400 mb-8">
          Your payment was cancelled. Please go back and try again.
        </p>

        <Link
          href="/"
          className="inline-block bg-white text-slate-950 font-bold px-6 py-3 rounded-xl"
        >
          Back to home
        </Link>
      </div>
    </main>
  )
}