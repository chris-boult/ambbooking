'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'

type Props = {
  children: React.ReactNode
  className?: string
}

export default function GradientText({
  children,
  className,
}: Props) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={clsx(
        'bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-500 bg-clip-text text-transparent',
        className
      )}
    >
      {children}
    </motion.span>
  )
}