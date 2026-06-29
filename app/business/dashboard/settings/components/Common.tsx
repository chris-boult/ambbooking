import Card from '@/components/ui/Card'

export function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-2 block text-slate-400">{label}</label>
      <input className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  )
}

export function BillingRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-xl border border-slate-800 p-4"><span className="text-slate-400">{label}</span><span className="font-bold capitalize">{value}</span></div>
}

export function FeatureRow({ title, enabled }: { title: string; enabled: boolean }) {
  return <div className="flex items-center justify-between rounded-xl border border-slate-800 p-4"><span className="font-semibold">{title}</span><span className={enabled ? 'text-emerald-400' : 'text-amber-300'}>{enabled ? 'Enabled' : 'Locked'}</span></div>
}

export function UsageCard({ label, value }: { label: string; value: number }) {
  return <Card><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></Card>
}
