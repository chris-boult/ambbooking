import { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  description?: string
}

export default function Checkbox({ label, description, className, ...props }: CheckboxProps) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 p-4', className)}>
      <input
        {...props}
        type="checkbox"
        className="mt-1 h-5 w-5 rounded border-slate-700 bg-slate-900"
      />
      <span>
        {label && <span className="block font-semibold text-slate-100">{label}</span>}
        {description && <span className="mt-1 block text-sm text-slate-500">{description}</span>}
      </span>
    </label>
  )
}
