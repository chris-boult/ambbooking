'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type SelectedFile = {
  id: string
  file: File
  previewUrl: string | null
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
]

export default function BusinessSupportPage() {
  const [businessId, setBusinessId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState('normal')
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<SelectedFile[]>([])

  useEffect(() => {
    loadBusiness()

    return () => {
      files.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
    }
  }, [])

  const totalFileSize = useMemo(() => {
    return files.reduce((total, item) => total + item.file.size, 0)
  }, [files])

  async function loadBusiness() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: business } = await supabase
      .from('businesses')
      .select('id,business_name')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (business) {
      setBusinessId(business.id)
      setBusinessName(business.business_name || '')
    }
  }

  function addFiles(fileList: FileList | null) {
    setStatus('')

    if (!fileList) return

    const incoming = Array.from(fileList)
    const validFiles: SelectedFile[] = []
    const errors: string[] = []

    incoming.forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name} is not a supported file type.`)
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} is larger than 10MB.`)
        return
      }

      validFiles.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      })
    })

    if (errors.length > 0) {
      setStatus(errors.join(' '))
    }

    if (validFiles.length > 0) {
      setFiles((current) => [...current, ...validFiles].slice(0, 5))
    }
  }

  function removeFile(id: string) {
    setFiles((current) => {
      const item = current.find((file) => file.id === id)

      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }

      return current.filter((file) => file.id !== id)
    })
  }

  async function uploadAttachments(ticketId: string) {
    if (files.length === 0) return

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      throw new Error('You are not signed in.')
    }

    for (const item of files) {
      const formData = new FormData()
      formData.append('ticketId', ticketId)
      formData.append('file', item.file)

      const response = await fetch('/api/support/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Failed to upload ${item.file.name}`)
      }
    }
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault()
    setStatus('')

    if (!businessId) {
      setStatus('Business profile could not be loaded. Please refresh and try again.')
      return
    }

    if (!subject.trim() || !message.trim()) {
      setStatus('Please add a subject and message.')
      return
    }

    setLoading(true)

    try {
      const { data: userData } = await supabase.auth.getUser()

      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          business_id: businessId,
          business_name: businessName,
          user_id: userData.user?.id || null,
          user_email: userData.user?.email || null,
          subject: subject.trim(),
          message: message.trim(),
          category,
          priority,
          status: 'open',
          source: 'business_dashboard',
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(error.message)
      }

      if (!ticket?.id) {
        throw new Error('Ticket was created but no ticket ID was returned.')
      }

      await uploadAttachments(ticket.id)

     await fetch('/api/support/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'support.ticket.created',
    businessId,
    userId: userData.user?.id,
    payload: {
      ticketId: ticket.id,
      subject: subject.trim(),
      priority,
      category,
      businessName,
      userEmail: userData.user?.email || null,
      attachmentCount: files.length,
    },
  }),
})

      files.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })

      setSubject('')
      setMessage('')
      setPriority('normal')
      setCategory('general')
      setFiles([])
      setStatus('Support ticket raised successfully. AMB Booking support can now see this in the admin centre.')
    } catch (error: any) {
      setStatus(error?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="space-y-8 text-white">
      <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
        <div className="mb-6 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
          Support centre
        </div>

        <h1 className="max-w-5xl text-5xl font-black leading-[1.02] tracking-[-0.055em] md:text-6xl">
          Need help with AMB Booking?
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-400">
          Raise a support ticket and it will feed directly into the platform admin support centre for review.
        </p>
      </section>

      {status && (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-4 text-sm font-bold text-cyan-100">
          {status}
        </div>
      )}

      <section className="max-w-4xl rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.42)]">
        <form onSubmit={submitTicket} className="space-y-5">
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <select
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="general">General</option>
              <option value="billing">Billing</option>
              <option value="payments">Payments</option>
              <option value="bookings">Bookings</option>
              <option value="technical">Technical issue</option>
              <option value="feature_request">Feature request</option>
            </select>

            <select
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <textarea
            className="min-h-48 w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
            placeholder="Tell us what you need help with..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/70 p-5">
            <label className="block cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-6 text-center transition hover:border-cyan-300/60 hover:bg-cyan-400/10">
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />

              <span className="block text-sm font-black text-cyan-200">
                Upload screenshots or supporting files
              </span>

              <span className="mt-2 block text-xs font-bold text-slate-500">
                PNG, JPG, WEBP or PDF. Maximum 10MB per file. Up to 5 files.
              </span>
            </label>

            {files.length > 0 && (
              <div className="mt-5 space-y-3">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  Attachments selected · {(totalFileSize / 1024 / 1024).toFixed(2)}MB
                </div>

                {files.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
                  >
                    {item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-400/10 text-xs font-black text-cyan-200">
                        PDF
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-white">
                        {item.file.name}
                      </div>

                      <div className="text-xs font-bold text-slate-500">
                        {(item.file.size / 1024 / 1024).toFixed(2)}MB
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300 hover:border-red-300/50 hover:bg-red-400/10 hover:text-red-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            disabled={loading}
            className="rounded-2xl bg-cyan-400 px-7 py-5 text-sm font-black text-slate-950 shadow-[0_0_80px_rgba(34,211,238,.35)] transition hover:-translate-y-1 hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading ? 'Submitting ticket...' : 'Raise support ticket'}
          </button>
        </form>
      </section>
    </main>
  )
}