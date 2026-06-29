import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ReactNode } from 'react'

export default function DashboardButton({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-black transition hover:-translate-y-1 ${
        primary
          ? 'bg-cyan-400 text-slate-950 shadow-[0_0_80px_rgba(34,211,238,.25)] hover:bg-cyan-300'
          : 'border border-white/10 bg-white/[0.045] text-white hover:bg-white/[0.09]'
      }`}
    >
      {children}
      <ArrowRight size={17} className="transition group-hover:translate-x-1" />
    </Link>
  )
}
