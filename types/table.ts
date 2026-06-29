import { ReactNode } from 'react'

export type SortDirection = 'asc' | 'desc'

export type SortState<T extends string = string> = {
  key: T
  direction: SortDirection
} | null

export type TableColumn<T> = {
  key: string
  label: string
  render?: (row: T) => ReactNode
  sortable?: boolean
  className?: string
}

export type FilterOption = {
  label: string
  value: string
}
