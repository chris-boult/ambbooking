'use client'

import { motion } from 'framer-motion'

export default function ScrollIndicator() {
  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2">

      <div className="flex flex-col items-center gap-3">

        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Scroll
        </span>

        <div className="flex h-14 w-8 justify-center rounded-full border border-white/15">

          <motion.div
            animate={{
              y: [2, 18, 2],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.8,
            }}
            className="mt-2 h-2 w-2 rounded-full bg-cyan-400"
          />

        </div>

      </div>

    </div>
  )
}