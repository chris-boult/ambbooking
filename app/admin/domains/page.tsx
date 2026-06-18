'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type DomainBusiness = {
  id: string
  business_name: string | null
  slug: string | null
  custom_domain: string | null
  domain_status: string | null
  ssl_status: string | null
  domain_last_checked_at: string | null
  domain_verification_token: string | null
  domain_verified_at: string | null
  domain_error: string | null
  domain_target: string | null
  domain_verified_by: string | null
  ssl_error: string | null
  white_label_mode: string | null
  hide_amb_branding: boolean | null
  branding_status: string | null
}

type DomainCheck = {
  id: string
  business_id: string
  checked_at: string
  domain_status: string | null
  ssl_status: string | null
  notes: string | null
  expected_token: string | null
  found_token: string | null
  error_message: string | null
}

function generateToken() {
  return `amb-verify-${Math.random().toString(36).slice(2, 12)}`
}

function statusLabel(value?: string | null) {
  if (!value) return 'Not set'
  return value.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function statusClass(value?: string | null) {
  const normalised = value || ''

  if (['connected', 'active', 'verified', 'ssl_active'].includes(normalised)) {
    return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
  }

  if (['pending', 'pending_verification', 'ssl_provisioning', 'not_checked'].includes(normalised)) {
    return 'bg-amber-500/10 text-amber-300 border-amber-500/20'
  }

  if (['failed', 'error', 'ssl_failed'].includes(normalised)) {
    return 'bg-red-500/10 text-red-300 border-red-500/20'
  }

  return 'bg-slate-500/10 text-slate-300 border-white/10'
}

export default function AdminDomainsPage() {
  const [businesses, setBusinesses] = useState<DomainBusiness[]>([])
  const [checks, setChecks] = useState<DomainCheck[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'connected' | 'pending' | 'failed' | 'missing'>('all')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')

  useEffect(() => {
    loadDomains()
  }, [])

  async function loadDomains() {
    setLoading(true)
    setMessage('')
    setError('')

    const [businessRes, checksRes] = await Promise.all([
      supabase
        .from('businesses')
        .select(`
          id,
          business_name,
          slug,
          custom_domain,
          domain_status,
          ssl_status,
          domain_last_checked_at,
          domain_verification_token,
          domain_verified_at,
          domain_error,
          domain_target,
          domain_verified_by,
          ssl_error,
          white_label_mode,
          hide_amb_branding,
          branding_status
        `)
        .order('business_name', { ascending: true }),

      supabase
        .from('domain_checks')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(100),
    ])

    if (businessRes.error) {
      setError(businessRes.error.message)
      setLoading(false)
      return
    }

    if (checksRes.error) {
      setError(checksRes.error.message)
      setLoading(false)
      return
    }

    setBusinesses((businessRes.data || []) as DomainBusiness[])
    setChecks((checksRes.data || []) as DomainCheck[])
    setLoading(false)
  }

  async function logDomainCheck({
    business,
    domainStatus,
    sslStatus,
    notes,
    expectedToken,
    foundToken,
    errorMessage,
  }: {
    business: DomainBusiness
    domainStatus: string
    sslStatus: string
    notes: string
    expectedToken?: string | null
    foundToken?: string | null
    errorMessage?: string | null
  }) {
    await supabase.from('domain_checks').insert({
      business_id: business.id,
      domain_status: domainStatus,
      ssl_status: sslStatus,
      notes,
      expected_token: expectedToken || business.domain_verification_token || null,
      found_token: foundToken || null,
      error_message: errorMessage || null,
    })
  }

  async function generateVerificationToken(business: DomainBusiness) {
    setWorkingId(business.id)
    setMessage('')
    setError('')

    const token = business.domain_verification_token || generateToken()

    const { error } = await supabase
      .from('businesses')
      .update({
        domain_verification_token: token,
        domain_status: business.custom_domain ? 'pending_verification' : 'not_connected',
        ssl_status: business.custom_domain ? 'not_checked' : 'not_checked',
        domain_last_checked_at: new Date().toISOString(),
        domain_error: null,
        ssl_error: null,
        domain_target: business.domain_target || 'cname.ambbooking.com',
      })
      .eq('id', business.id)

    if (error) {
      setError(error.message)
      setWorkingId('')
      return
    }

    await logDomainCheck({
      business,
      domainStatus: business.custom_domain ? 'pending_verification' : 'not_connected',
      sslStatus: 'not_checked',
      notes: 'Verification token generated from Custom Domain Centre.',
      expectedToken: token,
    })

    setMessage('Verification token generated.')
    await loadDomains()
    setWorkingId('')
  }

  async function markPending(business: DomainBusiness) {
    setWorkingId(business.id)
    setMessage('')
    setError('')

    const { error } = await supabase
      .from('businesses')
      .update({
        domain_status: 'pending_verification',
        ssl_status: 'not_checked',
        domain_last_checked_at: new Date().toISOString(),
        domain_error: null,
        ssl_error: null,
      })
      .eq('id', business.id)

    if (error) {
      setError(error.message)
      setWorkingId('')
      return
    }

    await logDomainCheck({
      business,
      domainStatus: 'pending_verification',
      sslStatus: 'not_checked',
      notes: 'Domain manually marked as pending verification.',
    })

    setMessage('Domain marked as pending verification.')
    await loadDomains()
    setWorkingId('')
  }

  async function markConnected(business: DomainBusiness) {
    setWorkingId(business.id)
    setMessage('')
    setError('')

    const { data: userData } = await supabase.auth.getUser()
    const adminEmail = userData.user?.email || 'unknown'

    const { error } = await supabase
      .from('businesses')
      .update({
        domain_status: 'connected',
        ssl_status: 'active',
        domain_verified_at: new Date().toISOString(),
        domain_last_checked_at: new Date().toISOString(),
        domain_verified_by: adminEmail,
        domain_error: null,
        ssl_error: null,
      })
      .eq('id', business.id)

    if (error) {
      setError(error.message)
      setWorkingId('')
      return
    }

    await logDomainCheck({
      business,
      domainStatus: 'connected',
      sslStatus: 'active',
      notes: `Domain manually marked as connected by ${adminEmail}.`,
      expectedToken: business.domain_verification_token,
      foundToken: business.domain_verification_token,
    })

    await supabase.from('audit_logs').insert({
      actor_email: adminEmail,
      action: 'domain_marked_connected',
      entity_type: 'business',
      entity_id: business.id,
      metadata: {
        custom_domain: business.custom_domain,
        domain_status: 'connected',
        ssl_status: 'active',
      },
    })

    setMessage('Domain marked as connected.')
    await loadDomains()
    setWorkingId('')
  }

  async function markFailed(business: DomainBusiness) {
    const reason = window.prompt('Why has this domain failed?', business.domain_error || 'DNS record not found')
    if (!reason) return

    setWorkingId(business.id)
    setMessage('')
    setError('')

    const { error } = await supabase
      .from('businesses')
      .update({
        domain_status: 'failed',
        ssl_status: 'not_checked',
        domain_last_checked_at: new Date().toISOString(),
        domain_error: reason,
      })
      .eq('id', business.id)

    if (error) {
      setError(error.message)
      setWorkingId('')
      return
    }

    await logDomainCheck({
      business,
      domainStatus: 'failed',
      sslStatus: 'not_checked',
      notes: 'Domain manually marked as failed.',
      errorMessage: reason,
    })

    setMessage('Domain marked as failed.')
    await loadDomains()
    setWorkingId('')
  }

  async function verifyDomain(business: DomainBusiness) {
    setWorkingId(business.id)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/admin/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || 'Domain verification failed.')
      }

      setMessage(result?.message || 'Domain verification completed.')
      await loadDomains()
    } catch (err: any) {
      setError(err.message || 'Domain verification failed. The API route may not exist yet.')
    }

    setWorkingId('')
  }

  const filteredBusinesses = useMemo(() => {
    return businesses.filter(business => {
      const haystack = [
        business.business_name,
        business.custom_domain,
        business.slug,
        business.domain_status,
        business.ssl_status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = haystack.includes(search.toLowerCase())

      const matchesFilter =
        filter === 'all' ||
        (filter === 'connected' && business.domain_status === 'connected') ||
        (filter === 'pending' && business.domain_status === 'pending_verification') ||
        (filter === 'failed' && business.domain_status === 'failed') ||
        (filter === 'missing' && !business.custom_domain)

      return matchesSearch && matchesFilter
    })
  }, [businesses, search, filter])

  const selectedBusiness = businesses.find(business => business.id === selectedBusinessId) || filteredBusinesses[0] || null

  const latestChecksForSelected = selectedBusiness
    ? checks.filter(check => check.business_id === selectedBusiness.id).slice(0, 10)
    : []

  const metrics = useMemo(() => {
    const connected = businesses.filter(business => business.domain_status === 'connected').length
    const pending = businesses.filter(business => business.domain_status === 'pending_verification').length
    const failed = businesses.filter(business => business.domain_status === 'failed').length
    const missing = businesses.filter(business => !business.custom_domain).length
    const sslActive = businesses.filter(business => business.ssl_status === 'active').length

    return {
      total: businesses.length,
      connected,
      pending,
      failed,
      missing,
      sslActive,
    }
  }, [businesses])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-300">Loading domains...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold text-indigo-300">Platform Admin</p>
            <h1 className="mt-1 text-3xl font-black md:text-4xl">Custom Domain Centre</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Manage white-label domains, DNS verification, SSL status and domain health across every business.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin/branding" className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10">
              Branding Centre
            </Link>
            <button onClick={loadDomains} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">
              Refresh
            </button>
          </div>
        </header>

        {message && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Businesses" value={metrics.total} />
          <Metric label="Connected" value={metrics.connected} />
          <Metric label="Pending" value={metrics.pending} />
          <Metric label="Failed" value={metrics.failed} />
          <Metric label="Missing" value={metrics.missing} />
          <Metric label="SSL Active" value={metrics.sslActive} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search by business, domain, slug or status..."
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400"
              />

              <select
                value={filter}
                onChange={event => setFilter(event.target.value as typeof filter)}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
              >
                <option value="all">All domains</option>
                <option value="connected">Connected</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="missing">Missing domain</option>
              </select>
            </div>

            <div className="space-y-3">
              {filteredBusinesses.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-slate-500">
                  No domains found.
                </div>
              ) : (
                filteredBusinesses.map(business => (
                  <button
                    key={business.id}
                    onClick={() => setSelectedBusinessId(business.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedBusiness?.id === business.id
                        ? 'border-indigo-400 bg-indigo-500/10'
                        : 'border-white/10 bg-black/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-lg font-black">{business.business_name || 'Unnamed business'}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {business.custom_domain || 'No custom domain set'}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Target: {business.domain_target || 'cname.ambbooking.com'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <StatusPill value={business.domain_status || 'not_connected'} />
                        <StatusPill value={business.ssl_status || 'not_checked'} />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <aside className="space-y-6">
            {selectedBusiness ? (
              <>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <h2 className="text-2xl font-black">{selectedBusiness.business_name || 'Unnamed business'}</h2>
                  <p className="mt-1 text-sm text-slate-400">{selectedBusiness.custom_domain || 'No custom domain set'}</p>

                  <div className="mt-5 space-y-3">
                    <Detail label="Domain status" value={statusLabel(selectedBusiness.domain_status)} />
                    <Detail label="SSL status" value={statusLabel(selectedBusiness.ssl_status)} />
                    <Detail label="White label mode" value={statusLabel(selectedBusiness.white_label_mode)} />
                    <Detail label="Branding status" value={statusLabel(selectedBusiness.branding_status)} />
                    <Detail label="Last checked" value={selectedBusiness.domain_last_checked_at ? new Date(selectedBusiness.domain_last_checked_at).toLocaleString('en-GB') : 'Never'} />
                    <Detail label="Verified at" value={selectedBusiness.domain_verified_at ? new Date(selectedBusiness.domain_verified_at).toLocaleString('en-GB') : 'Not verified'} />
                    <Detail label="Verified by" value={selectedBusiness.domain_verified_by || 'Not set'} />
                  </div>

                  {(selectedBusiness.domain_error || selectedBusiness.ssl_error) && (
                    <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                      {selectedBusiness.domain_error && <p>Domain: {selectedBusiness.domain_error}</p>}
                      {selectedBusiness.ssl_error && <p>SSL: {selectedBusiness.ssl_error}</p>}
                    </div>
                  )}

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-black text-slate-300">Customer DNS instructions</p>

                    <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">CNAME</p>
                    <code className="mt-1 block rounded-xl bg-slate-950 p-3 text-xs text-indigo-200">
                      {selectedBusiness.custom_domain || 'bookings.customer-domain.co.uk'} → {selectedBusiness.domain_target || 'cname.ambbooking.com'}
                    </code>

                    <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">TXT host</p>
                    <code className="mt-1 block rounded-xl bg-slate-950 p-3 text-xs text-indigo-200">
                      _ambbooking
                    </code>

                    <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">TXT value</p>
                    <code className="mt-1 block rounded-xl bg-slate-950 p-3 text-xs text-indigo-200">
                      {selectedBusiness.domain_verification_token || 'Generate a token first'}
                    </code>
                  </div>

                  <div className="mt-5 grid gap-2">
                    <button
                      onClick={() => verifyDomain(selectedBusiness)}
                      disabled={workingId === selectedBusiness.id}
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {workingId === selectedBusiness.id ? 'Checking...' : 'Run Verification'}
                    </button>

                    <button
                      onClick={() => generateVerificationToken(selectedBusiness)}
                      disabled={workingId === selectedBusiness.id}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Generate Token
                    </button>

                    <button
                      onClick={() => markPending(selectedBusiness)}
                      disabled={workingId === selectedBusiness.id}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-amber-300 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark Pending
                    </button>

                    <button
                      onClick={() => markConnected(selectedBusiness)}
                      disabled={workingId === selectedBusiness.id}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-emerald-300 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark Connected
                    </button>

                    <button
                      onClick={() => markFailed(selectedBusiness)}
                      disabled={workingId === selectedBusiness.id}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark Failed
                    </button>

                    <Link
                      href={`/admin/businesses/${selectedBusiness.id}`}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-black text-white hover:bg-white/10"
                    >
                      Open Business Command Centre
                    </Link>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="text-xl font-black">Recent checks</h3>

                  <div className="mt-4 space-y-3">
                    {latestChecksForSelected.length === 0 ? (
                      <p className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-slate-500">
                        No domain checks yet.
                      </p>
                    ) : (
                      latestChecksForSelected.map(check => (
                        <div key={check.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="flex flex-wrap gap-2">
                            <StatusPill value={check.domain_status || 'not_set'} />
                            <StatusPill value={check.ssl_status || 'not_set'} />
                          </div>

                          <p className="mt-3 text-sm text-slate-300">{check.notes || 'No notes'}</p>
                          {check.error_message && <p className="mt-2 text-sm text-red-300">{check.error_message}</p>}
                          <p className="mt-3 text-xs text-slate-600">
                            {new Date(check.checked_at).toLocaleString('en-GB')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-slate-400">
                Select a business to manage its domain.
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  )
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(value)}`}>
      {statusLabel(value)}
    </span>
  )
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid gap-1 border-b border-white/10 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="break-words text-sm font-semibold text-slate-200">{value}</p>
    </div>
  )
}
