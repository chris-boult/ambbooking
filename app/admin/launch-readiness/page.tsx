'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ReadinessStatus =
  | 'ready_for_launch'
  | 'nearly_ready'
  | 'in_progress'
  | 'not_ready'
  | string

type Business = {
  id: string
  business_name: string | null
  email: string | null
  slug: string | null
  custom_domain: string | null
  domain_status: string | null
  ssl_status: string | null
  white_label_mode: string | null
  branding_status: string | null
  launch_readiness_score: number | null
  launch_readiness_status: ReadinessStatus | null
  created_at: string | null
}

type LaunchReadinessCheck = {
  id: string
  business_id: string
  branding_score: number | null
  domain_score: number | null
  ssl_score: number | null
  email_score: number | null
  services_score: number | null
  availability_score: number | null
  team_score: number | null
  overall_score: number | null
  readiness_status: ReadinessStatus | null
  last_calculated_at: string | null
  created_at: string | null
  updated_at: string | null
}

type ReadinessRow = {
  business: Business
  check: LaunchReadinessCheck | null
  overallScore: number
  status: ReadinessStatus
}

function statusLabel(value?: string | null) {
  if (!value) return 'Not Ready'
  return value.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function statusClass(value?: string | null) {
  if (value === 'ready_for_launch') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
  }

  if (value === 'nearly_ready') {
    return 'border-blue-500/20 bg-blue-500/10 text-blue-300'
  }

  if (value === 'in_progress') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-300'
  }

  return 'border-red-500/20 bg-red-500/10 text-red-300'
}

function scoreClass(score: number) {
  if (score >= 90) return 'text-emerald-300'
  if (score >= 70) return 'text-blue-300'
  if (score >= 40) return 'text-amber-300'
  return 'text-red-300'
}

function progressClass(score: number) {
  if (score >= 90) return 'bg-emerald-400'
  if (score >= 70) return 'bg-blue-400'
  if (score >= 40) return 'bg-amber-400'
  return 'bg-red-400'
}

function formatDate(value?: string | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleString('en-GB')
}

function getScore(check: LaunchReadinessCheck | null, key: keyof LaunchReadinessCheck) {
  const value = check?.[key]
  return typeof value === 'number' ? value : 0
}

export default function LaunchReadinessPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [checks, setChecks] = useState<LaunchReadinessCheck[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'ready_for_launch' | 'nearly_ready' | 'in_progress' | 'not_ready'>('all')
  const [loading, setLoading] = useState(true)
  const [recalculatingAll, setRecalculatingAll] = useState(false)
  const [workingId, setWorkingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadPage()
  }, [])

  async function loadPage() {
    setLoading(true)
    setMessage('')
    setError('')

    const [businessRes, checksRes] = await Promise.all([
      supabase
        .from('businesses')
        .select(`
          id,
          business_name,
          email,
          slug,
          custom_domain,
          domain_status,
          ssl_status,
          white_label_mode,
          branding_status,
          launch_readiness_score,
          launch_readiness_status,
          created_at
        `)
        .order('business_name', { ascending: true }),

      supabase
        .from('launch_readiness_checks')
        .select('*')
        .order('overall_score', { ascending: false }),
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

    const businessRows = (businessRes.data || []) as Business[]
    setBusinesses(businessRows)
    setChecks((checksRes.data || []) as LaunchReadinessCheck[])

    if (!selectedBusinessId && businessRows.length > 0) {
      setSelectedBusinessId(businessRows[0].id)
    }

    setLoading(false)
  }

  async function recalculateAll() {
    setRecalculatingAll(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/admin/launch-readiness/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recalculateAll: true }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to recalculate launch readiness.')
      }

      setMessage(result?.message || 'Launch readiness recalculated.')
      await loadPage()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to recalculate launch readiness.'
      setError(msg)
    }

    setRecalculatingAll(false)
  }

  async function recalculateBusiness(businessId: string) {
    setWorkingId(businessId)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/admin/launch-readiness/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to recalculate business.')
      }

      setMessage(result?.message || 'Business launch readiness recalculated.')
      await loadPage()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to recalculate business.'
      setError(msg)
    }

    setWorkingId('')
  }

  const rows = useMemo<ReadinessRow[]>(() => {
    return businesses.map(business => {
      const check = checks.find(item => item.business_id === business.id) || null
      const overallScore =
        check?.overall_score ??
        business.launch_readiness_score ??
        0

      const status =
        check?.readiness_status ||
        business.launch_readiness_status ||
        'not_ready'

      return {
        business,
        check,
        overallScore,
        status,
      }
    })
  }, [businesses, checks])

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const haystack = [
        row.business.business_name,
        row.business.email,
        row.business.slug,
        row.business.custom_domain,
        row.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = haystack.includes(search.toLowerCase())
      const matchesFilter = filter === 'all' || row.status === filter

      return matchesSearch && matchesFilter
    })
  }, [rows, search, filter])

  const selectedRow = useMemo(() => {
    return rows.find(row => row.business.id === selectedBusinessId) || filteredRows[0] || null
  }, [rows, filteredRows, selectedBusinessId])

  const metrics = useMemo(() => {
    const ready = rows.filter(row => row.status === 'ready_for_launch').length
    const nearly = rows.filter(row => row.status === 'nearly_ready').length
    const inProgress = rows.filter(row => row.status === 'in_progress').length
    const notReady = rows.filter(row => row.status === 'not_ready' || !row.status).length
    const average =
      rows.length > 0
        ? Math.round(rows.reduce((sum, row) => sum + row.overallScore, 0) / rows.length)
        : 0

    return {
      total: rows.length,
      ready,
      nearly,
      inProgress,
      notReady,
      average,
    }
  }, [rows])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-300">Loading launch readiness...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-6">
      <div className="w-full space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold text-indigo-300">Platform Admin</p>
            <h1 className="mt-1 text-3xl font-black md:text-4xl">Launch Readiness Centre</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Score every business across branding, domain, SSL, email, services, team and availability before going live.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin/branding" className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10">
              Branding Centre
            </Link>
            <Link href="/admin/domains" className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10">
              Domain Centre
            </Link>
            <Link href="/admin/email-branding" className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10">
              Email Branding
            </Link>
            <button
              onClick={recalculateAll}
              disabled={recalculatingAll}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {recalculatingAll ? 'Recalculating...' : 'Recalculate All'}
            </button>
            <button onClick={loadPage} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10">
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
          <Metric label="Average Score" value={`${metrics.average}%`} />
          <Metric label="Ready" value={metrics.ready} tone="green" />
          <Metric label="Nearly Ready" value={metrics.nearly} tone="blue" />
          <Metric label="In Progress" value={metrics.inProgress} tone="amber" />
          <Metric label="Not Ready" value={metrics.notReady} tone="red" />
        </section>

        <section className="grid gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_240px]">
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search by business, email, domain, slug or status..."
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400"
              />

              <select
                value={filter}
                onChange={event => setFilter(event.target.value as typeof filter)}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
              >
                <option value="all">All businesses</option>
                <option value="ready_for_launch">Ready for launch</option>
                <option value="nearly_ready">Nearly ready</option>
                <option value="in_progress">In progress</option>
                <option value="not_ready">Not ready</option>
              </select>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="hidden grid-cols-[1.3fr_110px_150px_repeat(7,80px)_120px] gap-3 bg-black/30 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500 xl:grid">
                <div>Business</div>
                <div>Score</div>
                <div>Status</div>
                <div>Brand</div>
                <div>Domain</div>
                <div>SSL</div>
                <div>Email</div>
                <div>Services</div>
                <div>Team</div>
                <div>Avail.</div>
                <div>Action</div>
              </div>

              <div className="divide-y divide-white/10">
                {filteredRows.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    No businesses match this filter.
                  </div>
                ) : (
                  filteredRows.map(row => (
                    <button
                      key={row.business.id}
                      onClick={() => setSelectedBusinessId(row.business.id)}
                      className={`grid w-full gap-4 px-4 py-4 text-left transition xl:grid-cols-[1.3fr_110px_150px_repeat(7,80px)_120px] xl:items-center xl:gap-3 ${
                        selectedRow?.business.id === row.business.id
                          ? 'bg-indigo-500/10'
                          : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div>
                        <p className="font-black text-white">{row.business.business_name || 'Unnamed business'}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.business.custom_domain || row.business.email || 'No domain or email'}</p>
                      </div>

                      <div>
                        <p className={`text-2xl font-black ${scoreClass(row.overallScore)}`}>{row.overallScore}%</p>
                      </div>

                      <div>
                        <StatusPill value={row.status} />
                      </div>

                      <ScoreMini value={getScore(row.check, 'branding_score')} />
                      <ScoreMini value={getScore(row.check, 'domain_score')} />
                      <ScoreMini value={getScore(row.check, 'ssl_score')} />
                      <ScoreMini value={getScore(row.check, 'email_score')} />
                      <ScoreMini value={getScore(row.check, 'services_score')} />
                      <ScoreMini value={getScore(row.check, 'team_score')} />
                      <ScoreMini value={getScore(row.check, 'availability_score')} />

                      <div className="flex flex-wrap gap-2 xl:block">
                        <span className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300">
                          View
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className="grid gap-6 xl:grid-cols-[420px_1fr]">
            {selectedRow ? (
              <>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-2xl font-black">{selectedRow.business.business_name || 'Unnamed business'}</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {selectedRow.business.custom_domain || selectedRow.business.email || 'No domain or email'}
                      </p>
                    </div>

                    <StatusPill value={selectedRow.status} />
                  </div>

                  <div className="mt-6 text-center">
                    <p className={`text-7xl font-black ${scoreClass(selectedRow.overallScore)}`}>
                      {selectedRow.overallScore}%
                    </p>
                    <p className="mt-2 text-sm font-black uppercase tracking-wide text-slate-500">
                      {statusLabel(selectedRow.status)}
                    </p>
                  </div>

                  <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${progressClass(selectedRow.overallScore)}`}
                      style={{ width: `${selectedRow.overallScore}%` }}
                    />
                  </div>

                  <div className="mt-6 grid gap-3">
                    <ScoreDetail label="Branding" value={getScore(selectedRow.check, 'branding_score')} />
                    <ScoreDetail label="Domain" value={getScore(selectedRow.check, 'domain_score')} />
                    <ScoreDetail label="SSL" value={getScore(selectedRow.check, 'ssl_score')} />
                    <ScoreDetail label="Email" value={getScore(selectedRow.check, 'email_score')} />
                    <ScoreDetail label="Services" value={getScore(selectedRow.check, 'services_score')} />
                    <ScoreDetail label="Team" value={getScore(selectedRow.check, 'team_score')} />
                    <ScoreDetail label="Availability" value={getScore(selectedRow.check, 'availability_score')} />
                  </div>

                  <div className="mt-6 grid gap-2">
                    <button
                      onClick={() => recalculateBusiness(selectedRow.business.id)}
                      disabled={workingId === selectedRow.business.id}
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {workingId === selectedRow.business.id ? 'Recalculating...' : 'Recalculate This Business'}
                    </button>

                    <Link
                      href={`/admin/businesses/${selectedRow.business.id}`}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-black text-white hover:bg-white/10"
                    >
                      Open Business Command Centre
                    </Link>

                    <Link
                      href="/admin/branding"
                      className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-black text-white hover:bg-white/10"
                    >
                      Open Branding Centre
                    </Link>

                    <Link
                      href="/admin/domains"
                      className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-black text-white hover:bg-white/10"
                    >
                      Open Domain Centre
                    </Link>

                    <Link
                      href="/admin/email-branding"
                      className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-black text-white hover:bg-white/10"
                    >
                      Open Email Branding
                    </Link>
                  </div>

                  <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                    <Detail label="White label mode" value={statusLabel(selectedRow.business.white_label_mode)} />
                    <Detail label="Branding status" value={statusLabel(selectedRow.business.branding_status)} />
                    <Detail label="Domain status" value={statusLabel(selectedRow.business.domain_status)} />
                    <Detail label="SSL status" value={statusLabel(selectedRow.business.ssl_status)} />
                    <Detail label="Last calculated" value={formatDate(selectedRow.check?.last_calculated_at)} />
                    <Detail label="Created" value={formatDate(selectedRow.business.created_at)} />
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="text-xl font-black">What the scores mean</h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-400">
                    <p><strong className="text-slate-200">90–100:</strong> ready for launch.</p>
                    <p><strong className="text-slate-200">70–89:</strong> nearly ready, minor checks needed.</p>
                    <p><strong className="text-slate-200">40–69:</strong> in progress, key setup missing.</p>
                    <p><strong className="text-slate-200">0–39:</strong> not ready, setup incomplete.</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-slate-400">
                Select a business to view readiness.
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  )
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string | number
  tone?: 'default' | 'green' | 'blue' | 'amber' | 'red'
}) {
  const toneClasses = {
    default: 'text-white',
    green: 'text-emerald-300',
    blue: 'text-blue-300',
    amber: 'text-amber-300',
    red: 'text-red-300',
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${toneClasses[tone]}`}>{value}</p>
    </div>
  )
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass(value)}`}>
      {statusLabel(value)}
    </span>
  )
}

function ScoreMini({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 xl:block">
      <span className="text-xs font-bold text-slate-500 xl:hidden">Score</span>
      <span className={`font-black ${scoreClass(value)}`}>{value}</span>
    </div>
  )
}

function ScoreDetail({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-black text-slate-300">{label}</p>
        <p className={`text-lg font-black ${scoreClass(value)}`}>{value}%</p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${progressClass(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
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
