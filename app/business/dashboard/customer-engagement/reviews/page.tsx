'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
  slug: string | null
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

type StatusFilter = 'all' | 'submitted' | 'published' | 'rejected' | 'draft' | 'pending'

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

    const { data: ownedBusinesses, error: businessError } = await supabase
      .from('businesses')
      .select('id,business_name,slug')
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
        .select('id,business_name,slug')
        .eq('id', staffRows[0].business_id)
        .limit(1)

      if (staffBusinessError) throw staffBusinessError

      const staffBusiness = staffBusinesses?.[0]
      if (staffBusiness) return staffBusiness as Business
    }

    throw new Error('No business found for this user.')
  }

  async function loadData() {
    setLoading(true)
    setMessage('')

    try {
      const foundBusiness = await getBusinessForUser()
      setBusiness(foundBusiness)

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

  async function updateReviewStatus(id: string, status: string) {
    setSavingId(id)
    setMessage('')

    const { error } = await supabase
      .from('customer_reviews')
      .update({ status })
      .eq('id', id)

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

  if (loading) {
    return <div className="text-white">Loading reviews...</div>
  }

  return (
    <div>
      <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-slate-400">Customer Engagement</p>
          <h1 className="mb-2 text-4xl font-bold">Reviews</h1>
          <p className="max-w-3xl text-slate-500">
            View customer feedback, approve published reviews and export review data.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-white hover:bg-slate-700"
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

      <section className="mb-8 grid gap-6 md:grid-cols-5">
        <StatCard label="Average rating" value={stats.average ? stats.average.toFixed(1) : '—'} />
        <StatCard label="Total reviews" value={stats.total} />
        <StatCard label="Submitted" value={stats.submitted} />
        <StatCard label="Published" value={stats.published} />
        <StatCard label="Rejected" value={stats.rejected} />
      </section>

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
  onPublish,
  onReject,
  onSubmit,
}: {
  review: ReviewWithLookups
  saving: boolean
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
            disabled={saving}
            className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            Publish
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 disabled:opacity-50"
          >
            Mark submitted
          </button>

          <button
            type="button"
            onClick={onReject}
            disabled={saving}
            className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-8 text-center text-slate-500">
      {message}
    </div>
  )
}
