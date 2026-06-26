'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Listing = any
type GalleryItem = any
type Offer = any
type EventRow = any
type Product = any
type Review = any
type Service = any

function money(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 'POA'
  return `£${Number(value || 0).toFixed(2)}`
}

function formatDate(value?: string | null) {
  if (!value) return 'TBC'
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function MarketplaceBusinessProfilePage() {
  const params = useParams()
  const slug = String(params.slug)

  const [listing, setListing] = useState<Listing | null>(null)
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function loadProfile() {
    setLoading(true)

    const { data: listingData, error } = await supabase
      .from('marketplace_listings')
      .select('*, marketplace_categories(name,slug), businesses(*)')
      .or(`slug.eq.${slug},profile_slug.eq.${slug}`)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .limit(1)
      .maybeSingle()

    if (error || !listingData) {
      setListing(null)
      setLoading(false)
      return
    }

    setListing(listingData)

    localStorage.setItem('marketplace_context_business_id', listingData.business_id)

    await supabase
  .from('marketplace_listings')
  .update({ profile_views_count: Number(listingData.profile_views_count || 0) + 1 })
  .eq('id', listingData.id)

    const [galleryRes, offersRes, eventsRes, productsRes, reviewsRes, servicesRes] = await Promise.all([
      supabase
        .from('marketplace_gallery')
        .select('*')
        .eq('listing_id', listingData.id)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('marketplace_offers')
        .select('*')
        .eq('listing_id', listingData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('marketplace_events')
        .select('*')
        .eq('listing_id', listingData.id)
        .eq('is_active', true)
        .order('event_date', { ascending: true }),
      supabase
        .from('marketplace_products')
        .select('*')
        .eq('listing_id', listingData.id)
        .eq('is_active', true)
        .order('is_featured', { ascending: false }),
      supabase
        .from('marketplace_reviews')
        .select('*')
        .eq('listing_id', listingData.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('services')
        .select('*')
        .eq('business_id', listingData.business_id)
        .eq('is_active', true)
        .order('name'),
    ])

    setGallery(galleryRes.data || [])
    setOffers(offersRes.data || [])
    setEvents(eventsRes.data || [])
    setProducts(productsRes.data || [])
    setReviews(reviewsRes.data || [])
    setServices(servicesRes.data || [])
    setLoading(false)
  }

  async function trackClick(type: string) {
    if (!listing) return

    await supabase.from('marketplace_clicks').insert({
      listing_id: listing.id,
      business_id: listing.business_id,
      click_type: type,
      metadata: { profile: true },
    })
  }

  const averageRating = useMemo(() => {
    if (!reviews.length) return null
    const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0)
    return total / reviews.length
  }, [reviews])

  const trustScore = useMemo(() => {
    let score = 65

    if (listing?.businesses?.logo_url) score += 5
    if (listing?.hero_image_url || listing?.image_url) score += 5
    if (gallery.length >= 3) score += 5
    if (services.length > 0) score += 5
    if (reviews.length > 0) score += 5
    if ((averageRating || 0) >= 4.5) score += 5
    if (listing?.is_featured) score += 5

    return Math.min(score, 100)
  }, [listing, gallery, services, reviews, averageRating])

  if (loading) return <div className="min-h-screen bg-slate-950 p-10 text-white">Loading profile...</div>

  if (!listing) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <section className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-200">
          <h1 className="text-3xl font-black">Marketplace profile not found</h1>
          <p className="mt-3">This listing may not be live yet.</p>
          <Link href="/marketplace" className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-black text-slate-950">
            Back to Marketplace
          </Link>
        </section>
      </main>
    )
  }

  const business = listing.businesses || {}
  const heroImage = listing.hero_image_url || listing.image_url || business.hero_image_url
  const logo = business.logo_url
  const bookingUrl = listing.booking_url || (business.slug ? `/book/${business.slug}` : null)

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative">
        <div className="h-[360px] w-full bg-slate-900">
          {heroImage ? (
            <img src={heroImage} alt={listing.title} className="h-full w-full object-cover opacity-70" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-600">No hero image</div>
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 pb-8 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-5 md:flex-row md:items-end">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
                {logo ? (
                  <img src={logo} alt={business.business_name || listing.title} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-black">{String(business.business_name || listing.title).slice(0, 1)}</span>
                )}
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge label="AMB Verified" />
                  {listing.is_featured && <Badge label="Premium Partner" tone="purple" />}
                  <Badge label={listing.marketplace_categories?.name || 'Marketplace'} tone="cyan" />
                </div>

                <h1 className="text-5xl font-black">{business.business_name || listing.title}</h1>
                <p className="mt-3 max-w-3xl text-lg text-slate-300">{listing.short_description || business.business_description || listing.description}</p>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  <span>{listing.location_label || business.location || 'Location not set'}</span>
                  <span>Trust Score {trustScore}/100</span>
                  {averageRating && <span>★ {averageRating.toFixed(1)} verified rating</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {bookingUrl && (
                <Link onClick={() => trackClick('profile_booking')} href={bookingUrl} className="rounded-2xl bg-white px-5 py-4 font-black text-slate-950">
                  Book Now
                </Link>
              )}

              {listing.contact_phone && (
                <a onClick={() => trackClick('profile_call')} href={`tel:${listing.contact_phone}`} className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 font-black text-white">
                  Call
                </a>
              )}

              {listing.website_url && (
                <a onClick={() => trackClick('profile_website')} href={listing.website_url} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 font-black text-white">
                  Website
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 xl:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <Panel title="About">
            <p className="whitespace-pre-wrap text-slate-300">
              {listing.description || business.business_description || 'No profile description has been added yet.'}
            </p>
          </Panel>

          {services.length > 0 && (
            <Panel title="Services">
              <div className="grid gap-4 md:grid-cols-2">
                {services.map((service) => (
                  <div key={service.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <h3 className="text-xl font-black">{service.name}</h3>
                    <p className="mt-2 text-sm text-slate-500">{service.duration_minutes || 0} minutes</p>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <p className="text-2xl font-black">{money(service.price)}</p>
                      {bookingUrl && (
                        <Link href={bookingUrl} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950">
                          Book
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {offers.length > 0 && (
            <Panel title="Current offers">
              <div className="grid gap-4 md:grid-cols-2">
                {offers.map((offer) => (
                  <div key={offer.id} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-100">
                    <h3 className="text-xl font-black">{offer.title}</h3>
                    <p className="mt-2 text-sm">{offer.description || 'Offer details coming soon.'}</p>
                    {offer.offer_code && <p className="mt-4 font-mono text-lg font-black">{offer.offer_code}</p>}
                    {offer.ends_at && <p className="mt-3 text-xs uppercase tracking-wide">Ends {formatDate(offer.ends_at)}</p>}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {products.length > 0 && (
            <Panel title="Products">
              <div className="grid gap-4 md:grid-cols-3">
                {products.map((product) => (
                  <div key={product.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="h-40 w-full object-cover" />
                    ) : (
                      <div className="flex h-40 items-center justify-center bg-slate-900 text-slate-600">No image</div>
                    )}
                    <div className="p-5">
                      <h3 className="font-black">{product.name}</h3>
                      <p className="mt-2 text-sm text-slate-500">{product.description || 'No description.'}</p>
                      <p className="mt-4 text-xl font-black">{money(product.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {events.length > 0 && (
            <Panel title="Upcoming events">
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <h3 className="text-xl font-black">{event.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">{event.description || 'Event details coming soon.'}</p>
                    <p className="mt-4 text-sm font-bold text-cyan-300">
                      {formatDate(event.event_date)} {event.event_time ? `· ${String(event.event_time).slice(0, 5)}` : ''}
                    </p>
                    {event.location_label && <p className="mt-1 text-sm text-slate-500">{event.location_label}</p>}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {gallery.length > 0 && (
            <Panel title="Gallery">
              <div className="grid gap-4 md:grid-cols-3">
                {gallery.map((item) => (
                  <figure key={item.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                    <img src={item.image_url} alt={item.caption || 'Gallery image'} className="h-56 w-full object-cover" />
                    {item.caption && <figcaption className="p-3 text-sm text-slate-400">{item.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Verified reviews">
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xl font-black">{'★'.repeat(Number(review.rating || 0))}</p>
                      {review.is_verified && <Badge label="Verified booking" tone="green" />}
                    </div>
                    {review.title && <h3 className="font-black">{review.title}</h3>}
                    {review.body && <p className="mt-2 text-slate-400">{review.body}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No public reviews yet.</p>
            )}
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Trust summary">
            <div className="text-center">
              <p className="text-6xl font-black text-emerald-300">{trustScore}</p>
              <p className="mt-2 text-sm font-black uppercase tracking-wide text-slate-500">Trust Score</p>
            </div>

            <div className="mt-6 space-y-3">
              <TrustRow label="AMB Verified" enabled />
              <TrustRow label="Completed bookings" enabled={services.length > 0} />
              <TrustRow label="Verified reviews" enabled={reviews.length > 0} />
              <TrustRow label="Profile complete" enabled={Boolean(listing.description && (heroImage || logo))} />
              <TrustRow label="Active marketplace profile" enabled />
            </div>
          </Panel>

          <Panel title="Contact">
            <div className="space-y-3">
              <Detail label="Location" value={listing.location_label || business.location || 'Not set'} />
              <Detail label="Email" value={listing.contact_email || business.email || 'Not set'} />
              <Detail label="Phone" value={listing.contact_phone || business.phone || 'Not set'} />
              <Detail label="Website" value={listing.website_url || business.website || 'Not set'} />
            </div>
          </Panel>

          <Panel title="Marketplace">
            <Link href="/marketplace" className="block rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-center font-black text-white">
              Back to Marketplace
            </Link>
          </Panel>
        </aside>
      </section>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-5 text-2xl font-black">{title}</h2>
      {children}
    </section>
  )
}

function Badge({ label, tone = 'blue' }: { label: string; tone?: 'blue' | 'purple' | 'cyan' | 'green' }) {
  const classes = {
    blue: 'bg-blue-500/10 text-blue-300',
    purple: 'bg-violet-500/10 text-violet-300',
    cyan: 'bg-cyan-500/10 text-cyan-300',
    green: 'bg-emerald-500/10 text-emerald-300',
  }

  return <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${classes[tone]}`}>{label}</span>
}

function TrustRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <span className="font-bold text-slate-300">{label}</span>
      <span className={enabled ? 'text-emerald-300' : 'text-slate-600'}>{enabled ? 'Yes' : 'No'}</span>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-800 py-3 last:border-0">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 break-words text-slate-200">{value}</p>
    </div>
  )
}
