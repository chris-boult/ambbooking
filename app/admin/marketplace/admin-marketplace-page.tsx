'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Listing = any
type Category = any

function money(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 'POA'
  return `£${Number(value || 0).toFixed(2)}`
}

export default function MarketplacePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  useEffect(() => { loadMarketplace() }, [])

  async function getContextBusiness() {
    if (typeof window === 'undefined') return null
    const businessId = localStorage.getItem('marketplace_context_business_id')
    if (!businessId) return null

    const { data } = await supabase
      .from('businesses')
      .select('id,business_name,industry,competitor_protection')
      .eq('id', businessId)
      .maybeSingle()

    return data
  }

  async function loadMarketplace() {
    setLoading(true)

    const [categoryRes, settingRes, contextBusiness] = await Promise.all([
      supabase.from('marketplace_categories').select('id,name,slug').eq('is_active', true).order('sort_order'),
      supabase.from('platform_marketplace_settings').select('*').limit(1).maybeSingle(),
      getContextBusiness(),
    ])

    const settings = settingRes.data
    const blockedIndustries: string[] = []

    if (
      settings?.competitor_protection_enabled !== false &&
      settings?.allow_open_marketplace !== true &&
      contextBusiness?.competitor_protection !== false &&
      contextBusiness?.industry
    ) {
      const { data: rules } = await supabase
        .from('marketplace_industry_rules')
        .select('related_industry')
        .eq('primary_industry', contextBusiness.industry)
        .eq('relationship_type', 'competitor')

      blockedIndustries.push(...((rules || []).map((rule: any) => rule.related_industry)))
    }

    let query = supabase
      .from('marketplace_listings')
      .select('*, marketplace_categories(name,slug), businesses(business_name,slug,logo_url,industry,marketplace_enabled)')
      .eq('is_active', true)
      .eq('approval_status', 'approved')

    if (blockedIndustries.length > 0) {
      query = query.not('industry', 'in', `(${blockedIndustries.map((item) => `"${item}"`).join(',')})`)
    }

    const listingRes = await query.order('is_featured', { ascending: false }).order('created_at', { ascending: false })

    setCategories(categoryRes.data || [])
    setListings(((listingRes.data || []) as Listing[]).filter((listing) => listing.businesses?.marketplace_enabled !== false))
    setLoading(false)
  }

  async function trackClick(listing: Listing, clickType: string) {
    await supabase.from('marketplace_clicks').insert({
      listing_id: listing.id,
      business_id: listing.business_id,
      click_type: clickType,
      metadata: {},
    })
  }

  const filteredListings = useMemo(() => {
    const q = search.toLowerCase().trim()
    return listings.filter((listing) => {
      const matchesCategory = category === 'all' || listing.marketplace_categories?.slug === category
      const matchesSearch = !q || [listing.title, listing.short_description || '', listing.description || '', listing.location_label || '', listing.businesses?.business_name || '', listing.marketplace_categories?.name || ''].join(' ').toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [listings, search, category])

  if (loading) return <div className="p-10 text-white">Loading marketplace...</div>

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-cyan-300">Marketplace</p>
          <h1 className="text-5xl font-black">Find trusted local services</h1>
          <p className="mt-4 max-w-3xl text-slate-400">Discover approved businesses, services, offers and products listed through AMB Booking.</p>
        </div>

        <section className="mb-8 grid gap-4 lg:grid-cols-[1fr_260px]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search marketplace..." className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none placeholder:text-slate-600" />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none">
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
          </select>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredListings.map((listing) => (
            <article key={listing.id} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
              {listing.image_url ? <img src={listing.image_url} alt={listing.title} className="h-52 w-full object-cover" /> : <div className="flex h-52 items-center justify-center bg-slate-800 text-slate-500">No image</div>}
              <div className="p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {listing.is_featured && <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-300">Featured</span>}
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-300">{listing.marketplace_categories?.name || 'Marketplace'}</span>
                </div>
                <h2 className="text-2xl font-black">{listing.title}</h2>
                <p className="mt-2 text-sm font-bold text-slate-400">{listing.businesses?.business_name || 'Business'}</p>
                <p className="mt-3 text-slate-400">{listing.short_description || 'No description provided.'}</p>
                <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-800 pt-5">
                  <div><p className="text-sm text-slate-500">{listing.price_label || 'Price from'}</p><p className="text-xl font-black">{money(listing.price_from)}</p></div>
                  <p className="text-sm text-slate-500">{listing.location_label || 'Online / local'}</p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {listing.booking_url && <Link href={listing.booking_url} onClick={() => trackClick(listing, 'booking')} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950">Book</Link>}
                  {listing.website_url && <a href={listing.website_url} target="_blank" rel="noreferrer" onClick={() => trackClick(listing, 'website')} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10">Website</a>}
                </div>
              </div>
            </article>
          ))}
          {filteredListings.length === 0 && <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900 p-10 text-center text-slate-500 md:col-span-2 xl:col-span-3">No marketplace listings found.</div>}
        </section>
      </section>
    </main>
  )
}
