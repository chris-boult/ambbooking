import Button from './Button'

type PaginationProps = {
  page: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}

export default function Pagination({ page, totalPages, onPrevious, onNext }: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-800 px-4 py-3">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </p>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onPrevious} disabled={page <= 1}>
          Previous
        </Button>
        <Button variant="secondary" onClick={onNext} disabled={page >= totalPages}>
          Next
        </Button>
      </div>
    </div>
  )
}
