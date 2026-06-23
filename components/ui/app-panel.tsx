import React from 'react'

type AppPanelProps = {
  title?: string
  eyebrow?: string
  description?: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function AppPanel({ title, eyebrow, description, children, action, className = '' }: AppPanelProps) {
  return (
    <section className={`rounded-[32px] border border-white/10 bg-[#111111]/80 p-6 shadow-2xl backdrop-blur-2xl ${className}`}>
      {(title || description || action) && (
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            {eyebrow && (
              <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-stone-500">
                {eyebrow}
              </p>
            )}
            {title && <h2 className="text-2xl font-black md:text-3xl">{title}</h2>}
            {description && <p className="mt-2 max-w-2xl text-stone-400">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
