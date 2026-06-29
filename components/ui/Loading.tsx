import { cn } from '@/lib/cn'

export default function Loading({ label = 'Loading...', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-slate-400', className)}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-white" />
      <span>{label}</span>
    </div>
  )
}
