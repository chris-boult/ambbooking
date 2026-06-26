'use client'

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'

import type { BrandConfig } from './types'
import { defaultBrand } from './defaults'

const BrandContext = createContext<BrandConfig>(defaultBrand)

export function BrandProvider({
  brand,
  children,
}: {
  brand?: BrandConfig
  children: ReactNode
}) {
  const value = useMemo(
    () => brand ?? defaultBrand,
    [brand]
  )

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  return useContext(BrandContext)
}