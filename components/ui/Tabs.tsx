import { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type TabItem<T extends string = string> = {
  id: T
  label: string
  badge?: string
}

type TabsProps<T extends string = string> = {
  tabs: TabItem<T>[]
  activeTab: T
  onChange: (tab: T) => void
  className?: string
}

export default function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className,
}: TabsProps<T>) {
  return (
    <div className={cn('flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'rounded-xl px-4 py-2 text-sm font-bold transition',
            activeTab === tab.id
              ? 'bg-white text-slate-950'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          )}
        >
          {tab.label}
          {tab.badge && (
            <span className="ml-2 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-white">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function TabPanel({ active, children, className }: { active: boolean; children: ReactNode; className?: string }) {
  if (!active) return null
  return <div className={className}>{children}</div>
}
