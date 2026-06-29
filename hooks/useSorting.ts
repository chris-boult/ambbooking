import { useMemo, useState } from 'react'
import type { SortDirection, SortState } from '@/types/table'

export function useSorting<T extends Record<string, any>>(items: T[]) {
  const [sort, setSort] = useState<SortState<string>>(null)

  function toggleSort(key: string) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  const sortedItems = useMemo(() => {
    if (!sort) return items

    return [...items].sort((a, b) => {
      const aValue = a[sort.key]
      const bValue = b[sort.key]

      if (aValue === bValue) return 0

      const directionMultiplier = sort.direction === 'asc' ? 1 : -1

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * directionMultiplier
      }

      return String(aValue).localeCompare(String(bValue)) * directionMultiplier
    })
  }, [items, sort])

  return {
    sort,
    sortedItems,
    setSort,
    toggleSort,
  }
}
