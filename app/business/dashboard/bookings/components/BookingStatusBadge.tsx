import Badge from '@/components/ui/Badge'

export default function BookingStatusBadge({ status }: { status: string }) {
  const colour =
    status === 'cancelled'
      ? 'text-red-400 bg-red-500/10'
      : status === 'completed'
        ? 'text-emerald-400 bg-emerald-500/10'
        : status === 'no_show'
          ? 'text-orange-400 bg-orange-500/10'
          : 'text-sky-400 bg-sky-500/10'

  return <Badge className={colour}>{status.replace('_', ' ')}</Badge>
}
