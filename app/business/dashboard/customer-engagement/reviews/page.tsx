'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Download,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  StarHalf,
  XCircle,
} from 'lucide-react'
import DashboardPage from '@/components/dashboard/DashboardPage'
import DashboardHero from '@/components/dashboard/DashboardHero'
import DashboardGrid from '@/components/dashboard/DashboardGrid'
import DashboardStatCard from '@/components/dashboard/StatCard'
import SectionCard from '@/components/dashboard/SectionCard'

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
    return (
      <DashboardPage className="flex min-h-[55vh] items-center justify-center">
        <div className="rounded-[2rem] border border-white/10 bg-[#07111f] px-8 py-6 font-black text-slate-200 shadow-[0_50px_180px_rgba(0,0,0,.55)]">
          Loading reviews...
        </div>
      </DashboardPage>
    )
  }

  if (!features.reviews) {
    return (
      <DashboardPage>
        <DashboardHero
          eyebrow="Reviews"
          title="Reviews are locked."
          description={`Customer reviews are not included on the current ${currentPlan} plan.${business?.business_name ? ` Connected to ${business.business_name}.` : ''}`}
        />

        {message && (
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-100">
            {message}
          </div>
        )}

        <LockedFeatureCard
          title="Reviews are locked"
          description="Upgrade this business to unlock customer feedback, review moderation, publishing controls, reporting and CSV export."
          feature="Reviews"
          plan={currentPlan}
        />
      </DashboardPage>
    )
  }

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Reviews"
        title="Reviews."
        description={`View customer feedback, approve published reviews and export review data.${business?.business_name ? ` Connected to ${business.business_name}.` : ''}`}
        actions={
          <>
            <ActionButton
              onClick={exportCsv}
              disabled={!features.exportCsv}
              icon={<Download size={17} />}
            >
              Export CSV
            </ActionButton>

            <ActionButton
              onClick={loadData}
              variant="primary"
              icon={<RefreshCw size={17} />}
            >
              Refresh
            </ActionButton>
          </>
        }
      />

      {message && (
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-100">
          {message}
        </div>
      )}

      <DashboardGrid columns={4}>
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
      </DashboardGrid>

      {features.reporting ? (
        <DashboardGrid columns={4}>
          <DashboardStatCard label="Average rating" value={stats.average ? stats.average.toFixed(1) : '—'} icon={<Star size={22} />} colour="amber" />
          <DashboardStatCard label="Total reviews" value={stats.total} icon={<ShieldCheck size={22} />} />
          <DashboardStatCard label="Submitted" value={stats.submitted} icon={<StarHalf size={22} />} colour="cyan" />
          <DashboardStatCard label="Published" value={stats.published} icon={<Star size={22} />} colour="emerald" />
          <DashboardStatCard label="Rejected" value={stats.rejected} icon={<XCircle size={22} />} colour="rose" />
        </DashboardGrid>
      ) : (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-bold text-amber-200">
          Review reporting is locked on this plan. Review records remain available where enabled.
        </div>
      )}

      <SectionCard>
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.03em] text-white">
                Review inbox
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Search, moderate and export customer feedback.
              </p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reviews..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950 py-4 pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300 lg:w-96"
              />
            </div>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {[
              ['all', 'All'],
              ['submitted', 'Submitted'],
              ['published', 'Published'],
              ['pending', 'Pending'],
              ['draft', 'Draft'],
              ['rejected', 'Rejected'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key as StatusFilter)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${
                  statusFilter === key
                    ? 'border-cyan-300/30 bg-cyan-400/15 text-cyan-100'
                    : 'border-white/10 bg-white/[0.04] text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <section className="grid gap-4 xl:grid-cols-2">
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
      </SectionCard>
    </DashboardPage>
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
    <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 shadow-[0_30px_100px_rgba(0,0,0,.35)]">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black tracking-[-0.03em] text-white">
              {customerName(review)}
            </h2>
            <p className="mt-2 text-2xl font-black text-amber-300">
              {ratingStars(review.rating)}
            </p>
          </div>

          <StatusPill value={review.status || 'submitted'} />
        </div>

        <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-300">
          {review.review_text || 'No review text provided.'}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InfoTile label="Service" value={serviceName(review)} />
          <InfoTile label="Booking" value={formatDate(bookingDate(review))} />
          <InfoTile label="Submitted" value={formatDate(review.created_at)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 border-t border-white/10 bg-white/[0.025] p-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onPublish}
          disabled={saving || !moderationEnabled}
          className="rounded-2xl bg-emerald-400/10 px-3 py-3 text-xs font-black text-emerald-200 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Publish
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || !moderationEnabled}
          className="rounded-2xl bg-cyan-400/10 px-3 py-3 text-xs font-black text-cyan-200 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Mark submitted
        </button>

        <button
          type="button"
          onClick={onReject}
          disabled={saving || !moderationEnabled}
          className="rounded-2xl bg-rose-400/10 px-3 py-3 text-xs font-black text-rose-200 hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reject
        </button>
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
              : 'border-white/10 bg-white/[0.06] text-slate-300'
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
    <div className="rounded-[2rem] border border-white/10 bg-[#07111f] p-5 shadow-[0_35px_120px_rgba(0,0,0,.32)]">
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
      <p className="text-sm leading-6 text-slate-400">{description}</p>
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
    <div className="max-w-3xl rounded-[2rem] border border-amber-500/20 bg-amber-500/10 p-8">
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
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
      <p className="text-lg font-black text-white">{message}</p>
      <p className="mt-2 text-sm text-slate-500">Try another filter or search term.</p>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  variant = 'default',
  icon,
  disabled = false,
}: {
  children: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'primary'
  icon?: React.ReactNode
  disabled?: boolean
}) {
  const styles = {
    default: 'border-white/10 bg-white/[0.045] text-white hover:bg-white/[0.09]',
    primary: 'border-cyan-400/20 bg-cyan-400 text-slate-950 hover:bg-cyan-300',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
    >
      {icon}
      {children}
    </button>
  )
}
