'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string
  email: string | null
  plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  billing_type: string | null
  monthly_amount: number | null
  lifetime_access: boolean | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

export default function AdminSubscriptionsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSubscriptions()
  }, [])

  async function loadSubscriptions() {
    setLoading(true)
    const { data, error } = await supabase.from('businesses').select('id,business_name,email,plan,subscription_status,trial_ends_at,billing_type,monthly_amount,lifetime_access,stripe_customer_id,stripe_subscription_id').order('business_name')

    if (error) setMessage(error.message)

    setBusinesses((data as Business[]) || [])
    setLoading(false)
  }

  async function updateBusiness(business: Business, patch: Partial<Business>, action: string) {
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('businesses').update(patch).eq('id', business.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase.from('subscription_overrides').insert({
      business_id: business.id,
      billing_type: patch.billing_type || business.billing_type || 'manual',
      override_plan: patch.plan || business.plan,
      monthly_amount: patch.monthly_amount ?? business.monthly_amount ?? 0,
      lifetime_access: patch.lifetime_access ?? business.lifetime_access ?? false,
      notes: action,
      created_by: userData.user?.email || 'unknown',
    })

    await supabase.from('audit_logs').insert({
      actor_email: userData.user?.email || 'unknown',
      action,
      entity_type: 'business',
      entity_id: business.id,
      metadata: patch,
    })

    setMessage('Subscription updated.')
    await loadSubscriptions()
  }

  async function extendTrial(business: Business) {
    const days = window.prompt('Extend trial by how many days?', '14')
    if (!days) return

    const date = new Date(business.trial_ends_at || new Date())
    date.setDate(date.getDate() + Number(days))

    await updateBusiness(business, { trial_ends_at: date.toISOString(), subscription_status: 'trialing' }, 'trial_extended')
  }

  const metrics = useMemo(() => {
    return {
      stripe: businesses.filter((b) => b.billing_type === 'stripe').length,
      manual: businesses.filter((b) => b.billing_type === 'manual').length,
      lifetime: businesses.filter((b) => b.lifetime_access).length,
      trial: businesses.filter((b) => b.subscription_status === 'trialing').length,
    }
  }, [businesses])

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">Billing control</p>
        <h1 className="mt-2 text-4xl font-black">Subscriptions</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Change plans, extend trials, grant lifetime access and bypass Stripe where needed.</p>
      </div>

      {message && <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">{message}</div>}
      {loading && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">Loading subscriptions...</div>}

      {!loading && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <StatCard label="Stripe billing" value={metrics.stripe} />
            <StatCard label="Manual billing" value={metrics.manual} />
            <StatCard label="Lifetime" value={metrics.lifetime} />
            <StatCard label="Trials" value={metrics.trial} />
          </section>

          <section className="space-y-4">
            {businesses.map((business) => (
              <div key={business.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                  <div>
                    <h2 className="text-xl font-black">{business.business_name}</h2>
                    <p className="mt-1 text-sm text-slate-400">{business.email || 'No email'}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Plan: {business.plan || 'none'} · Status: {business.subscription_status || 'none'} · Billing: {business.billing_type || 'stripe'} · Monthly: {money(Number(business.monthly_amount || 0))}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Trial ends: {business.trial_ends_at ? new Date(business.trial_ends_at).toLocaleDateString('en-GB') : 'none'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {['starter', 'growth', 'premium', 'enterprise'].map((plan) => (
                      <button key={plan} onClick={() => updateBusiness(business, { plan }, `plan_changed_to_${plan}`)} className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/10">
                        {plan}
                      </button>
                    ))}
                    <button onClick={() => extendTrial(business)} className="rounded-xl bg-blue-500/15 px-3 py-2 text-sm font-bold text-blue-300">Extend trial</button>
                    <button onClick={() => updateBusiness(business, { billing_type: 'manual' }, 'billing_type_manual')} className="rounded-xl bg-violet-500/15 px-3 py-2 text-sm font-bold text-violet-300">Manual</button>
                    <button onClick={() => updateBusiness(business, { lifetime_access: !business.lifetime_access, billing_type: !business.lifetime_access ? 'lifetime' : 'stripe' }, 'lifetime_access_toggled')} className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-300">
                      {business.lifetime_access ? 'Remove lifetime' : 'Lifetime'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
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
