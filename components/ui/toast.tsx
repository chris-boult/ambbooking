import { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ToastVariant = 'default' | 'success' | 'danger' | 'warning'

const variants: Record<ToastVariant, string> = {
  default: 'border-slate-800 bg-slate-900 text-white',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
  danger: 'border-red-500/20 bg-red-500/10 text-red-100',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
}

export default function Toast({
  title,
  description,
  variant = 'default',
  action,
  className,
}: {
  title: string
  description?: string
  variant?: ToastVariant
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border p-4 shadow-xl', variants[variant], className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold">{title}</p>
          {description && <p className="mt-1 text-sm opacity-80">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  )
}