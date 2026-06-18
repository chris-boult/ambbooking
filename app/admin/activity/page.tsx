'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function GenericAdminPage() {
  const [rows, setRows] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRows()
  }, [])

  async function loadRows() {
    setLoading(true)
    const { data, error } = await supabase.from('audit_logs').select('id,actor_email,action,entity_type,entity_id,metadata,created_at').order('created_at', { ascending: false }).limit(250)
    if (error) setMessage(error.message)
    setRows(data || [])
    setLoading(false)
  }

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return rows
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q))
  }, [rows, search])

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">Master admin</p>
        <h1 className="mt-2 text-4xl font-black">Activity Feed</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Recent businesses, bookings and customers across the platform.</p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
      />

      {message && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">{message}</div>}
      {loading && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">Loading...</div>}

      {!loading && (
        <section className="space-y-4">
          {filteredRows.map((row) => (
            <div key={row.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <pre className="whitespace-pre-wrap break-words text-sm text-slate-300">{JSON.stringify(row, null, 2)}</pre>
            </div>
          ))}

          {filteredRows.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-slate-400">No records found.</div>
          )}
        </section>
      )}
    </div>
  )
}
