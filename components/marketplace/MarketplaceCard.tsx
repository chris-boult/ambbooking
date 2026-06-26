'use client'

import Link from 'next/link'
import type { MarketplaceListing } from '@/types/marketplace'

function money(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 'POA'
  return `£${Number(value || 0).toFixed(2)}`
}

export function MarketplaceCard({ listing }: { listing: MarketplaceListing }) {
  const profileUrl = `/marketplace/${listing.profile_slug || listing.slug}`
  const image = listing.hero_image_url || listing.image_url

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
      {image ? (
        <img src={image} alt={listing.title} className="h-48 w-full object-cover" />
      ) : (
        <div className="flex h-48 items-center justify-center bg-slate-800 text-slate-500">
          No image
        </div>
      )}

      <div className="p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {(listing.featured || listing.is_featured) && (
            <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-300">
              Featured
            </span>
          )}

          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-300">
            {listing.marketplace_categories?.name || listing.industry || 'Marketplace'}
          </span>
        </div>

        <h2 className="text-xl font-black text-white">{listing.businesses?.business_name || listing.title}</h2>
        <p className="mt-2 line-clamp-2 text-sm text-slate-400">
          {listing.short_description || listing.description || 'No description added yet.'}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 text-sm">
          <div>
            <p className="text-slate-500">From</p>
            <p className="font-black text-white">{money(listing.price_from)}</p>
          </div>

          <div>
            <p className="text-slate-500">Trust</p>
            <p className="font-black text-white">{listing.trust_score || 70}/100</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={profileUrl} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950">
            View Profile
          </Link>

          {listing.booking_url && (
            <Link href={listing.booking_url} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10">
              Book
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
