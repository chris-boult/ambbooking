'use client'

import Link from 'next/link'
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
  rating: number | null
  status: string | null
}

type Referral = {
  id: string
  business_id: string
  status: string | null
  reward_amount: number | null
}

type DocumentItem = {
  id: string
  business_id: string
  customer_id: string | null
  title: string
  file_url: string
  category: string | null
}

type Loyalty = {
  id: string
  business_id: string
  customer_id: string
  visits_required: number | null
  visits_completed: number | null
  reward_label: string | null
  status: string | null
}

function money(value: number | string | null | undefined) {
  return `£${Number(value || 0).toFixed(2)}`
}

export default function CustomerEngagementPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loyalty, setLoyalty] = useState<Loyalty[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function getBusinessForUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('You need to be logged in.')

    const { data: ownedBusiness } = await supabase
      .from('businesses')
      .select('id,business_name,slug')
      .eq('user_id', user.id)
      .maybeSingle()

    if (ownedBusiness) return ownedBusiness as Business

    const { data: firstBusiness } = await supabase
      .from('businesses')
      .select('id,business_name,slug')
      .limit(1)
      .maybeSingle()

    if (!firstBusiness) throw new Error('No business found.')

    return firstBusiness as Business
  }

  async function loadData() {
    setLoading(true)
    setMessage('')

    try {
      const foundBusiness = await getBusinessForUser()
      setBusiness(foundBusiness)

      const [reviewsResult, referralsResult, documentsResult, loyaltyResult] = await Promise.all([
        supabase
          .from('customer_reviews')
          .select('id,business_id,rating,status')
          .eq('business_id', foundBusiness.id),
        supabase
          .from('customer_referrals')
          .select('id,business_id,status,reward_amount')
          .eq('business_id', foundBusiness.id),
        supabase
          .from('customer_documents')
          .select('id,business_id,customer_id,title,file_url,category')
          .eq('business_id', foundBusiness.id),
        supabase
          .from('customer_loyalty')
          .select('id,business_id,customer_id,visits_required,visits_completed,reward_label,status')
          .eq('business_id', foundBusiness.id),
      ])

      if (reviewsResult.error || referralsResult.error || documentsResult.error || loyaltyResult.error) {
        setMessage(
          reviewsResult.error?.message ||
            referralsResult.error?.message ||
            documentsResult.error?.message ||
            loyaltyResult.error?.message ||
            'Could not load customer engagement data.'
        )
      } else {
        setReviews((reviewsResult.data as Review[]) || [])
        setReferrals((referralsResult.data as Referral[]) || [])
        setDocuments((documentsResult.data as DocumentItem[]) || [])
        setLoyalty((loyaltyResult.data as Loyalty[]) || [])
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load customer engagement centre.')
    }

    setLoading(false)
  }

  const reviewStats = useMemo(() => {
    const ratings = reviews.map((review) => Number(review.rating || 0)).filter((rating) => rating > 0)
    const averageRating =
      ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0

    return {
      averageRating,
      total: reviews.length,
      pending: reviews.filter((review) => review.status === 'draft' || review.status === 'pending').length,
      published: reviews.filter((review) => review.status === 'published' || review.status === 'submitted').length,
    }
  }, [reviews])

  const referralStats = useMemo(() => {
    return {
      total: referrals.length,
      converted: referrals.filter((referral) => referral.status === 'converted' || referral.status === 'paid').length,
      pending: referrals.filter((referral) => referral.status === 'pending').length,
      rewards: referrals
        .filter((referral) => referral.status === 'paid')
        .reduce((sum, referral) => sum + Number(referral.reward_amount || 0), 0),
    }
  }, [referrals])

  const documentStats = useMemo(() => {
    return {
      total: documents.length,
      sharedAll: documents.filter((document) => !document.customer_id).length,
      assigned: documents.filter((document) => document.customer_id).length,
      categories: new Set(documents.map((document) => document.category).filter(Boolean)).size,
    }
  }, [documents])

  const loyaltyStats = useMemo(() => {
    const active = loyalty.filter((item) => item.status === 'active')
    const earned = active.filter(
      (item) => Number(item.visits_completed || 0) >= Number(item.visits_required || 0)
    ).length
    const totalRequired = active.reduce((sum, item) => sum + Number(item.visits_required || 0), 0)
    const totalCompleted = active.reduce((sum, item) => sum + Number(item.visits_completed || 0), 0)

    return {
      active: active.length,
      earned,
      redeemed: loyalty.filter((item) => item.status === 'redeemed').length,
      completionRate: totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0,
    }
  }, [loyalty])

  if (loading) {
    return <div className="text-white">Loading customer engagement...</div>
  }

  return (
    <div>
      <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-slate-400">Customer Engagement</p>
          <h1 className="mb-2 text-4xl font-bold">Customer engagement centre</h1>
          <p className="max-w-3xl text-slate-500">
            Manage reviews, referrals, documents and loyalty from one place.
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
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
          {message}
        </div>
      )}

      <section className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard label="Average rating" value={reviewStats.averageRating ? reviewStats.averageRating.toFixed(1) : '—'} />
        <StatCard label="Referral leads" value={referralStats.total} />
        <StatCard label="Documents shared" value={documentStats.total} />
        <StatCard label="Loyalty members" value={loyaltyStats.active} />
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
        <EngagementCard
          title="Reviews"
          description="View customer feedback, approve reviews and monitor your average rating."
          href="/business/dashboard/customer-engagement/reviews"
          action="Manage reviews"
          stats={[
            ['Average rating', reviewStats.averageRating ? `${reviewStats.averageRating.toFixed(1)} / 5` : 'No ratings'],
            ['Reviews received', String(reviewStats.total)],
            ['Pending reviews', String(reviewStats.pending)],
            ['Published reviews', String(reviewStats.published)],
          ]}
        />

        <EngagementCard
          title="Referrals"
          description="Track customer referral leads, reward status and converted referrals."
          href="/business/dashboard/customer-engagement/referrals"
          action="Manage referrals"
          stats={[
            ['Referral leads', String(referralStats.total)],
            ['Converted', String(referralStats.converted)],
            ['Pending rewards', String(referralStats.pending)],
            ['Rewards paid', money(referralStats.rewards)],
          ]}
        />

        <EngagementCard
          title="Documents"
          description="Upload and share documents with individual customers or all portal users."
          href="/business/dashboard/customer-engagement/documents"
          action="Manage documents"
          stats={[
            ['Documents uploaded', String(documentStats.total)],
            ['Shared with all', String(documentStats.sharedAll)],
            ['Customer assigned', String(documentStats.assigned)],
            ['Categories', String(documentStats.categories)],
          ]}
        />

        <EngagementCard
          title="Loyalty"
          description="Manage visit-based rewards and customer loyalty wallets."
          href="/business/dashboard/customer-engagement/loyalty"
          action="Manage loyalty"
          stats={[
            ['Active members', String(loyaltyStats.active)],
            ['Rewards earned', String(loyaltyStats.earned)],
            ['Rewards redeemed', String(loyaltyStats.redeemed)],
            ['Completion rate', `${loyaltyStats.completionRate}%`],
          ]}
        />
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

function MiniStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 p-4">
      <p className="mb-1 text-sm text-slate-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

function EngagementCard({
  title,
  description,
  stats,
  href,
  action,
}: {
  title: string
  description: string
  stats: [string, string][]
  href: string
  action: string
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-2 max-w-xl text-slate-400">{description}</p>
        </div>

        <Link
          href={href}
          className="rounded-xl bg-slate-800 px-4 py-3 text-center text-sm font-bold text-white hover:bg-slate-700"
        >
          {action}
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {stats.map(([label, value]) => (
          <MiniStat key={label} label={label} value={value} />
        ))}
      </div>
    </section>
  )
}
