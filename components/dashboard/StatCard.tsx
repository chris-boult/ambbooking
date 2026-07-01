import type { ReactNode } from 'react'

type StatCardProps = {
  label: string
  value: string | number
  icon?: ReactNode
  subtitle?: string
  trend?: string
  colour?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet'
  onClick?: () => void
}

const colourMap = {
  cyan: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  amber: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  rose: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
  violet: 'border-violet-400/20 bg-violet-400/10 text-violet-200',
}

export default function StatCard({
  label,
  value,
  icon,
  subtitle,
  trend,
  colour = 'cyan',
  onClick,
}: StatCardProps) {
  const interactive = Boolean(onClick)

  return (
    <div
      onClick={onClick}
      className={[
        'rounded-[2rem] border border-white/10 bg-[#07111f] p-5 shadow-[0_35px_120px_rgba(0,0,0,.32)] transition',
        interactive
          ? 'cursor-pointer hover:-translate-y-1 hover:border-cyan-300/30'
          : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            {label}
          </p>

          <h2 className="mt-3 truncate text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">
            {value}
          </h2>

          {subtitle && (
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        {icon && (
          <div
            className={[
              'flex h-12 w-12 items-center justify-center rounded-2xl border',
              colourMap[colour],
            ].join(' ')}
          >
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <span
            className={[
              'inline-flex rounded-full border px-3 py-1 text-xs font-black',
              colourMap[colour],
            ].join(' ')}
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  )
}