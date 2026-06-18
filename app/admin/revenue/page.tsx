'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Booking = {
  id: string
  business_id: string
  booking_date: string
  total_price: number | null
  amount_paid: number | null
  status: string | null
  businesses?: { business_name: string | null } | null
}

type Business = {
  id: string
  business_name: string
  plan: string | null
  monthly_amount: number | null
  subscription_status: string | null
  lifetime_access: boolean | null
  billing_type: string | null
}

export default function AdminRevenuePage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadRevenue()
  }, [])

  async function loadRevenue() {
    setLoading(true)

    const [bookingRes, businessRes] = await Promise.all([
      supabase.from('bookings').select('id,business_id,booking_date,total_price,amount_paid,status,businesses(business_name)').neq('status', 'cancelled'),
      supabase.from('businesses').select('id,business_name,plan,monthly_amount,subscription_status,lifetime_access,billing_type'),
    ])

    if (bookingRes.error) setMessage(bookingRes.error.message)

    setBookings((bookingRes.data as any) || [])
    setBusinesses((businessRes.data as Business[]) || [])
    setLoading(false)
  }

  const metrics = useMemo(() => {
    const today = todayISO()
    const monthStart = monthStartISO()
    const yearStart = yearStartISO()

    const value = (b: Booking) => Number(b.total_price || b.amount_paid || 0)

    const revenueToday = bookings.filter((b) => b.booking_date === today).reduce((sum, b) => sum + value(b), 0)
    const revenueMonth = bookings.filter((b) => b.booking_date >= monthStart).reduce((sum, b) => sum + value(b), 0)
    const revenueYear = bookings.filter((b) => b.booking_date >= yearStart).reduce((sum, b) => sum + value(b), 0)
    const allRevenue = bookings.reduce((sum, b) => sum + value(b), 0)

    const recurringBusinesses = businesses.filter((b) => b.subscription_status !== 'cancelled' && b.subscription_status !== 'suspended' && !b.lifetime_access)
    const mrr = recurringBusinesses.reduce((sum, b) => sum + Number(b.monthly_amount || estimatePlanAmount(b.plan)), 0)

    const averageBookingValue = bookings.length ? allRevenue / bookings.length : 0

    return {
      revenueToday,
      revenueMonth,
      revenueYear,
      allRevenue,
      mrr,
      arr: mrr * 12,
      averageBookingValue,
    }
  }, [bookings, businesses])

  const topBusinesses = useMemo(() => {
    const map: Record<string, { business: string; revenue: number; bookings: number }> = {}

    bookings.forEach((booking) => {
      const name = booking.businesses?.business_name || booking.business_id
      if (!map[booking.business_id]) map[booking.business_id] = { business: name, revenue: 0, bookings: 0 }
      map[booking.business_id].revenue += Number(booking.total_price || booking.amount_paid || 0)
      map[booking.business_id].bookings += 1
    })

    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 15)
  }, [bookings])

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">Money centre</p>
        <h1 className="mt-2 text-4xl font-black">Revenue</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Platform GMV, estimated SaaS MRR, ARR and top revenue-driving businesses.</p>
      </div>

      {message && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">{message}</div>}
      {loading && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">Loading revenue...</div>}

      {!loading && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <StatCard label="MRR" value={money(metrics.mrr)} hint="Estimated from plans/manual amounts" />
            <StatCard label="ARR" value={money(metrics.arr)} />
            <StatCard label="Revenue today" value={money(metrics.revenueToday)} />
            <StatCard label="Revenue this month" value={money(metrics.revenueMonth)} />
            <StatCard label="Revenue this year" value={money(metrics.revenueYear)} />
            <StatCard label="All booking GMV" value={money(metrics.allRevenue)} />
            <StatCard label="Average booking value" value={money(metrics.averageBookingValue)} />
            <StatCard label="Active businesses" value={businesses.filter((b) => b.subscription_status !== 'cancelled' && b.subscription_status !== 'suspended').length} />
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <h2 className="text-2xl font-black">Top businesses by booking revenue</h2>
            <div className="mt-6 space-y-3">
              {topBusinesses.map((row) => (
                <div key={row.business} className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <p className="font-black">{row.business}</p>
                  <p className="text-slate-400">{row.bookings} bookings</p>
                  <p className="font-black">{money(row.revenue)}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function estimatePlanAmount(plan?: string | null) {
  const normalised = (plan || '').toLowerCase()
  if (normalised.includes('starter')) return 29
  if (normalised.includes('growth')) return 79
  if (normalised.includes('premium')) return 149
  if (normalised.includes('enterprise')) return 299
  return 0
}


function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      {hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
    </div>
  )
}

function money(value: number) {
  return `£${Number(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function monthStartISO() {
  const date = new Date()
  date.setDate(1)
  return date.toISOString().split('T')[0]
}

function yearStartISO() {
  const date = new Date()
  date.setMonth(0, 1)
  return date.toISOString().split('T')[0]
}
