'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import clsx from 'clsx'

type GradientButtonProps = {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  className?: string
}

export default function GradientButton({
  href,
  children,
  variant = 'primary',
  className,
}: GradientButtonProps) {
  const primary = variant === 'primary'

  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        href={href}
        className={clsx(
          'group relative inline-flex items-center justify-center overflow-hidden rounded-2xl px-7 py-4 font-semibold transition-all duration-300',
          primary
            ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 text-white shadow-[0_0_40px_rgba(59,130,246,.35)]'
            : 'border border-white/10 bg-white/5 text-white backdrop-blur-xl hover:bg-white/10',
          className
        )}
      >
        {primary && (
          <span className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            <span className="absolute -left-20 top-0 h-full w-20 rotate-12 bg-white/20 blur-xl transition-all duration-700 group-hover:left-[120%]" />
          </span>
        )}

        <span className="relative flex items-center gap-2">
          {children}

          <ArrowRight
            size={18}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </span>
      </Link>
    </motion.div>
  )
}