import React from 'react'

type AppSectionHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function AppSectionHeader({ eyebrow, title, description, action }: AppSectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-stone-500">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-black md:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-stone-400">{description}</p>}
      </div>
      {action}
    </div>
  )
}
