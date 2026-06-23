import React from 'react'

type AppButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
  fullWidth?: boolean
}

export function AppButton({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}: AppButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-orange-500 to-yellow-300 text-black shadow-lg hover:scale-[1.01]',
    secondary: 'border border-white/10 bg-white/[0.04] text-white hover:bg-white/10',
    danger: 'border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20',
  }

  return (
    <button
      type="button"
      className={`rounded-2xl px-5 py-3 font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${fullWidth ? 'w-full' : ''} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
