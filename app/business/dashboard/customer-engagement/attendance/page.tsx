'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
}

type CheckIn = {
  id: string
  business_id: string
  customer_id: string
  checked_in_at: string
  source: string | null
  notes: string | null
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
}

type Customer = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
}

function customerName(customer: Customer | null | undefined) {
  if (!customer) return 'Customer'
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Customer'
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(value?: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function startOfWeek() {
  const date = new Date()
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function startOfMonth() {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

function statusClass(source?: string | null) {
  if (source === 'membership') return 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200'
  if (source === 'loyalty') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
  if (source === 'voucher') return 'border-amber-500/20 bg-amber-500/10 text-amber-300'
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300'
}

export default function AttendanceDashboardPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

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
      .select('id,business_name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (businessError) throw businessError

    if (ownedBusinesses?.[0]) return ownedBusinesses[0] as Business

    const { data: staffRows } = await supabase
      .from('staff_users')
      .select('business_id')
      .eq('email', user.email)
      .limit(1)

    if (staffRows?.[0]?.business_id) {
      const { data: staffBusinesses, error: staffBusinessError } = await supabase
        .from('businesses')
        .select('id,business_name')
        .eq('id', staffRows[0].business_id)
        .limit(1)

      if (staffBusinessError) throw staffBusinessError
      if (staffBusinesses?.[0]) return staffBusinesses[0] as Business
    }

    throw new Error('No business found for this user.')
  }

  async function loadData() {
    setLoading(true)
    setMessage('')

    try {
      const foundBusiness = await getBusinessForUser()
      setBusiness(foundBusiness)

      const since = startOfMonth()

      const { data: checkinsData, error: checkinsError } = await supabase
        .from('customer_checkins')
        .select('id,business_id,customer_id,checked_in_at,source,notes')
        .eq('business_id', foundBusiness.id)
        .gte('checked_in_at', since.toISOString())
        .order('checked_in_at', { ascending: false })

      if (checkinsError) throw checkinsError

      const rawCheckins = (checkinsData as CheckIn[]) || []
      const customerIds = Array.from(new Set(rawCheckins.map((item) => item.customer_id).filter(Boolean)))

      let customers: Customer[] = []

      if (customerIds.length > 0) {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id,first_name,last_name,email,phone')
          .eq('business_id', foundBusiness.id)
          .in('id', customerIds)

        if (customerError) throw customerError
        customers = (customerData as Customer[]) || []
      }

      const customerMap = new Map(customers.map((customer) => [customer.id, customer]))

      const enrichedCheckins = rawCheckins.map((checkin) => {
        const customer = customerMap.get(checkin.customer_id)

        return {
          ...checkin,
          customer_name: customerName(customer),
          customer_email: customer?.email || null,
          customer_phone: customer?.phone || null,
        }
      })

      setCheckins(enrichedCheckins)
    } catch (error: any) {
      console.error('Attendance dashboard load error:', error)
      setMessage(error?.message || 'Could not load attendance dashboard.')
    }

    setLoading(false)
  }

  const stats = useMemo(() => {
    const today = startOfToday().getTime()
    const week = startOfWeek().getTime()
    const month = startOfMonth().getTime()

    const todayCheckins = checkins.filter((item) => new Date(item.checked_in_at).getTime() >= today)
    const weekCheckins = checkins.filter((item) => new Date(item.checked_in_at).getTime() >= week)
    const monthCheckins = checkins.filter((item) => new Date(item.checked_in_at).getTime() >= month)

    return {
      today: todayCheckins.length,
      week: weekCheckins.length,
      month: monthCheckins.length,
      uniqueCustomers: new Set(monthCheckins.map((item) => item.customer_id)).size,
    }
  }, [checkins])

  const mostActiveCustomers = useMemo(() => {
    const map = new Map<string, { customerId: string; name: string; email: string | null; count: number }>()

    checkins.forEach((checkin) => {
      const current = map.get(checkin.customer_id)

      if (current) {
        current.count += 1
        return
      }

      map.set(checkin.customer_id, {
        customerId: checkin.customer_id,
        name: checkin.customer_name || 'Customer',
        email: checkin.customer_email || null,
        count: 1,
      })
    })

    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10)
  }, [checkins])

  const checkinsByDay = useMemo(() => {
    const map = new Map<string, number>()

    checkins.forEach((checkin) => {
      const key = new Date(checkin.checked_in_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      })

      map.set(key, (map.get(key) || 0) + 1)
    })

    return Array.from(map.entries()).slice(0, 14)
  }, [checkins])

  if (loading) {
    return <div className="p-8 text-white">Loading attendance...</div>
  }

  return (
    <div className="p-8 text-white">
      <section className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-slate-400">Customer Experience</p>
          <h1 className="text-4xl font-black">Attendance</h1>
          <p className="mt-3 max-w-3xl text-slate-500">
            Track customer check-ins, member attendance and visit frequency.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="rounded-2xl bg-white px-5 py-3 font-black text-slate-950"
        >
          Refresh
        </button>
      </section>

      {message && (
        <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
          {message}
        </div>
      )}

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <StatCard title="Today" value={String(stats.today)} helper="Check-ins today" />
        <StatCard title="This week" value={String(stats.week)} helper="Check-ins this week" />
        <StatCard title="This month" value={String(stats.month)} helper="Check-ins this month" />
        <StatCard title="Unique customers" value={String(stats.uniqueCustomers)} helper="Customers this month" />
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-5 text-2xl font-black">Recent check-ins</h2>

          <div className="space-y-3">
            {checkins.slice(0, 30).map((checkin) => (
              <div key={checkin.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-black">{checkin.customer_name || 'Customer'}</p>
                    <p className="mt-1 text-sm text-slate-500">{checkin.customer_email || 'No email'}</p>
                  </div>

                  <div className="md:text-right">
                    <p className="font-black text-cyan-100">{formatDateTime(checkin.checked_in_at)}</p>
                    <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(checkin.source)}`}>
                      {checkin.source || 'scan'}
                    </span>
                  </div>
                </div>

                {checkin.notes && <p className="mt-3 text-sm text-slate-500">{checkin.notes}</p>}
              </div>
            ))}

            {checkins.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-slate-500">
                No check-ins found this month.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-8">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-5 text-2xl font-black">Most active customers</h2>

            <div className="space-y-3">
              {mostActiveCustomers.map((customer, index) => (
                <div key={customer.customerId} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black">
                        #{index + 1} {customer.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{customer.email || 'No email'}</p>
                    </div>

                    <p className="text-2xl font-black text-cyan-200">{customer.count}</p>
                  </div>
                </div>
              ))}

              {mostActiveCustomers.length === 0 && (
                <p className="text-sm text-slate-500">No active customers yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-5 text-2xl font-black">Check-ins by day</h2>

            <div className="space-y-3">
              {checkinsByDay.map(([day, count]) => (
                <div key={day}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-black text-slate-300">{day}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-300"
                      style={{ width: `${Math.min(100, (count / Math.max(1, stats.month)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}

              {checkinsByDay.length === 0 && (
                <p className="text-sm text-slate-500">No check-in activity yet.</p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}

function StatCard({
  title,
  value,
  helper,
}: {
  title: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-3 text-4xl font-black">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{helper}</p>
    </div>
  )
}
