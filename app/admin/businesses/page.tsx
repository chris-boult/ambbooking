'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string
  slug: string | null
  owner_first_name: string | null
  owner_last_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  is_internal: boolean | null
  custom_domain: string | null
  billing_type: string | null
  monthly_amount: number | null
  lifetime_access: boolean | null
  created_at: string
  status: string | null
}

type Booking = {
  business_id: string
  total_price: number | null
  amount_paid: number | null
  status: string | null
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSearch(params.get('search') || '')
    loadBusinesses()
  }, [])

  async function loadBusinesses() {
    setLoading(true)
    setMessage('')

    const [businessRes, bookingRes] = await Promise.all([
      supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('bookings')
        .select('business_id,total_price,amount_paid,status')
        .neq('status', 'cancelled'),
    ])

    if (businessRes.error) {
      setMessage(businessRes.error.message)
    }

    setBusinesses((businessRes.data as Business[]) || [])
    setBookings((bookingRes.data as Booking[]) || [])
    setLoading(false)
  }

  async function updateBusiness(
    id: string,
    patch: Partial<Business>,
    auditAction: string
  ) {
    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('businesses')
      .update(patch)
      .eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase.from('audit_logs').insert({
      actor_email: userData.user?.email || 'unknown',
      action: auditAction,
      entity_type: 'business',
      entity_id: id,
      metadata: patch,
    })

    setMessage('Business updated.')
    await loadBusinesses()
  }

  async function impersonateBusiness(business: Business) {
    const reason = window.prompt(
      `Reason for impersonating ${business.business_name}?`
    )

    if (!reason) return

    const { data: userData } = await supabase.auth.getUser()

    await supabase.from('impersonation_logs').insert({
      admin_email: userData.user?.email || 'unknown',
      business_id: business.id,
      reason,
    })

    await supabase.from('audit_logs').insert({
      actor_email: userData.user?.email || 'unknown',
      action: 'impersonation_started',
      entity_type: 'business',
      entity_id: business.id,
      metadata: { reason },
    })

    localStorage.setItem('admin_impersonating_business_id', business.id)
    localStorage.setItem(
      'admin_impersonating_business_name',
      business.business_name
    )

    setMessage(
      `Impersonation logged for ${business.business_name}. True session switching comes in the secure impersonation pass.`
    )
  }

  const revenueByBusiness = useMemo(() => {
    const map: Record<string, number> = {}

    bookings.forEach((booking) => {
      map[booking.business_id] =
        (map[booking.business_id] || 0) +
        Number(booking.total_price || booking.amount_paid || 0)
    })

    return map
  }, [bookings])

  const filteredBusinesses = useMemo(() => {
    const q = search.toLowerCase().trim()

    if (!q) return businesses

    return businesses.filter((business) => {
      return (
        business.business_name?.toLowerCase().includes(q) ||
        business.email?.toLowerCase().includes(q) ||
        business.phone?.toLowerCase().includes(q) ||
        business.slug?.toLowerCase().includes(q) ||
        business.custom_domain?.toLowerCase().includes(q) ||
        business.owner_first_name?.toLowerCase().includes(q) ||
        business.owner_last_name?.toLowerCase().includes(q)
      )
    })
  }, [businesses, search])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">
            Tenant explorer
          </p>

          <h1 className="mt-2 text-4xl font-black">Businesses</h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Search, control, suspend, impersonate and manually manage every
            business on the platform.
          </p>
        </div>

        <Link
          href="/admin/businesses/create"
          className="rounded-2xl bg-white px-5 py-4 font-black text-slate-950"
        >
          Create business
        </Link>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search business, owner, email, phone, slug or domain..."
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
      />

      {message && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
          {message}
        </div>
      )}

      {loading && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          Loading businesses...
        </div>
      )}

      {!loading && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <StatCard label="Businesses" value={businesses.length} />

            <StatCard
              label="Active"
              value={
                businesses.filter(
                  (business) =>
                    (business.status || business.subscription_status) !==
                    'suspended'
                ).length
              }
            />

            <StatCard
              label="Internal"
              value={businesses.filter((business) => business.is_internal).length}
            />

            <StatCard label="Shown" value={filteredBusinesses.length} />
          </section>

          <section className="space-y-4">
            {filteredBusinesses.map((business) => {
              const owner =
                [business.owner_first_name, business.owner_last_name]
                  .filter(Boolean)
                  .join(' ') || 'No owner name'

              const suspended =
                (business.status || business.subscription_status) ===
                'suspended'

              return (
                <div
                  key={business.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
                >
                  <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          href={`/admin/businesses/${business.id}`}
                          className="text-2xl font-black hover:text-blue-300"
                        >
                          {business.business_name}
                        </Link>

                        <Badge
                          label={
                            suspended
                              ? 'Suspended'
                              : business.subscription_status || 'No status'
                          }
                          tone={suspended ? 'red' : 'green'}
                        />

                        {business.is_internal && (
                          <Badge label="Internal" tone="blue" />
                        )}

                        {business.lifetime_access && (
                          <Badge label="Lifetime" tone="purple" />
                        )}
                      </div>

                      <p className="mt-2 text-slate-400">
                        {owner} · {business.email || 'No email'} ·{' '}
                        {business.phone || 'No phone'}
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        Plan: {business.plan || 'None'} · Billing:{' '}
                        {business.billing_type || 'stripe'} · Revenue:{' '}
                        {money(revenueByBusiness[business.id] || 0)}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Slug: {business.slug || 'none'} · Domain:{' '}
                        {business.custom_domain || 'none'} · Created{' '}
                        {new Date(business.created_at).toLocaleDateString(
                          'en-GB'
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/businesses/${business.id}`}
                        className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950"
                      >
                        Open
                      </Link>

                      <button
                        type="button"
                        onClick={() => impersonateBusiness(business)}
                        className="rounded-xl bg-blue-500/15 px-4 py-2 text-sm font-bold text-blue-300 hover:bg-blue-500/25"
                      >
                        Impersonate
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateBusiness(
                            business.id,
                            { is_internal: !business.is_internal },
                            'business_internal_toggled'
                          )
                        }
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
                      >
                        {business.is_internal
                          ? 'Remove internal'
                          : 'Mark internal'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateBusiness(
                            business.id,
                            {
                              lifetime_access: !business.lifetime_access,
                              billing_type: !business.lifetime_access
                                ? 'lifetime'
                                : 'stripe',
                            },
                            'business_lifetime_toggled'
                          )
                        }
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
                      >
                        {business.lifetime_access
                          ? 'Remove lifetime'
                          : 'Lifetime'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateBusiness(
                            business.id,
                            suspended
                              ? ({
                                  status: 'active',
                                  subscription_status: 'active',
                                  suspended_at: null,
                                  suspended_reason: null,
                                } as any)
                              : ({
                                  status: 'suspended',
                                  subscription_status: 'suspended',
                                  suspended_at: new Date().toISOString(),
                                  suspended_reason:
                                    'Suspended by master admin',
                                } as any),
                            suspended
                              ? 'business_unsuspended'
                              : 'business_suspended'
                          )
                        }
                        className={`rounded-xl px-4 py-2 text-sm font-bold ${
                          suspended
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-red-500/15 text-red-300'
                        }`}
                      >
                        {suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {filteredBusinesses.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-500">
                No businesses found.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function Badge({
  label,
  tone,
}: {
  label: string
  tone: 'green' | 'red' | 'blue' | 'purple'
}) {
  const classes = {
    green: 'bg-emerald-500/10 text-emerald-300',
    red: 'bg-red-500/10 text-red-300',
    blue: 'bg-blue-500/10 text-blue-300',
    purple: 'bg-violet-500/10 text-violet-300',
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-bold ${classes[tone]}`}
    >
      {label}
    </span>
  )
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  )
}

function money(value: number) {
  return `£${Number(value || 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}