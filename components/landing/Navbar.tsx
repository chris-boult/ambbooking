'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'

const links = [
  { href: '#features', label: 'Platform' },
  { href: '#solutions', label: 'Solutions' },
  { href: '#enterprise', label: 'Enterprise' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#resources', label: 'Resources' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)

    window.addEventListener('scroll', onScroll)

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: .5 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'backdrop-blur-2xl bg-slate-950/75 border-b border-white/10'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        <Link
          href="/"
          className="flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 font-black text-white shadow-2xl shadow-cyan-500/20">
            A
          </div>

          <div>

            <div className="text-lg font-bold tracking-tight text-white">
              AMB Booking
            </div>

            <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Platform
            </div>

          </div>

        </Link>

        <nav className="hidden items-center gap-10 lg:flex">

          {links.map(link => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}

        </nav>

        <div className="hidden items-center gap-4 lg:flex">

          <Link
            href="/login"
            className="text-sm font-medium text-slate-300 hover:text-white"
          >
            Log in
          </Link>

          <Link
            href="/signup"
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:scale-105"
          >
            Start free
          </Link>

        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden text-white"
        >
          {mobileOpen ? <X size={28}/> : <Menu size={28}/>}
        </button>

      </div>

      {mobileOpen && (

        <motion.div
          initial={{ opacity:0,height:0 }}
          animate={{ opacity:1,height:'auto' }}
          exit={{ opacity:0,height:0 }}
          className="border-t border-white/10 bg-slate-950/95 backdrop-blur-xl lg:hidden"
        >

          <div className="flex flex-col px-6 py-6">

            {links.map(link=>(
              <Link
                key={link.label}
                href={link.href}
                className="py-4 text-slate-300 hover:text-white"
                onClick={()=>setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/login"
              className="mt-4 py-3 text-slate-300"
            >
              Log in
            </Link>

            <Link
              href="/signup"
              className="mt-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 py-3 text-center font-semibold text-white"
            >
              Start free
            </Link>

          </div>

        </motion.div>

      )}

    </motion.header>
  )
}