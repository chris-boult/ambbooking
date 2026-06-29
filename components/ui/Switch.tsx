import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type SwitchProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: string
  description?: string
}

export default function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  className,
  ...props
}: SwitchProps) {
  return (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(event) => {
        props.onClick?.(event)
        if (!event.defaultPrevented) onCheckedChange?.(!checked)
      }}
      className={cn(
        'flex w-full items-center justify-between rounded-xl border border-slate-800 p-4 text-left transition hover:bg-slate-900/70 disabled:opacity-50',
        className
      )}
    >
      <span>
        {label && <span className="block font-semibold text-slate-100">{label}</span>}
        {description && <span className="mt-1 block text-sm text-slate-500">{description}</span>}
      </span>
      <span className={cn('relative h-6 w-11 rounded-full transition', checked ? 'bg-indigo-600' : 'bg-slate-700')}>
        <span
          className={cn(
            'absolute top-1 h-4 w-4 rounded-full bg-white transition',
            checked ? 'left-6' : 'left-1'
          )}
        />
      </span>
    </button>
  )
}
