import { ReactNode } from 'react'
import Card from './Card'

type StatCardProps = {
  label: string
  value: ReactNode
  helper?: string
  trend?: ReactNode
}

export default function StatCard({ label, value, helper, trend }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
          {helper && <p className="mt-2 text-sm text-slate-500">{helper}</p>}
        </div>
        {trend && <div>{trend}</div>}
      </div>
    </Card>
  )
}
