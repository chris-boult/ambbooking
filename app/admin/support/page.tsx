'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type SupportTicket = {
  id: string
  business_id: string | null
  user_id: string | null
  business_name: string | null
  user_email: string | null
  subject: string
  message: string
  category: string | null
  priority: string | null
  status: string | null
  assigned_to: string | null
  source: string | null
  first_response_at: string | null
  resolved_at: string | null
  resolution: string | null
  created_at: string
  updated_at: string | null
}

type TicketMessage = {
  id: string
  ticket_id: string
  sender_type: string
  sender_id: string | null
  message: string
  internal_note: boolean | null
  created_at: string
}

const statuses = ['open', 'in_progress', 'waiting', 'resolved', 'closed']
const priorities = ['low', 'normal', 'high', 'urgent']

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [replyText, setReplyText] = useState('')
  const [internalNote, setInternalNote] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadTickets()
  }, [])

  useEffect(() => {
    if (selectedTicketId) {
      loadMessages(selectedTicketId)
    }
  }, [selectedTicketId])

  async function loadTickets() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    const rows = (data || []) as SupportTicket[]
    setTickets(rows)

    if (!selectedTicketId && rows.length > 0) {
      setSelectedTicketId(rows[0].id)
    }
  }

  async function loadMessages(ticketId: string) {
    const { data, error } = await supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessages((data || []) as TicketMessage[])
  }

  async function updateTicket(id: string, payload: Partial<SupportTicket>) {
    setMessage('')

    const updatePayload = {
      ...payload,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updatePayload)
      .eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadTickets()
  }

  async function sendReply() {
    if (!selectedTicket || !replyText.trim()) {
      setMessage('Write a reply or internal note first.')
      return
    }

    setMessage('')

    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase.from('support_ticket_messages').insert({
      ticket_id: selectedTicket.id,
      sender_type: internalNote ? 'admin_note' : 'admin',
      sender_id: userData.user?.id || null,
      message: replyText.trim(),
      internal_note: internalNote,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    const updatePayload: Partial<SupportTicket> = {
      status: internalNote ? selectedTicket.status : 'in_progress',
    }

    if (!internalNote && !selectedTicket.first_response_at) {
      updatePayload.first_response_at = new Date().toISOString()
    }

    await updateTicket(selectedTicket.id, updatePayload)
    setReplyText('')
    setInternalNote(false)
    await loadMessages(selectedTicket.id)
  }

  async function markResolved() {
    if (!selectedTicket) return

    await updateTicket(selectedTicket.id, {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
  }

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase()

    return tickets.filter((ticket) => {
      const matchesSearch =
        !q ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.message.toLowerCase().includes(q) ||
        ticket.business_name?.toLowerCase().includes(q) ||
        ticket.user_email?.toLowerCase().includes(q)

      const matchesStatus =
        filterStatus === 'all' || (ticket.status || 'open') === filterStatus

      const matchesPriority =
        filterPriority === 'all' || (ticket.priority || 'normal') === filterPriority

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [tickets, search, filterStatus, filterPriority])

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId)

  const stats = useMemo(() => {
    return {
      open: tickets.filter((ticket) => (ticket.status || 'open') === 'open').length,
      urgent: tickets.filter((ticket) => (ticket.priority || 'normal') === 'urgent').length,
      resolved: tickets.filter((ticket) => ticket.status === 'resolved').length,
      total: tickets.length,
    }
  }, [tickets])

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-white">
        <div className="rounded-[2rem] border border-white/10 bg-[#07111f] px-8 py-6 font-black text-slate-300 shadow-[0_50px_180px_rgba(0,0,0,.45)]">
          Loading support tickets...
        </div>
      </main>
    )
  }

  return (
    <main className="space-y-8 text-white">
      <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
              Platform support
            </div>

            <h1 className="max-w-5xl text-5xl font-black leading-[1.02] tracking-[-0.055em] md:text-6xl">
              Support tickets.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-400">
              View, triage and respond to support requests raised from business dashboards.
            </p>
          </div>

          <button
            type="button"
            onClick={loadTickets}
            className="rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-black text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.25)] transition hover:-translate-y-1 hover:bg-cyan-300"
          >
            Refresh tickets
          </button>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-4 text-sm font-bold text-cyan-100">
          {message}
        </div>
      )}

      <section className="grid gap-5 md:grid-cols-4">
        <StatCard label="Total tickets" value={stats.total} />
        <StatCard label="Open" value={stats.open} />
        <StatCard label="Urgent" value={stats.urgent} />
        <StatCard label="Resolved" value={stats.resolved} />
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-6 shadow-[0_60px_200px_rgba(0,0,0,.42)]">
          <div className="mb-5 grid gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tickets..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
            />

            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
              >
                <option value="all">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {formatLabel(status)}
                  </option>
                ))}
              </select>

              <select
                value={filterPriority}
                onChange={(event) => setFilterPriority(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
              >
                <option value="all">All priorities</option>
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {formatLabel(priority)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setSelectedTicketId(ticket.id)}
                className={`w-full rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${
                  selectedTicketId === ticket.id
                    ? 'border-cyan-300/40 bg-cyan-400/10'
                    : 'border-white/10 bg-slate-950 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-white">{ticket.subject}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {ticket.business_name || 'Unknown business'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ticket.user_email || 'No user email'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge label={ticket.status || 'open'} />
                    <PriorityBadge label={ticket.priority || 'normal'} />
                  </div>
                </div>

                <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">
                  {ticket.message}
                </p>

                <p className="mt-3 text-xs font-bold text-slate-600">
                  {formatDate(ticket.created_at)}
                </p>
              </button>
            ))}

            {filteredTickets.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-500">
                No tickets match your filters.
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.42)]">
          {!selectedTicket && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center text-slate-500">
              Select a ticket to view the conversation.
            </div>
          )}

          {selectedTicket && (
            <div className="space-y-8">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge label={selectedTicket.status || 'open'} />
                    <PriorityBadge label={selectedTicket.priority || 'normal'} />
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-slate-300">
                      {formatLabel(selectedTicket.category || 'general')}
                    </span>
                  </div>

                  <h2 className="text-3xl font-black tracking-[-0.04em]">
                    {selectedTicket.subject}
                  </h2>

                  <p className="mt-3 text-sm text-slate-400">
                    {selectedTicket.business_name || 'Unknown business'} ·{' '}
                    {selectedTicket.user_email || 'No email'} ·{' '}
                    {formatDate(selectedTicket.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={selectedTicket.status || 'open'}
                    onChange={(event) =>
                      updateTicket(selectedTicket.id, { status: event.target.value })
                    }
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-black text-white outline-none focus:border-cyan-300"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {formatLabel(status)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedTicket.priority || 'normal'}
                    onChange={(event) =>
                      updateTicket(selectedTicket.id, { priority: event.target.value })
                    }
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-black text-white outline-none focus:border-cyan-300"
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {formatLabel(priority)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={markResolved}
                    className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-400/20"
                  >
                    Resolve
                  </button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-slate-950 p-6">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  Original request
                </p>
                <p className="whitespace-pre-wrap leading-7 text-slate-300">
                  {selectedTicket.message}
                </p>
              </div>

              <div>
                <h3 className="mb-4 text-2xl font-black tracking-[-0.03em]">
                  Conversation
                </h3>

                <div className="space-y-4">
                  {messages.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-5 ${
                        item.internal_note
                          ? 'border-amber-400/20 bg-amber-400/10'
                          : item.sender_type === 'admin'
                            ? 'border-cyan-400/20 bg-cyan-400/10'
                            : 'border-white/10 bg-slate-950'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <p className="text-sm font-black text-white">
                          {formatLabel(item.sender_type)}
                          {item.internal_note ? ' · internal note' : ''}
                        </p>
                        <p className="text-xs font-bold text-slate-500">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                      <p className="whitespace-pre-wrap leading-7 text-slate-300">
                        {item.message}
                      </p>
                    </div>
                  ))}

                  {messages.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-500">
                      No replies yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-slate-950 p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                  <h3 className="text-xl font-black">Reply</h3>

                  <label className="flex items-center gap-3 text-sm font-bold text-slate-300">
                    <input
                      type="checkbox"
                      checked={internalNote}
                      onChange={(event) => setInternalNote(event.target.checked)}
                      className="accent-cyan-400"
                    />
                    Internal note only
                  </label>
                </div>

                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder={
                    internalNote
                      ? 'Add an internal note for admins...'
                      : 'Write a reply to the business...'
                  }
                  className="min-h-40 w-full rounded-2xl border border-white/10 bg-[#020617] px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
                />

                <button
                  type="button"
                  onClick={sendReply}
                  className="mt-4 rounded-2xl bg-cyan-400 px-7 py-4 text-sm font-black text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.25)] transition hover:-translate-y-1 hover:bg-cyan-300"
                >
                  {internalNote ? 'Save internal note' : 'Send reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#07111f] p-6 shadow-[0_40px_140px_rgba(0,0,0,.32)]">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-4xl font-black tracking-[-0.05em] text-white">
        {value}
      </p>
    </div>
  )
}

function Badge({ label }: { label: string }) {
  const colour =
    label === 'resolved' || label === 'closed'
      ? 'bg-emerald-400/10 text-emerald-200 border-emerald-400/20'
      : label === 'waiting'
        ? 'bg-amber-400/10 text-amber-200 border-amber-400/20'
        : 'bg-cyan-400/10 text-cyan-200 border-cyan-400/20'

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${colour}`}>
      {formatLabel(label)}
    </span>
  )
}

function PriorityBadge({ label }: { label: string }) {
  const colour =
    label === 'urgent'
      ? 'bg-red-400/10 text-red-200 border-red-400/20'
      : label === 'high'
        ? 'bg-orange-400/10 text-orange-200 border-orange-400/20'
        : 'bg-white/[0.04] text-slate-300 border-white/10'

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${colour}`}>
      {formatLabel(label)}
    </span>
  )
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(value: string | null) {
  if (!value) return 'Not set'

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
