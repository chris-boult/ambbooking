'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
  slug: string | null
  plan: string | null
  lifetime_access: boolean | null
  marketplace_enabled?: boolean | null
  competitor_protection?: boolean | null
  industry?: string | null
  business_description?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
}

type Category = {
  id: string
  name: string
  slug: string
}

type Listing = {
  id: string
  business_id: string
  category_id: string | null
  listing_type: string
  title: string
  slug: string
  short_description: string | null
  description: string | null
  image_url: string | null
  hero_image_url?: string | null
  tagline?: string | null
  seo_title?: string | null
  seo_description?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  tiktok_url?: string | null
  industry?: string | null
  location_city?: string | null
  location_county?: string | null
  location_postcode?: string | null
  listing_score?: number | null
  profile_views_count?: number | null
  featured?: boolean | null
  price_from: number | null
  price_label: string | null
  location_label: string | null
  website_url: string | null
  booking_url: string | null
  contact_email: string | null
  contact_phone: string | null
  is_featured: boolean
  is_active: boolean
  approval_status: string
  rejection_reason: string | null
  views_count: number
  clicks_count: number
  created_at: string | null
  marketplace_categories?: {
    name: string
  } | null
}

type FeatureState = {
  marketplace: boolean
  featuredListings: boolean
  productListings: boolean
}

const defaultFeatureState: FeatureState = {
  marketplace: false,
  featuredListings: false,
  productListings: false,
}

const MARKETPLACE_FEATURE = 'marketplace'
const FEATURED_LISTINGS_FEATURE = 'marketplace_featured_listings'
const PRODUCT_LISTINGS_FEATURE = 'marketplace_product_listings'

function normalisePlan(plan?: string | null) {
  const value = String(plan || 'starter').toLowerCase().trim()
  if (value === 'pro' || value === 'professional') return 'premium'
  return value
}

function planDefaults(business?: Business | null): FeatureState {
  if (business?.lifetime_access) {
    return { marketplace: true, featuredListings: true, productListings: true }
  }

  const plan = normalisePlan(business?.plan)

  if (plan === 'enterprise') {
    return { marketplace: true, featuredListings: true, productListings: true }
  }

  if (plan === 'premium') {
    return { marketplace: true, featuredListings: true, productListings: true }
  }

  if (plan === 'growth') {
    return { marketplace: true, featuredListings: false, productListings: false }
  }

  return defaultFeatureState
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function money(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '—'
  return `£${Number(value || 0).toFixed(2)}`
}


function calculateListingScore(input: {
  title: string
  shortDescription: string
  description: string
  imageUrl: string
  heroImageUrl: string
  categoryId: string
  locationLabel: string
  locationCity: string
  contactEmail: string
  contactPhone: string
  websiteUrl: string
}) {
  let score = 20

  if (input.title.trim()) score += 10
  if (input.shortDescription.trim()) score += 10
  if (input.description.trim()) score += 10
  if (input.imageUrl.trim()) score += 10
  if (input.heroImageUrl.trim()) score += 10
  if (input.categoryId.trim()) score += 10
  if (input.locationLabel.trim() || input.locationCity.trim()) score += 10
  if (input.contactEmail.trim() || input.contactPhone.trim() || input.websiteUrl.trim()) score += 10

  return Math.min(score, 100)
}

export default function MarketplaceManagementPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [features, setFeatures] = useState<FeatureState>(defaultFeatureState)
  const [categories, setCategories] = useState<Category[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [listingType, setListingType] = useState('service')
  const [shortDescription, setShortDescription] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [tagline, setTagline] = useState('')
  const [industry, setIndustry] = useState('')
  const [locationCity, setLocationCity] = useState('')
  const [locationCounty, setLocationCounty] = useState('')
  const [locationPostcode, setLocationPostcode] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [priceFrom, setPriceFrom] = useState('')
  const [priceLabel, setPriceLabel] = useState('')
  const [locationLabel, setLocationLabel] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function getBusinessForUser() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) throw userError
    if (!user) throw new Error('You need to be logged in.')

    const { data: ownedBusinesses, error: businessError } = await supabase
      .from('businesses')
      .select('id,business_name,slug,plan,lifetime_access,marketplace_enabled,competitor_protection,industry,business_description,email,phone,website')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (businessError) throw businessError

    const ownedBusiness = ownedBusinesses?.[0]
    if (ownedBusiness) return ownedBusiness as Business

    const { data: staffRows } = await supabase
      .from('staff_users')
      .select('business_id')
      .eq('email', user.email)
      .limit(1)

    if (staffRows?.[0]?.business_id) {
      const { data: staffBusinesses, error: staffBusinessError } = await supabase
        .from('businesses')
        .select('id,business_name,slug,plan,lifetime_access,marketplace_enabled,competitor_protection,industry,business_description,email,phone,website')
        .eq('id', staffRows[0].business_id)
        .limit(1)

      if (staffBusinessError) throw staffBusinessError

      const staffBusiness = staffBusinesses?.[0]
      if (staffBusiness) return staffBusiness as Business
    }

    throw new Error('No business found for this user.')
  }

  async function loadFeatureState(foundBusiness: Business) {
    const defaults = planDefaults(foundBusiness)

    const { data, error } = await supabase
      .from('business_features')
      .select('feature_key,is_enabled')
      .eq('business_id', foundBusiness.id)

    if (error) {
      setFeatures(defaults)
      return
    }

    const override = (key: string, fallback: boolean) => {
      const row = data?.find((item) => item.feature_key === key)
      return typeof row?.is_enabled === 'boolean' ? row.is_enabled : fallback
    }

    setFeatures({
      marketplace: override(MARKETPLACE_FEATURE, defaults.marketplace),
      featuredListings: override(FEATURED_LISTINGS_FEATURE, defaults.featuredListings),
      productListings: override(PRODUCT_LISTINGS_FEATURE, defaults.productListings),
    })
  }

  async function loadData() {
    setLoading(true)
    setMessage('')

    try {
      const foundBusiness = await getBusinessForUser()
      setBusiness(foundBusiness)
      await loadFeatureState(foundBusiness)

      const [categoriesRes, listingsRes] = await Promise.all([
        supabase
          .from('marketplace_categories')
          .select('id,name,slug')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('marketplace_listings')
          .select('*, marketplace_categories(name)')
          .eq('business_id', foundBusiness.id)
          .order('created_at', { ascending: false }),
      ])

      if (categoriesRes.error) throw categoriesRes.error
      if (listingsRes.error) throw listingsRes.error

      setCategories((categoriesRes.data as Category[]) || [])
      setListings((listingsRes.data as Listing[]) || [])
    } catch (error: any) {
      setMessage(error?.message || 'Could not load marketplace.')
    }

    setLoading(false)
  }

  async function createListing() {
    if (!business) return

    setMessage('')

    if (!features.marketplace) {
      setMessage('Marketplace is not enabled on this plan.')
      return
    }

    if (listingType === 'product' && !features.productListings) {
      setMessage('Product listings are not enabled on this plan.')
      return
    }

    if (isFeatured && !features.featuredListings) {
      setMessage('Featured listings are not enabled on this plan.')
      return
    }

    if (!title.trim()) {
      setMessage('Enter a listing title.')
      return
    }

    setSaving(true)

    const baseSlug = slugify(title)
    const finalSlug = `${baseSlug || 'listing'}-${Date.now().toString().slice(-5)}`
    const bookingUrl = business.slug ? `${window.location.origin}/book/${business.slug}` : null

    const { data, error } = await supabase
      .from('marketplace_listings')
      .insert({
        business_id: business.id,
        category_id: categoryId || null,
        listing_type: listingType,
        title: title.trim(),
        slug: finalSlug,
        short_description: shortDescription.trim() || null,
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        hero_image_url: heroImageUrl.trim() || null,
        tagline: tagline.trim() || null,
        industry: industry.trim() || business.industry || null,
        location_city: locationCity.trim() || null,
        location_county: locationCounty.trim() || null,
        location_postcode: locationPostcode.trim() || null,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        tiktok_url: tiktokUrl.trim() || null,
        search_text: [
          title.trim(),
          tagline.trim(),
          shortDescription.trim(),
          description.trim(),
          industry.trim() || business.industry || '',
          locationLabel.trim(),
          locationCity.trim(),
          locationCounty.trim(),
          locationPostcode.trim(),
        ].filter(Boolean).join(' '),
        listing_score: calculateListingScore({
          title,
          shortDescription,
          description,
          imageUrl,
          heroImageUrl,
          categoryId,
          locationLabel,
          locationCity,
          contactEmail,
          contactPhone,
          websiteUrl,
        }),
        price_from: priceFrom ? Number(priceFrom) : null,
        price_label: priceLabel.trim() || null,
        location_label: locationLabel.trim() || null,
        website_url: websiteUrl.trim() || null,
        booking_url: bookingUrl,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        is_featured: isFeatured,
        is_active: true,
        approval_status: 'pending',
      })
      .select('*, marketplace_categories(name)')
      .single()

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setListings((current) => [data as Listing, ...current])
    setTitle('')
    setCategoryId('')
    setListingType('service')
    setShortDescription('')
    setDescription('')
    setImageUrl('')
    setHeroImageUrl('')
    setTagline('')
    setIndustry('')
    setLocationCity('')
    setLocationCounty('')
    setLocationPostcode('')
    setSeoTitle('')
    setSeoDescription('')
    setInstagramUrl('')
    setFacebookUrl('')
    setTiktokUrl('')
    setPriceFrom('')
    setPriceLabel('')
    setLocationLabel('')
    setWebsiteUrl('')
    setContactEmail('')
    setContactPhone('')
    setIsFeatured(false)
    setMessage('Marketplace listing created and sent for approval.')
    setSaving(false)
  }

  async function toggleListing(listing: Listing) {
    const { error } = await supabase
      .from('marketplace_listings')
      .update({ is_active: !listing.is_active, updated_at: new Date().toISOString() })
      .eq('id', listing.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setListings((current) =>
      current.map((item) => (item.id === listing.id ? { ...item, is_active: !item.is_active } : item))
    )
  }

  async function deleteListing(listing: Listing) {
    if (!confirm('Delete this marketplace listing?')) return

    const { error } = await supabase.from('marketplace_listings').delete().eq('id', listing.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setListings((current) => current.filter((item) => item.id !== listing.id))
    setMessage('Marketplace listing deleted.')
  }

  const stats = useMemo(() => {
    return {
      total: listings.length,
      approved: listings.filter((listing) => listing.approval_status === 'approved').length,
      pending: listings.filter((listing) => listing.approval_status === 'pending').length,
      active: listings.filter((listing) => listing.is_active).length,
      profileViews: listings.reduce((sum, listing) => sum + Number(listing.profile_views_count || 0), 0),
      averageScore: listings.length
        ? Math.round(listings.reduce((sum, listing) => sum + Number(listing.listing_score || 0), 0) / listings.length)
        : 0,
    }
  }, [listings])

  if (loading) return <div className="text-white">Loading marketplace...</div>

  if (!features.marketplace) {
    return (
      <div>
        <section className="mb-10">
          <p className="mb-2 text-slate-400">Growth</p>
          <h1 className="mb-2 text-4xl font-bold">Marketplace</h1>
          <p className="max-w-3xl text-slate-500">
            Marketplace listings are locked on this plan.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
        </section>

        <LockedFeatureCard
          title="Marketplace is locked"
          text="Upgrade this business or enable Marketplace from the Master Admin Feature Manager."
        />
      </div>
    )
  }

  return (
    <div>
      <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-slate-400">Growth</p>
          <h1 className="mb-2 text-4xl font-bold">Marketplace</h1>
          <p className="max-w-3xl text-slate-500">
            Create marketplace listings so this business can appear in discovery, featured placements and future directory pages.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950"
        >
          Refresh
        </button>
      </section>

      {message && (
        <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
          {message}
        </div>
      )}

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <FeatureCard title="Marketplace" enabled={features.marketplace} />
        <FeatureCard title="Featured Listings" enabled={features.featuredListings} />
        <FeatureCard title="Product Listings" enabled={features.productListings} />
      </section>

      <section className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard label="Listings" value={stats.total} />
        <StatCard label="Approved" value={stats.approved} />
        <StatCard label="Pending" value={stats.pending} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Profile views" value={stats.profileViews} />
        <StatCard label="Avg. score" value={`${stats.averageScore}/100`} />
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-2 text-2xl font-bold">Create listing</h2>
          <p className="mb-6 text-slate-400">
            Listings are submitted for approval before they appear publicly.
          </p>

          <div className="space-y-4">
            {!features.featuredListings && (
              <LockedInline message="Featured listings are locked on this plan." />
            )}

            {!features.productListings && (
              <LockedInline message="Product listings are locked on this plan." />
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Listing title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Signature Cut & Finish"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-400">Type</span>
                <select
                  value={listingType}
                  onChange={(event) => setListingType(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
                >
                  <option value="service">Service</option>
                  <option value="product" disabled={!features.productListings}>Product</option>
                  <option value="offer">Offer</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-400">Category</span>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
                >
                  <option value="">Choose category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Short description</span>
              <input
                value={shortDescription}
                onChange={(event) => setShortDescription(event.target.value)}
                placeholder="A short summary for search cards"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the listing..."
                className="min-h-28 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Image URL</span>
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Hero image URL</span>
              <input
                value={heroImageUrl}
                onChange={(event) => setHeroImageUrl(event.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Tagline</span>
              <input
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                placeholder="A short customer-facing headline"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-400">Industry</span>
                <input
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value)}
                  placeholder={business?.industry || 'barber, gym, salon...'}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-400">City</span>
                <input
                  value={locationCity}
                  onChange={(event) => setLocationCity(event.target.value)}
                  placeholder="Milton Keynes"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-400">County</span>
                <input
                  value={locationCounty}
                  onChange={(event) => setLocationCounty(event.target.value)}
                  placeholder="Buckinghamshire"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-400">Postcode</span>
                <input
                  value={locationPostcode}
                  onChange={(event) => setLocationPostcode(event.target.value)}
                  placeholder="MK..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-400">Price from</span>
                <input
                  type="number"
                  min="0"
                  value={priceFrom}
                  onChange={(event) => setPriceFrom(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-400">Price label</span>
                <input
                  value={priceLabel}
                  onChange={(event) => setPriceLabel(event.target.value)}
                  placeholder="From, Fixed price, POA"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Location label</span>
              <input
                value={locationLabel}
                onChange={(event) => setLocationLabel(event.target.value)}
                placeholder="Milton Keynes, London, Online..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="Contact email"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />

              <input
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="Contact phone"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </div>

            <input
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="Website URL"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
            />

            <div className="grid gap-4 md:grid-cols-3">
              <input
                value={instagramUrl}
                onChange={(event) => setInstagramUrl(event.target.value)}
                placeholder="Instagram URL"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />

              <input
                value={facebookUrl}
                onChange={(event) => setFacebookUrl(event.target.value)}
                placeholder="Facebook URL"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />

              <input
                value={tiktokUrl}
                onChange={(event) => setTiktokUrl(event.target.value)}
                placeholder="TikTok URL"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={seoTitle}
                onChange={(event) => setSeoTitle(event.target.value)}
                placeholder="SEO title"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />

              <input
                value={seoDescription}
                onChange={(event) => setSeoDescription(event.target.value)}
                placeholder="SEO description"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </div>

            <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <span className="font-bold text-slate-300">Featured listing</span>
              <input
                type="checkbox"
                checked={isFeatured}
                disabled={!features.featuredListings}
                onChange={(event) => setIsFeatured(event.target.checked)}
                className="h-5 w-5 accent-white disabled:opacity-50"
              />
            </label>

            <button
              type="button"
              onClick={createListing}
              disabled={saving}
              className="w-full rounded-xl bg-white px-5 py-3 font-bold text-slate-950 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create listing'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-5 text-2xl font-bold">Listings</h2>

          <div className="space-y-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onToggle={() => toggleListing(listing)}
                onDelete={() => deleteListing(listing)}
              />
            ))}

            {listings.length === 0 && <EmptyState message="No marketplace listings yet." />}
          </div>
        </section>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="mb-2 text-slate-400">{label}</p>
      <h2 className="text-3xl font-bold">{value}</h2>
    </div>
  )
}

function FeatureCard({ title, enabled }: { title: string; enabled: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="font-bold text-white">{title}</p>
        <span className={enabled ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300' : 'rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-300'}>
          {enabled ? 'Enabled' : 'Locked'}
        </span>
      </div>
    </div>
  )
}

function ListingCard({
  listing,
  onToggle,
  onDelete,
}: {
  listing: Listing
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{listing.title}</h3>
            <StatusPill value={listing.approval_status} />
            {listing.is_featured && <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-300">Featured</span>}
            {!listing.is_active && <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs font-black text-slate-300">Inactive</span>}
          </div>

          <p className="text-sm text-slate-400">{listing.short_description || 'No short description'}</p>

          <div className="mt-4 grid gap-3 text-sm text-slate-500 md:grid-cols-3">
            <p>{listing.marketplace_categories?.name || 'No category'}</p>
            <p>{listing.price_label || 'Price'}: {money(listing.price_from)}</p>
            <p>{listing.location_city || listing.location_label || 'No location'}</p>
            <p>Score: {listing.listing_score || 0}/100</p>
            <p>Views: {listing.profile_views_count || 0}</p>
            <p>{listing.industry || 'No industry'}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:w-40">
          <a
            href={`/marketplace/${listing.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-slate-950"
          >
            Preview
          </a>

          <button
            type="button"
            onClick={onToggle}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
          >
            {listing.is_active ? 'Deactivate' : 'Activate'}
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/20"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}

function StatusPill({ value }: { value: string }) {
  const tone =
    value === 'approved'
      ? 'bg-emerald-500/10 text-emerald-300'
      : value === 'rejected'
        ? 'bg-red-500/10 text-red-300'
        : 'bg-amber-500/10 text-amber-300'

  return <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${tone}`}>{value}</span>
}

function LockedInline({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-semibold text-amber-200">
      {message}
    </div>
  )
}

function LockedFeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="max-w-3xl rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8 text-amber-100">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-amber-300">Upgrade required</p>
      <h2 className="text-3xl font-black text-white">{title}</h2>
      <p className="mt-3 text-slate-300">{text}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-8 text-center text-slate-500">
      {message}
    </div>
  )
}
