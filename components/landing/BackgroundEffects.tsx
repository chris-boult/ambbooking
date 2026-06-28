'use client'

import { motion } from 'framer-motion'

export default function BackgroundEffects() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* Base background */}
      <div className="absolute inset-0 bg-[#020617]" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Aurora 1 */}
      <motion.div
        animate={{
          x: [-120, 80, -120],
          y: [-60, 40, -60],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-48 left-0 h-[700px] w-[700px] rounded-full bg-cyan-500/20 blur-[140px]"
      />

      {/* Aurora 2 */}
      <motion.div
        animate={{
          x: [80, -100, 80],
          y: [40, -80, 40],
          scale: [1.1, .9, 1.1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute right-0 top-20 h-[650px] w-[650px] rounded-full bg-violet-600/20 blur-[150px]"
      />

      {/* Aurora 3 */}
      <motion.div
        animate={{
          x: [-60, 120, -60],
          y: [80, -20, 80],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 36,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-[-250px] left-1/2 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-blue-500/15 blur-[180px]"
      />

      {/* Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_70%)]" />

      {/* Noise */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22 viewBox=%220 0 200 200%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22/%3E%3C/filter%3E%3Crect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')",
        }}
      />

    </div>
  )
}