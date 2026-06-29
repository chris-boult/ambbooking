import { ReactNode, useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { searchRows } from '@/lib/table'
import type { TableColumn } from '@/types/table'
import EmptyState from './EmptyState'
import Loading from './Loading'
import Pagination from './Pagination'
import SearchInput from './SearchInput'
import { usePagination } from '@/hooks/usePagination'
import { useSorting } from '@/hooks/useSorting'

type DataTableProps<T extends Record<string, any>> = {
  rows: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  searchable?: boolean
  searchKeys?: (keyof T)[]
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  actions?: ReactNode
  className?: string
}

export default function DataTable<T extends Record<string, any>>({
  rows,
  columns,
  loading = false,
  searchable = true,
  searchKeys,
  pageSize = 10,
  emptyTitle = 'No records found',
  emptyDescription = 'There is nothing to show yet.',
  actions,
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const { sort, sortedItems, toggleSort } = useSorting(searchRows(rows, query, searchKeys))
  const { page, totalPages, paginatedItems, nextPage, previousPage } = usePagination(sortedItems, pageSize)

  const visibleColumns = useMemo(() => columns, [columns])

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <Loading />
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-800 bg-slate-900', className)}>
      {(searchable || actions) && (
        <div className="flex flex-col gap-4 border-b border-slate-800 p-4 md:flex-row md:items-center md:justify-between">
          {searchable ? (
            <div className="w-full md:max-w-sm">
              <SearchInput value={query} onValueChange={setQuery} />
            </div>
          ) : (
            <div />
          )}

          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}

      {paginatedItems.length === 0 ? (
        <div className="p-6">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {visibleColumns.map((column) => (
                  <th key={column.key} className={cn('px-4 py-3 font-bold', column.className)}>
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="flex items-center gap-2 hover:text-white"
                      >
                        {column.label}
                        {sort?.key === column.key && (
                          <span>{sort.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {paginatedItems.map((row, rowIndex) => (
                <tr key={(row.id as string) || rowIndex} className="hover:bg-slate-800/40">
                  {visibleColumns.map((column) => (
                    <td key={column.key} className={cn('px-4 py-3 text-slate-300', column.className)}>
                      {column.render ? column.render(row) : String(row[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPrevious={previousPage}
        onNext={nextPage}
      />
    </div>
  )
}
