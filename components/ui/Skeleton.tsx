import { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export default function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn('animate-pulse rounded-xl bg-slate-800', className)} />
}
