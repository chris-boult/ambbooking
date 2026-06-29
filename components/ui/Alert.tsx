import { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type AlertVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

const variants: Record<AlertVariant, string> = {
  default: 'border-slate-800 bg-slate-900 text-slate-200',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
  danger: 'border-red-500/20 bg-red-500/10 text-red-100',
  info: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100',
}

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant
  title?: string
}

export default function Alert({ variant = 'default', title, className, children, ...props }: AlertProps) {
  return (
    <div
      {...props}
      className={cn('rounded-2xl border p-4 text-sm', variants[variant], className)}
    >
      {title && <p className="mb-1 font-bold">{title}</p>}
      <div>{children}</div>
    </div>
  )
}
