import React from 'react'

type AppInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  helper?: string
}

export function AppInput({ label, helper, className = '', ...props }: AppInputProps) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-sm font-bold text-stone-300">{label}</span>}
      <input
        className={`w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white outline-none placeholder:text-stone-600 focus:border-orange-400/50 ${className}`}
        {...props}
      />
      {helper && <span className="mt-2 block text-xs text-stone-500">{helper}</span>}
    </label>
  )
}

type AppTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  helper?: string
}

export function AppTextarea({ label, helper, className = '', ...props }: AppTextareaProps) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-sm font-bold text-stone-300">{label}</span>}
      <textarea
        className={`min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white outline-none placeholder:text-stone-600 focus:border-orange-400/50 ${className}`}
        {...props}
      />
      {helper && <span className="mt-2 block text-xs text-stone-500">{helper}</span>}
    </label>
  )
}
