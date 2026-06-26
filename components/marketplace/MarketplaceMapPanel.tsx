'use client'

import type { MarketplaceListing } from '@/types/marketplace'

export function MarketplaceMapPanel({
  listings,
}: {
  listings: MarketplaceListing[]
}) {
  const withCoordinates = listings.filter((listing: any) => listing.latitude && listing.longitude)

  return (
    <section className="sticky top-6 min-h-[640px] rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4">
        <h2 className="text-2xl font-black text-white">Map view</h2>
        <p className="mt-1 text-sm text-slate-500">
          {withCoordinates.length} businesses ready for map placement.
        </p>
      </div>

      <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center">
        <div>
          <p className="text-xl font-black text-white">Map integration ready</p>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            This panel is prepared for Google Maps or OpenStreetMap. Coordinates are now stored on marketplace listings.
          </p>
        </div>
      </div>
    </section>
  )
}
