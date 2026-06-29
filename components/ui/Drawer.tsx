import { ReactNode, useEffect } from 'react'
import { cn } from '@/lib/cn'

type DrawerProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export default function Drawer({ open, onClose, title, children, className }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70">
      <button aria-label="Close drawer overlay" className="absolute inset-0" onClick={onClose} />
      <aside className={cn('absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-slate-950 p-6 shadow-2xl', className)}>
        {title && <h2 className="mb-6 text-2xl font-bold">{title}</h2>}
        {children}
      </aside>
    </div>
  )
}
