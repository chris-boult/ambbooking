import { useMemo, useState } from 'react'

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  function nextPage() {
    setPage((current) => Math.min(totalPages, current + 1))
  }

  function previousPage() {
    setPage((current) => Math.max(1, current - 1))
  }

  return {
    page,
    pageSize,
    totalPages,
    paginatedItems,
    setPage,
    nextPage,
    previousPage,
  }
}
