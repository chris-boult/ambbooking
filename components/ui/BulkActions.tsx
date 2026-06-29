import { ReactNode } from 'react'

type BulkActionsProps = {
  selectedCount: number
  children: ReactNode
}

export default function BulkActions({ selectedCount, children }: BulkActionsProps) {
  if (selectedCount <= 0) return null

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 md:flex-row md:items-center md:justify-between">
      <p className="font-semibold text-indigo-100">
        {selectedCount} selected
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
