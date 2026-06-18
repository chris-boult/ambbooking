import Link from 'next/link'

export default function GiftVoucherSuccessPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <section className="max-w-xl w-full rounded-[32px] border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-8 md:p-10 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl">
          ✓
        </div>

        <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500 mb-3">
          Payment successful
        </p>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-5">
          Gift voucher purchased
        </h1>

        <p className="text-lg leading-8 text-slate-300 mb-8">
          Thank you. The gift voucher payment has been completed successfully.
          The voucher will be emailed to the recipient shortly.
        </p>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-left text-slate-300 mb-8">
          <p className="font-bold text-white mb-2">What happens next?</p>
          <p>
            Once payment has been confirmed, a unique gift voucher code will be
            generated and sent to the recipient by email.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex rounded-2xl bg-white px-6 py-4 font-black text-slate-950 transition hover:bg-slate-200"
        >
          Return home
        </Link>

        <footer className="text-center text-sm mt-10 text-slate-500">
          Powered by AMB Booking
        </footer>
      </section>
    </main>
  )
}