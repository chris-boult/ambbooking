'use client'

import GlassCard from './GlassCard'

type Props = {
  title?: string
  children: React.ReactNode
}

export default function BrowserFrame({
  title = 'dashboard.ambbooking.co.uk',
  children,
}: Props) {
  return (
    <GlassCard className="overflow-hidden">

      <div className="border-b border-white/10 bg-white/[0.03]">

        <div className="flex items-center gap-3 px-5 py-4">

          <div className="flex gap-2">

            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />

          </div>

          <div className="ml-4 flex-1 rounded-lg bg-white/5 px-4 py-2 text-xs text-slate-400">
            {title}
          </div>

        </div>

      </div>

      {children}

    </GlassCard>
  )
}