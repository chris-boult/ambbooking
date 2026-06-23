import React from 'react'

type AppShellProps = {
  children: React.ReactNode
  eyebrow?: string
  title?: string
  description?: string
  action?: React.ReactNode
  maxWidth?: string
}

export function AppShell({
  children,
  eyebrow,
  title,
  description,
  action,
  maxWidth = 'max-w-7xl',
}: AppShellProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(249,115,22,0.14)_0%,transparent_30%),radial-gradient(circle_at_85%_0%,rgba(250,204,21,0.10)_0%,transparent_32%),linear-gradient(135deg,#080808_0%,#111111_55%,#17120c_100%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className={`relative z-10 mx-auto ${maxWidth} px-4 py-8 md:px-8 md:py-10`}>
        {(title || description || action) && (
          <section className="mb-8 overflow-hidden rounded-[36px] border border-white/10 bg-[#111111]/90 shadow-2xl backdrop-blur-2xl">
            <div className="h-2 w-full bg-gradient-to-r from-orange-500 to-yellow-300" />
            <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
              <div>
                {eyebrow && (
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-stone-500">
                    {eyebrow}
                  </p>
                )}
                {title && <h1 className="text-4xl font-black tracking-tight md:text-6xl">{title}</h1>}
                {description && <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-300">{description}</p>}
              </div>
              {action && <div className="shrink-0">{action}</div>}
            </div>
          </section>
        )}

        {children}
      </div>
    </main>
  )
}
