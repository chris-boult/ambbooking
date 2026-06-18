'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function CreateBusinessPage() {
  const [businessName, setBusinessName] = useState('')
  const [ownerFirstName, setOwnerFirstName] = useState('')
  const [ownerLastName, setOwnerLastName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [industry, setIndustry] = useState('')
  const [plan, setPlan] = useState('growth')
  const [billingType, setBillingType] = useState('manual')
  const [monthlyAmount, setMonthlyAmount] = useState('79')
  const [trialDays, setTrialDays] = useState('14')
  const [password, setPassword] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [lifetimeAccess, setLifetimeAccess] = useState(false)
  const [customSlug, setCustomSlug] = useState('')
  const [message, setMessage] = useState('')
  const [createdPassword, setCreatedPassword] = useState('')
  const [creating, setCreating] = useState(false)

  const slug = useMemo(() => customSlug.trim() || slugify(businessName), [businessName, customSlug])

  async function createBusiness(e: React.FormEvent) {
    e.preventDefault()

    if (!businessName.trim() || !ownerEmail.trim()) {
      setMessage('Business name and owner email are required.')
      return
    }

    setCreating(true)
    setMessage('')
    setCreatedPassword('')

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      setMessage('You are not logged in.')
      setCreating(false)
      return
    }

    const response = await fetch('/api/admin/create-business', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        businessName,
        ownerFirstName,
        ownerLastName,
        ownerEmail,
        phone,
        industry,
        plan,
        billingType,
        monthlyAmount,
        trialDays,
        password: password.trim() || undefined,
        isInternal,
        lifetimeAccess,
        slug,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setMessage(result.error || 'Business creation failed.')
      setCreating(false)
      return
    }

    setCreatedPassword(result.temporaryPassword)
    setMessage(`Business created successfully. Owner login: ${result.ownerEmail}`)
    setCreating(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">Manual onboarding</p>
        <h1 className="mt-2 text-4xl font-black">Create business</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Create the Supabase Auth user, business tenant, owner role, trial, billing override and audit event in one go.
        </p>
      </div>

      {message && <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">{message}</div>}

      {createdPassword && (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-emerald-200">
          <p className="font-black">Temporary password</p>
          <p className="mt-2 rounded-2xl bg-black/30 p-4 font-mono text-lg">{createdPassword}</p>
          <p className="mt-3 text-sm">Copy this now. For security, it will only show here.</p>
        </div>
      )}

      <form onSubmit={createBusiness} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Business name" value={businessName} onChange={setBusinessName} />
          <Field label="Slug" value={customSlug} onChange={setCustomSlug} placeholder={slug || 'auto-generated'} />
          <Field label="Owner first name" value={ownerFirstName} onChange={setOwnerFirstName} />
          <Field label="Owner last name" value={ownerLastName} onChange={setOwnerLastName} />
          <Field label="Owner email" value={ownerEmail} onChange={setOwnerEmail} />
          <Field label="Phone" value={phone} onChange={setPhone} />
          <Field label="Industry" value={industry} onChange={setIndustry} />

          <label>
            <span className="mb-2 block text-sm font-bold text-slate-400">Plan</span>
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none">
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-slate-400">Billing type</span>
            <select value={billingType} onChange={(e) => setBillingType(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none">
              <option value="manual">Manual</option>
              <option value="stripe">Stripe</option>
              <option value="partner">Partner</option>
              <option value="agency">Agency</option>
              <option value="franchise">Franchise</option>
              <option value="internal">Internal</option>
            </select>
          </label>

          <Field label="Monthly amount" value={monthlyAmount} onChange={setMonthlyAmount} />
          <Field label="Trial days" value={trialDays} onChange={setTrialDays} />
          <Field label="Temporary password, optional" value={password} onChange={setPassword} placeholder="Leave blank to auto-generate" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-slate-300">
            <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
            Internal/demo account
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-slate-300">
            <input type="checkbox" checked={lifetimeAccess} onChange={(e) => setLifetimeAccess(e.target.checked)} />
            Lifetime access
          </label>
        </div>

        <button disabled={creating} className="mt-8 rounded-2xl bg-white px-6 py-4 font-black text-slate-950 disabled:opacity-50">
          {creating ? 'Creating...' : 'Create business and owner login'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
      />
    </label>
  )
}
