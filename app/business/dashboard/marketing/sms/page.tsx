'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
  slug: string | null
}

type Customer = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  vip: boolean | null
  marketing_opt_in: boolean | null
  sms_reminders: boolean | null
  tags: string[] | string | null
  archived: boolean | null
}

type Membership = {
  customer_id: string | null
  status: string | null
}

type Loyalty = {
  customer_id: string | null
  status: string | null
}

type SmsLog = {
  id: string
  business_id: string
  customer_id: string | null
  booking_id: string | null
  phone: string | null
  message: string | null
  status: string | null
  event_type: string | null
  provider_message_id: string | null
  error_message: string | null
  created_at: string | null
}

type SmsSettings = {
  id: string
  business_id: string
  is_enabled: boolean | null
  account_sid: string | null
  auth_token: string | null
  from_number: string | null
}

type AudienceType =
  | 'marketing_opt_in'
  | 'all'
  | 'vip'
  | 'memberships'
  | 'loyalty'
  | 'sms_reminders'
  | 'tagged'

function customerName(customer: Customer) {
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || customer.phone || 'Customer'
}

function normaliseTags(value: Customer['tags']) {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String)
  return String(value)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SmsCampaignsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loyalty, setLoyalty] = useState<Loyalty[]>([])
  const [logs, setLogs] = useState<SmsLog[]>([])
  const [smsSettings, setSmsSettings] = useState<SmsSettings | null>(null)

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  const [campaignName, setCampaignName] = useState('')
  const [audienceType, setAudienceType] = useState<AudienceType>('marketing_opt_in')
  const [tagFilter, setTagFilter] = useState('')
  const [campaignMessage, setCampaignMessage] = useState('')

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

    const { data: staffRows } = await supabase
      .from('staff_users')
      .select('business_id')
      .eq('email', user.email)
      .limit(1)

    if (staffRows?.[0]?.business_id) {
      const { data: staffBusinesses, error: staffBusinessError } = await supabase
        .from('businesses')
        .select('id,business_name,slug')
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

      const [customerResult, smsSettingsResult, membershipResult, loyaltyResult, logsResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id,first_name,last_name,email,phone,vip,marketing_opt_in,sms_reminders,tags,archived')
          .eq('business_id', foundBusiness.id)
          .or('archived.is.null,archived.eq.false')
          .order('first_name', { ascending: true }),
        supabase
          .from('sms_settings')
          .select('*')
          .eq('business_id', foundBusiness.id)
          .maybeSingle(),
        supabase
          .from('customer_memberships')
          .select('customer_id,status')
          .eq('business_id', foundBusiness.id)
          .eq('status', 'active'),
        supabase
          .from('customer_loyalty')
          .select('customer_id,status')
          .eq('business_id', foundBusiness.id)
          .in('status', ['active', 'earned']),
        supabase
          .from('sms_logs')
          .select('*')
          .eq('business_id', foundBusiness.id)
          .eq('event_type', 'campaign')
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      if (customerResult.error) throw customerResult.error
      if (smsSettingsResult.error) throw smsSettingsResult.error
      if (membershipResult.error) throw membershipResult.error
      if (loyaltyResult.error) throw loyaltyResult.error
      if (logsResult.error) throw logsResult.error

      setCustomers((customerResult.data as Customer[]) || [])
      setSmsSettings((smsSettingsResult.data as SmsSettings) || null)
      setMemberships((membershipResult.data as Membership[]) || [])
      setLoyalty((loyaltyResult.data as Loyalty[]) || [])
      setLogs((logsResult.data as SmsLog[]) || [])
    } catch (error: any) {
      console.error('SMS campaigns load error:', error)
      setMessage(error?.message || 'Could not load SMS campaigns.')
    }

    setLoading(false)
  }

  function getAudienceCustomers() {
    const membershipCustomerIds = new Set(memberships.map((item) => item.customer_id).filter(Boolean))
    const loyaltyCustomerIds = new Set(loyalty.map((item) => item.customer_id).filter(Boolean))
    const tag = tagFilter.trim().toLowerCase()

    return customers.filter((customer) => {
      if (!customer.phone) return false

      if (audienceType === 'all') return true
      if (audienceType === 'marketing_opt_in') return Boolean(customer.marketing_opt_in)
      if (audienceType === 'vip') return Boolean(customer.vip)
      if (audienceType === 'memberships') return membershipCustomerIds.has(customer.id)
      if (audienceType === 'loyalty') return loyaltyCustomerIds.has(customer.id)
      if (audienceType === 'sms_reminders') return Boolean(customer.sms_reminders)

      if (audienceType === 'tagged') {
        if (!tag) return false
        return normaliseTags(customer.tags).some((customerTag) => customerTag.toLowerCase() === tag)
      }

      return false
    })
  }

  async function sendCampaignNow() {
    if (!business) return

    setMessage('')

    if (!smsSettings?.is_enabled) {
      setMessage('SMS is not enabled. Configure SMS in Settings > Messaging first.')
      return
    }

    if (!campaignName.trim()) {
      setMessage('Enter a campaign name.')
      return
    }

    if (!campaignMessage.trim()) {
      setMessage('Enter a message.')
      return
    }

    const audience = getAudienceCustomers()

    if (audience.length === 0) {
      setMessage('This audience has no customers with phone numbers.')
      return
    }

    const confirmed = window.confirm(`Send this SMS campaign to ${audience.length} customers?`)
    if (!confirmed) return

    setSending(true)
    setMessage('Sending SMS campaign...')

    const response = await fetch('/api/marketing/send-sms-campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: business.id,
        campaignName: campaignName.trim(),
        audienceType: audienceType === 'tagged' ? `tagged:${tagFilter.trim()}` : audienceType,
        message: campaignMessage.trim(),
        recipients: audience.map((customer) => ({
          customerId: customer.id,
          phone: customer.phone,
          firstName: customer.first_name,
          lastName: customer.last_name,
        })),
      }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setMessage(result?.error || 'Could not send campaign.')
      setSending(false)
      await loadData()
      return
    }

    setMessage(`Campaign sent. ${result?.sent || 0} sent, ${result?.failed || 0} failed.`)
    setCampaignName('')
    setCampaignMessage('')
    setSending(false)
    await loadData()
  }

  const audienceCustomers = getAudienceCustomers()

  const stats = useMemo(() => {
    return {
      logs: logs.length,
      sent: logs.filter((log) => log.status === 'sent' || log.status === 'delivered').length,
      failed: logs.filter((log) => log.status === 'failed').length,
      uniqueRecipients: new Set(logs.map((log) => log.customer_id || log.phone).filter(Boolean)).size,
    }
  }, [logs])

  if (loading) {
    return <div className="text-white">Loading SMS campaigns...</div>
  }

  return (
    <div>
      <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-slate-400">Marketing</p>
          <h1 className="mb-2 text-4xl font-bold">SMS Campaigns</h1>
          <p className="max-w-3xl text-slate-500">
            Send targeted SMS campaigns using customer, VIP, membership, loyalty and tag data.
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

      <section className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard label="Campaign messages" value={stats.logs} />
        <StatCard label="Sent" value={stats.sent} />
        <StatCard label="Failed" value={stats.failed} />
        <StatCard label="Recipients reached" value={stats.uniqueRecipients} />
      </section>

      <section className="mb-8 grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-2 text-2xl font-bold">Create campaign</h2>
          <p className="mb-6 text-slate-400">
            Promotional SMS should normally go to customers who have opted in to marketing.
          </p>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Campaign name</span>
              <input
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                placeholder="June rebooking offer"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Audience</span>
              <select
                value={audienceType}
                onChange={(event) => setAudienceType(event.target.value as AudienceType)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                <option value="marketing_opt_in">Marketing opt-in customers</option>
                <option value="all">All customers with phone numbers</option>
                <option value="vip">VIP customers</option>
                <option value="memberships">Active membership customers</option>
                <option value="loyalty">Active loyalty customers</option>
                <option value="sms_reminders">SMS reminder customers</option>
                <option value="tagged">Customers by tag</option>
              </select>
            </label>

            {audienceType === 'tagged' && (
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-400">Tag</span>
                <input
                  value={tagFilter}
                  onChange={(event) => setTagFilter(event.target.value)}
                  placeholder="VIP, beard, colour, etc"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
                />
              </label>
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-bold text-slate-300">
                Estimated recipients: {audienceCustomers.length}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                SMS enabled: {smsSettings?.is_enabled ? 'Yes' : 'No'}
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Message</span>
              <textarea
                value={campaignMessage}
                onChange={(event) => setCampaignMessage(event.target.value)}
                placeholder="Hi {first_name}, we have spaces this week. Book your next appointment now."
                className="min-h-36 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
              <span className="mt-2 block text-xs text-slate-500">
                Characters: {campaignMessage.length}
              </span>
            </label>

            <button
              type="button"
              onClick={sendCampaignNow}
              disabled={sending}
              className="w-full rounded-xl bg-white px-5 py-3 font-bold text-slate-950 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send campaign now'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-2xl font-bold">Recent campaign messages</h2>

          <div className="space-y-3">
            {logs.map((log) => (
              <article key={log.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-bold">{log.phone || 'No phone'}</h3>
                    <p className="mt-1 text-sm text-slate-500">{formatDate(log.created_at)}</p>
                  </div>

                  <StatusPill value={log.status || 'pending'} />
                </div>

                <p className="text-sm text-slate-400">{log.message}</p>

                {log.error_message && (
                  <p className="mt-3 text-sm text-red-300">{log.error_message}</p>
                )}
              </article>
            ))}

            {logs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-8 text-center text-slate-500">
                No campaign SMS messages yet.
              </div>
            )}
          </div>
        </section>
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

function StatusPill({ value }: { value: string }) {
  const good = value === 'sent' || value === 'delivered'
  const failed = value === 'failed'

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
        good
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          : failed
            ? 'border-red-500/20 bg-red-500/10 text-red-300'
            : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
      }`}
    >
      {value}
    </span>
  )
}
