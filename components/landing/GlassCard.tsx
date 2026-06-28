'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'

type Props = {
  children: React.ReactNode
  className?: string
}

export default function GlassCard({
  children,
  className,
}: Props) {
  return (
    <motion.div
      whileHover={{
        y: -6,
        transition: { duration: .25 }
      }}
      className={clsx(
        `
        relative
        overflow-hidden
        rounded-3xl
        border
        border-white/10
        bg-white/[0.04]
        backdrop-blur-2xl
        shadow-[0_20px_80px_rgba(0,0,0,.45)]
        `,
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent" />

      <div className="relative">
        {children}
      </div>
    </motion.div>
  )
}