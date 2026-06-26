'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

const REVIEWS_FEATURE_KEY = 'reviews'
const REVIEW_MODERATION_FEATURE_KEY = 'review_moderation'
const REVIEW_EXPORT_FEATURE_KEY = 'review_export'
const REVIEW_REPORTING_FEATURE_KEY = 'review_reporting'

type Business = {
  id: string
  business_name: string | null
  slug: string | null
  plan?: string | null
  status?: string | null
  lifetime_access?: boolean | null
}

type BusinessFeature = {
  id?: string
  business_id?: string
  feature_key?: string | null
  feature?: string | null
  key?: string | null
  enabled?: boolean | null
  is_enabled?: boolean | null
  active?: boolean | null
  status?: string | null
}

type Review = {
  id: string
  business_id: string
  customer_id: string | null
  booking_id: string | null
  rating: number | null
  review_text: string | null
  status: string | null
  created_at: string | null
}

type CustomerLookup = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

type BookingLookup = {
  id: string
  booking_date: string | null
  booking_time: string | null
  service_id: string | null
}

type ServiceLookup = {
  id: string
  name: string | null
}

type ReviewWithLookups = Review & {
  customer_lookup?: CustomerLookup | null
  booking_lookup?: BookingLookup | null
  service_lookup?: ServiceLookup | null
}

type FeatureState = {
  reviews: boolean
  moderation: boolean
  exportCsv: boolean
  reporting: boolean
}

type StatusFilter = 'all' | 'submitted' | 'published' | 'rejected' | 'draft' | 'pending'

const defaultFeatureState: FeatureState = {
  reviews: false,
  moderation: false,
  exportCsv: false,
  reporting: false,
}

const planFeatures: Record<string, FeatureState> = {
  starter: {
    reviews: false,
    moderation: false,
    exportCsv: false,
    reporting: false,
  },
  growth: {
    reviews: true,
    moderation: true,
    exportCsv: false,
    reporting: false,
  },
  pro: {
    reviews: true,
    moderation: true,
    exportCsv: true,
    reporting: true,
  },
  agency: {
    reviews: true,
    moderation: true,
    exportCsv: true,
    reporting: true,
  },
  enterprise: {
    reviews: true,
    moderation: true,
    exportCsv: true,
    reporting: true,
  },
}

function formatDate(value?: string | null) {
  if (!value) return '—'

  const cleanValue = value.includes('T') ? value : `${value}T12:00:00`

  return new Date(cleanValue).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function customerName(review: ReviewWithLookups) {
  const customer = review.customer_lookup
  if (!customer) return 'Unknown customer'
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Unknown customer'
}

function serviceName(review: ReviewWithLookups) {
  return review.service_lookup?.name || 'Service'
}

function bookingDate(review: ReviewWithLookups) {
  return review.booking_lookup?.booking_date || null
}

function ratingStars(value?: number | null) {
  const rating = Math.max(0, Math.min(5, Number(value || 0)))
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

export default function ReviewsManagementPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [features, setFeatures] = useState<FeatureState>(defaultFeatureState)
  const [reviews, setReviews] = useState<ReviewWithLookups[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [savingId, setSavingId] = useState('')

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

    const { data: ownerBusinesses, error: ownerError } = await supabase
      .from('businesses')
      .select('id,business_name,slug,plan,status,lifetime_access')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!ownerError && ownerBusinesses?.[0]) return ownerBusinesses[0] as Business

    const { data: ownedBusinesses, error: businessError } = await supabase
      .from('businesses')
      .select('id,business_name,slug,plan,status,lifetime_access')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (businessError) throw businessError

    const ownedBusiness = ownedBusinesses?.[0]

    if (ownedBusiness) return ownedBusiness as Business

    const { data: staffRows, error: staffError } = await supabase
      .from('staff_users')
      .select('business_id')
      .eq('email', user.email)
      .limit(1)

    if (!staffError && staffRows?.[0]?.business_id) {
      const { data: staffBusinesses, error: staffBusinessError } = await supabase
        .from('businesses')
        .select('id,business_name,slug,plan,status,lifetime_access')
        .eq('id', staffRows[0].business_id)
        .limit(1)

      if (staffBusinessError) throw staffBusinessError

      const staffBusiness = staffBusinesses?.[0]
      if (staffBusiness) return staffBusiness as Business
    }

    throw new Error('No business found for this user.')
  }

  async function loadFeatureState(foundBusiness: Business) {
    const plan = String(foundBusiness.plan || 'starter').toLowerCase()
    const baseFeatures = foundBusiness.lifetime_access
      ? planFeatures.enterprise
      : planFeatures[plan] || defaultFeatureState

    const nextFeatures: FeatureState = {
      ...baseFeatures,
    }

    const { data } = await supabase
      .from('business_features')
      .select('*')
      .eq('business_id', foundBusiness.id)

    const rows = ((data || []) as BusinessFeature[])

    rows.forEach((row) => {
      const key = row.feature_key || row.feature || row.key || ''
      const enabled =
        row.enabled === true ||
        row.is_enabled === true ||
        row.active === true ||
        row.status === 'active' ||
        row.status === 'enabled'

      const disabled =
        row.enabled === false ||
        row.is_enabled === false ||
        row.active === false ||
        row.status === 'disabled' ||
        row.status === 'inactive'

      if (key === REVIEWS_FEATURE_KEY) {
        nextFeatures.reviews = enabled || (!disabled && nextFeatures.reviews)
      }

      if (key === REVIEW_MODERATION_FEATURE_KEY) {
        nextFeatures.moderation = enabled || (!disabled && nextFeatures.moderation)
      }

      if (key === REVIEW_EXPORT_FEATURE_KEY) {
        nextFeatures.exportCsv = enabled || (!disabled && nextFeatures.exportCsv)
      }

      if (key === REVIEW_REPORTING_FEATURE_KEY) {
        nextFeatures.reporting = enabled || (!disabled && nextFeatures.reporting)
      }
    })

    setFeatures(nextFeatures)
    return nextFeatures
  }

  async function loadData() {
    setLoading(true)
    setMessage('')

    try {
      const foundBusiness = await getBusinessForUser()
      setBusiness(foundBusiness)

      await loadFeatureState(foundBusiness)

      const { data: reviewData, error: reviewError } = await supabase
        .from('customer_reviews')
        .select('*')
        .eq('business_id', foundBusiness.id)
        .order('created_at', { ascending: false })

      if (reviewError) throw reviewError

      const baseReviews = ((reviewData as Review[]) || [])

      const customerIds = Array.from(
        new Set(baseReviews.map((review) => review.customer_id).filter(Boolean) as string[])
      )

      const bookingIds = Array.from(
        new Set(baseReviews.map((review) => review.booking_id).filter(Boolean) as string[])
      )

      let customerMap = new Map<string, CustomerLookup>()
      let bookingMap = new Map<string, BookingLookup>()
      let serviceMap = new Map<string, ServiceLookup>()

      if (customerIds.length > 0) {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id,first_name,last_name,email')
          .in('id', customerIds)

        if (customerError) throw customerError

        customerMap = new Map(
          ((customerData as CustomerLookup[]) || []).map((customer) => [customer.id, customer])
        )
      }

      if (bookingIds.length > 0) {
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('id,booking_date,booking_time,service_id')
          .in('id', bookingIds)

        if (bookingError) throw bookingError

        const bookings = (bookingData as BookingLookup[]) || []

        bookingMap = new Map(bookings.map((booking) => [booking.id, booking]))

        const serviceIds = Array.from(
          new Set(bookings.map((booking) => booking.service_id).filter(Boolean) as string[])
        )

        if (serviceIds.length > 0) {
          const { data: serviceData, error: serviceError } = await supabase
            .from('services')
            .select('id,name')
            .in('id', serviceIds)

          if (serviceError) throw serviceError

          serviceMap = new Map(
            ((serviceData as ServiceLookup[]) || []).map((service) => [service.id, service])
          )
        }
      }

      setReviews(
        baseReviews.map((review) => {
          const booking = review.booking_id ? bookingMap.get(review.booking_id) || null : null

          return {
            ...review,
            customer_lookup: review.customer_id ? customerMap.get(review.customer_id) || null : null,
            booking_lookup: booking,
            service_lookup: booking?.service_id ? serviceMap.get(booking.service_id) || null : null,
          }
        })
      )
    } catch (error: any) {
      console.error('Reviews load error:', error)
      setMessage(error?.message || error?.details || error?.hint || 'Could not load reviews.')
    }

    setLoading(false)
  }

  function requireFeature(enabled: boolean, featureName: string) {
    if (enabled) return true
    setMessage(`${featureName} is not included on this plan. Upgrade the business plan to unlock it.`)
    return false
  }

  async function updateReviewStatus(id: string, status: string) {
    setMessage('')

    if (!requireFeature(features.moderation, 'Review moderation')) return

    setSavingId(id)

    const { error } = await supabase
      .from('customer_reviews')
      .update({ status })
      .eq('id', id)
      .eq('business_id', business?.id || '')

    if (error) {
      setMessage(error.message)
      setSavingId('')
      return
    }

    setReviews((current) =>
      current.map((review) => (review.id === id ? { ...review, status } : review))
    )

    setSavingId('')
    setMessage(`Review marked as ${status}.`)
  }

  function exportCsv() {
    setMessage('')

    if (!requireFeature(features.exportCsv, 'Review CSV export')) return

    const rows = [
      ['Date', 'Customer', 'Email', 'Service', 'Booking date', 'Rating', 'Status', 'Review'],
      ...filteredReviews.map((review) => [
        formatDate(review.created_at),
        customerName(review),
        review.customer_lookup?.email || '',
        serviceName(review),
        formatDate(bookingDate(review)),
        String(review.rating || ''),
        review.status || '',
        review.review_text || '',
      ]),
    ]

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `customer-reviews-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredReviews = useMemo(() => {
    const q = search.toLowerCase().trim()

    return reviews.filter((review) => {
      const matchesStatus = statusFilter === 'all' || review.status === statusFilter
      const matchesSearch =
        !q ||
        [
          customerName(review),
          serviceName(review),
          review.review_text || '',
          review.status || '',
          String(review.rating || ''),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)

      return matchesStatus && matchesSearch
    })
  }, [reviews, search, statusFilter])

  const stats = useMemo(() => {
    const ratings = reviews.map((review) => Number(review.rating || 0)).filter((rating) => rating > 0)
    const average = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0

    return {
      average,
      total: reviews.length,
      submitted: reviews.filter((review) => review.status === 'submitted').length,
      published: reviews.filter((review) => review.status === 'published').length,
      rejected: reviews.filter((review) => review.status === 'rejected').length,
      pending: reviews.filter((review) => review.status === 'draft' || review.status === 'pending').length,
    }
  }, [reviews])

  const currentPlan = useMemo(() => {
    return String(business?.plan || 'starter').toUpperCase()
  }, [business?.plan])

  if (loading) {
    return <div className="text-white">Loading reviews...</div>
  }

  if (!features.reviews) {
    return (
      <div>
        <section className="mb-10">
          <p className="mb-2 text-slate-400">Pack 8 commercial gating</p>
          <h1 className="mb-2 text-4xl font-bold">Reviews</h1>
          <p className="max-w-3xl text-slate-500">
            Customer reviews are not included on the current {currentPlan} plan.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
            {message}
          </div>
        )}

        <LockedFeatureCard
          title="Reviews are locked"
          description="Upgrade this business to unlock customer feedback, review moderation, publishing controls, reporting and CSV export."
          feature="Reviews"
          plan={currentPlan}
        />
      </div>
    )
  }

  return (
    <div>
      <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-slate-400">Pack 8 commercial gating</p>
          <h1 className="mb-2 text-4xl font-bold">Reviews</h1>
          <p className="max-w-3xl text-slate-500">
            View customer feedback, approve published reviews and export review data.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Current plan
            </p>
            <p className="mt-1 text-xl font-black text-white">{currentPlan}</p>
          </div>

          <button
            type="button"
            onClick={exportCsv}
            disabled={!features.exportCsv}
            className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={loadData}
            className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950"
          >
            Refresh
          </button>
        </div>
      </section>

      {message && (
        <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
          {message}
        </div>
      )}

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <FeatureStatusCard
          title="Reviews"
          enabled={features.reviews}
          description="View and manage customer review records."
        />
        <FeatureStatusCard
          title="Moderation"
          enabled={features.moderation}
          description="Publish, reject and resubmit reviews."
        />
        <FeatureStatusCard
          title="Export"
          enabled={features.exportCsv}
          description="Download review data as CSV."
        />
        <FeatureStatusCard
          title="Reporting"
          enabled={features.reporting}
          description="View review performance metrics."
        />
      </section>

      {features.reporting && (
        <section className="mb-8 grid gap-6 md:grid-cols-5">
          <StatCard label="Average rating" value={stats.average ? stats.average.toFixed(1) : '—'} />
          <StatCard label="Total reviews" value={stats.total} />
          <StatCard label="Submitted" value={stats.submitted} />
          <StatCard label="Published" value={stats.published} />
          <StatCard label="Rejected" value={stats.rejected} />
        </section>
      )}

      {!features.reporting && (
        <div className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
          Review reporting is locked on this plan. Review records remain available where enabled.
        </div>
      )}

      <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reviews..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
          >
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </section>

      <section className="space-y-4">
        {filteredReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            saving={savingId === review.id}
            moderationEnabled={features.moderation}
            onPublish={() => updateReviewStatus(review.id, 'published')}
            onReject={() => updateReviewStatus(review.id, 'rejected')}
            onSubmit={() => updateReviewStatus(review.id, 'submitted')}
          />
        ))}

        {filteredReviews.length === 0 && <EmptyState message="No reviews found." />}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="mb-2 text-slate-400">{label}</p>
      <h2 className="text-3xl font-bold">{value}</h2>
    </div>
  )
}

function ReviewCard({
  review,
  saving,
  moderationEnabled,
  onPublish,
  onReject,
  onSubmit,
}: {
  review: ReviewWithLookups
  saving: boolean
  moderationEnabled: boolean
  onPublish: () => void
  onReject: () => void
  onSubmit: () => void
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold">{customerName(review)}</h2>
            <StatusPill value={review.status || 'submitted'} />
          </div>

          <p className="text-2xl font-black text-amber-300">{ratingStars(review.rating)}</p>

          <p className="mt-3 text-slate-300">
            {review.review_text || 'No review text provided.'}
          </p>

          <div className="mt-4 grid gap-3 text-sm text-slate-500 md:grid-cols-3">
            <p>Service: {serviceName(review)}</p>
            <p>Booking: {formatDate(bookingDate(review))}</p>
            <p>Submitted: {formatDate(review.created_at)}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:w-44">
          <button
            type="button"
            onClick={onPublish}
            disabled={saving || !moderationEnabled}
            className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Publish
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || !moderationEnabled}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark submitted
          </button>

          <button
            type="button"
            onClick={onReject}
            disabled={saving || !moderationEnabled}
            className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </article>
  )
}

function StatusPill({ value }: { value: string }) {
  const good = value === 'published' || value === 'submitted'
  const warning = value === 'draft' || value === 'pending'
  const bad = value === 'rejected'

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
        good
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          : warning
            ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
            : bad
              ? 'border-red-500/20 bg-red-500/10 text-red-300'
              : 'border-slate-500/20 bg-slate-500/10 text-slate-300'
      }`}
    >
      {value}
    </span>
  )
}

function FeatureStatusCard({
  title,
  enabled,
  description,
}: {
  title: string
  enabled: boolean
  description: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="font-black text-white">{title}</h3>
        <span
          className={
            enabled
              ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300'
              : 'rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-300'
          }
        >
          {enabled ? 'Unlocked' : 'Locked'}
        </span>
      </div>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  )
}

function LockedFeatureCard({
  title,
  description,
  feature,
  plan,
}: {
  title: string
  description: string
  feature: string
  plan: string
}) {
  return (
    <div className="max-w-3xl rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-amber-300">
        Upgrade required
      </p>
      <h2 className="text-3xl font-black text-white">{title}</h2>
      <p className="mt-3 text-slate-300">{description}</p>
      <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
        <p>
          <span className="font-black text-white">Feature:</span> {feature}
        </p>
        <p>
          <span className="font-black text-white">Current plan:</span> {plan}
        </p>
        <p>
          <span className="font-black text-white">Action:</span> Enable this feature from platform admin feature controls or move the business to a reviews-enabled plan.
        </p>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-8 text-center text-slate-500">
      {message}
    </div>
  )
}
