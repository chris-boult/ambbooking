'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

const PACKAGE_FEATURE_KEY = 'packages'
const PACKAGE_ASSIGNMENT_FEATURE_KEY = 'package_assignments'
const PACKAGE_USAGE_FEATURE_KEY = 'package_session_usage'

type Package = {
  id: string
  business_id: string
  name: string
  description: string | null
  total_sessions: number
  price: number
  active: boolean
  created_at: string
}

type CustomerPackage = {
  id: string
  business_id: string
  customer_id: string
  package_id: string
  sessions_purchased: number
  sessions_used: number
  sessions_remaining: number
  purchase_date: string
  expiry_date: string | null
  status: string
}

type Customer = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
}

type Business = {
  id: string
  plan?: string | null
  status?: string | null
  lifetime_access?: boolean | null
}

type BusinessFeature = {
  id?: string
  business_id?: string
  feature_key?: string | null
  feature?: string | null
  key?: string | null
  enabled?: boolean | null
  is_enabled?: boolean | null
  active?: boolean | null
  status?: string | null
}

type FeatureState = {
  packages: boolean
  packageAssignments: boolean
  packageUsage: boolean
}

const defaultFeatureState: FeatureState = {
  packages: false,
  packageAssignments: false,
  packageUsage: false,
}

const planFeatures: Record<string, FeatureState> = {
  starter: {
    packages: false,
    packageAssignments: false,
    packageUsage: false,
  },
  growth: {
    packages: true,
    packageAssignments: true,
    packageUsage: true,
  },
  pro: {
    packages: true,
    packageAssignments: true,
    packageUsage: true,
  },
  agency: {
    packages: true,
    packageAssignments: true,
    packageUsage: true,
  },
  enterprise: {
    packages: true,
    packageAssignments: true,
    packageUsage: true,
  },
}

export default function PackagesPage() {
  const [businessId, setBusinessId] = useState('')
  const [business, setBusiness] = useState<Business | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [features, setFeatures] = useState<FeatureState>(defaultFeatureState)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [packageName, setPackageName] = useState('')
  const [packageDescription, setPackageDescription] = useState('')
  const [packageSessions, setPackageSessions] = useState('5')
  const [packagePrice, setPackagePrice] = useState('100')

  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function getBusinessId() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return ''

    const { data: ownerBusiness } = await supabase
      .from('businesses')
      .select('id, plan, status, lifetime_access')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (ownerBusiness) {
      setBusiness(ownerBusiness as Business)
      return (ownerBusiness as Business).id
    }

    const { data: userBusiness } = await supabase
      .from('businesses')
      .select('id, plan, status, lifetime_access')
      .eq('user_id', user.id)
      .maybeSingle()

    if (userBusiness) {
      setBusiness(userBusiness as Business)
      return (userBusiness as Business).id
    }

    const { data: anyBusiness } = await supabase
      .from('businesses')
      .select('id, plan, status, lifetime_access')
      .limit(1)
      .maybeSingle()

    if (anyBusiness) {
      setBusiness(anyBusiness as Business)
      return (anyBusiness as Business).id
    }

    return ''
  }

  async function loadFeatureState(foundBusinessId: string, loadedBusiness?: Business | null) {
    const plan = String(loadedBusiness?.plan || business?.plan || 'starter').toLowerCase()
    const baseFeatures = loadedBusiness?.lifetime_access
      ? planFeatures.enterprise
      : planFeatures[plan] || defaultFeatureState

    const nextFeatures: FeatureState = {
      ...baseFeatures,
    }

    const { data } = await supabase
      .from('business_features')
      .select('*')
      .eq('business_id', foundBusinessId)

    const rows = ((data || []) as BusinessFeature[])

    rows.forEach((row) => {
      const key = row.feature_key || row.feature || row.key || ''
      const enabled =
        row.enabled === true ||
        row.is_enabled === true ||
        row.active === true ||
        row.status === 'active' ||
        row.status === 'enabled'

      const disabled =
        row.enabled === false ||
        row.is_enabled === false ||
        row.active === false ||
        row.status === 'disabled' ||
        row.status === 'inactive'

      if (key === PACKAGE_FEATURE_KEY) {
        nextFeatures.packages = enabled || (!disabled && nextFeatures.packages)
      }

      if (key === PACKAGE_ASSIGNMENT_FEATURE_KEY) {
        nextFeatures.packageAssignments = enabled || (!disabled && nextFeatures.packageAssignments)
      }

      if (key === PACKAGE_USAGE_FEATURE_KEY) {
        nextFeatures.packageUsage = enabled || (!disabled && nextFeatures.packageUsage)
      }
    })

    setFeatures(nextFeatures)
    return nextFeatures
  }

  async function loadData() {
    setLoading(true)
    setMessage('')

    const foundBusinessId = await getBusinessId()

    if (!foundBusinessId) {
      setMessage('No business found.')
      setLoading(false)
      return
    }

    setBusinessId(foundBusinessId)

    const { data: businessData } = await supabase
      .from('businesses')
      .select('id, plan, status, lifetime_access')
      .eq('id', foundBusinessId)
      .maybeSingle()

    if (businessData) setBusiness(businessData as Business)

    await loadFeatureState(foundBusinessId, businessData as Business)

    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .select('*')
      .eq('business_id', foundBusinessId)
      .order('created_at', { ascending: false })

    if (packageError) {
      setMessage(packageError.message)
      setLoading(false)
      return
    }

    const { data: customerPackageData, error: customerPackageError } =
      await supabase
        .from('customer_packages')
        .select('*')
        .eq('business_id', foundBusinessId)
        .order('purchase_date', { ascending: false })

    if (customerPackageError) {
      setMessage(customerPackageError.message)
      setLoading(false)
      return
    }

    const { data: customerData } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email')
      .eq('business_id', foundBusinessId)
      .order('first_name', { ascending: true })

    setPackages((packageData as Package[]) || [])
    setCustomerPackages((customerPackageData as CustomerPackage[]) || [])
    setCustomers((customerData as Customer[]) || [])
    setLoading(false)
  }

  function requireFeature(enabled: boolean, featureName: string) {
    if (enabled) return true
    setMessage(`${featureName} is not included on this plan. Upgrade the business plan to unlock it.`)
    return false
  }

  async function createPackage() {
    setMessage('')

    if (!requireFeature(features.packages, 'Packages')) return

    if (!businessId || !packageName || !packageSessions || !packagePrice) {
      setMessage('Please complete the package name, number of sessions and sale price.')
      return
    }

    const sessions = Number(packageSessions)
    const price = Number(packagePrice)

    if (!sessions || sessions <= 0) {
      setMessage('Please enter a valid number of sessions included in this package.')
      return
    }

    if (!price || price <= 0) {
      setMessage('Please enter a valid package sale price.')
      return
    }

    const { error } = await supabase.from('packages').insert({
      business_id: businessId,
      name: packageName.trim(),
      description: packageDescription.trim() || null,
      total_sessions: sessions,
      price,
      active: true,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setPackageName('')
    setPackageDescription('')
    setPackageSessions('5')
    setPackagePrice('100')
    setMessage('Package type created.')

    await loadData()
  }

  async function assignPackageToCustomer() {
    setMessage('')

    if (!requireFeature(features.packageAssignments, 'Package assignment')) return

    if (!businessId || !selectedCustomerId || !selectedPackageId) {
      setMessage('Please choose a customer and a package type to assign.')
      return
    }

    const selectedPackage = packages.find(
      (item) => item.id === selectedPackageId
    )

    if (!selectedPackage) {
      setMessage('Package type not found.')
      return
    }

    if (!selectedPackage.active) {
      setMessage('This package type is inactive and cannot be assigned.')
      return
    }

    const { error } = await supabase.from('customer_packages').insert({
      business_id: businessId,
      customer_id: selectedCustomerId,
      package_id: selectedPackage.id,
      sessions_purchased: selectedPackage.total_sessions,
      sessions_used: 0,
      sessions_remaining: selectedPackage.total_sessions,
      expiry_date: expiryDate || null,
      status: 'active',
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setSelectedCustomerId('')
    setSelectedPackageId('')
    setExpiryDate('')
    setMessage('Package assigned to customer.')

    await loadData()
  }

  async function updatePackageStatus(id: string, active: boolean) {
    setMessage('')

    if (!requireFeature(features.packages, 'Package management')) return

    const { error } = await supabase
      .from('packages')
      .update({ active })
      .eq('id', id)
      .eq('business_id', businessId)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadData()
  }

  async function useSession(customerPackage: CustomerPackage) {
    setMessage('')

    if (!requireFeature(features.packageUsage, 'Package session usage')) return

    if (customerPackage.sessions_remaining <= 0) {
      setMessage('This customer package has no sessions remaining.')
      return
    }

    const newUsed = customerPackage.sessions_used + 1
    const newRemaining = customerPackage.sessions_remaining - 1
    const newStatus = newRemaining <= 0 ? 'used' : 'active'

    const { error } = await supabase
      .from('customer_packages')
      .update({
        sessions_used: newUsed,
        sessions_remaining: newRemaining,
        status: newStatus,
      })
      .eq('id', customerPackage.id)
      .eq('business_id', businessId)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadData()
  }

  async function cancelCustomerPackage(id: string) {
    setMessage('')

    if (!requireFeature(features.packageAssignments, 'Package assignment')) return

    const { error } = await supabase
      .from('customer_packages')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('business_id', businessId)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadData()
  }

  function getCustomer(id: string) {
    return customers.find((customer) => customer.id === id)
  }

  function getPackage(id: string) {
    return packages.find((item) => item.id === id)
  }

  const activeCustomerPackages = customerPackages.filter(
    (item) => item.status === 'active'
  )

  const fullyUsedCustomerPackages = customerPackages.filter(
    (item) => item.status === 'used'
  )

  const remainingSessions = customerPackages
    .filter((item) => item.status === 'active')
    .reduce((sum, item) => sum + Number(item.sessions_remaining || 0), 0)

  const currentPlan = useMemo(() => {
    return String(business?.plan || 'starter').toUpperCase()
  }, [business?.plan])

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-white">
        <div className="rounded-[2rem] border border-white/10 bg-[#07111f] px-8 py-6 font-black text-slate-300 shadow-[0_50px_180px_rgba(0,0,0,.45)]">
          Loading packages...
        </div>
      </main>
    )
  }

  if (!features.packages) {
    return (
      <main className="space-y-8 text-white">
        <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
          <p className="mb-6 inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-amber-300">
            Upgrade required
          </p>
          <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.055em] md:text-6xl">
            Packages are not included on this plan.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-400">
            Prepaid package selling and package balance tracking are not included on the current {currentPlan} plan.
          </p>
        </section>

        <LockedFeatureCard
          title="Packages are locked"
          description="Upgrade this business to unlock prepaid session bundles, customer package balances and package session usage."
          feature="Packages"
          plan={currentPlan}
        />
      </main>
    )
  }

  return (
    <main className="space-y-8 text-white">
      <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
              Package centre
            </div>

            <h1 className="max-w-5xl text-5xl font-black leading-[1.02] tracking-[-0.055em] md:text-6xl">
              Sell prepaid packages and track every session.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-400">
              Create prepaid session bundles, assign packages to customers, monitor balances and consume sessions from one polished commercial dashboard.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              Current plan
            </p>
            <p className="mt-2 text-3xl font-black text-white">{currentPlan}</p>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-4 text-sm font-bold text-cyan-100">
          {message}
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Package types created" value={packages.length.toString()} />
        <StatCard title="Active customer packages" value={activeCustomerPackages.length.toString()} />
        <StatCard title="Fully used packages" value={fullyUsedCustomerPackages.length.toString()} />
        <StatCard title="Sessions still owed" value={remainingSessions.toString()} />
      </div>

      <div className="grid xl:grid-cols-3 gap-4 mb-8">
        <FeatureStatusCard
          title="Package products"
          enabled={features.packages}
          description="Create and manage prepaid session bundle products."
        />
        <FeatureStatusCard
          title="Customer assignment"
          enabled={features.packageAssignments}
          description="Assign purchased package balances to customer records."
        />
        <FeatureStatusCard
          title="Session usage"
          enabled={features.packageUsage}
          description="Manually consume sessions from customer package balances."
        />
      </div>

      <div className="grid xl:grid-cols-2 gap-8 mb-8">
        <div className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.42)]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Create a package type</h2>
              <p className="text-slate-400">
                This creates the package product, for example “5 Haircuts” or “10 PT Sessions”.
              </p>
            </div>
            {!features.packages && <SmallLockedBadge />}
          </div>

          {!features.packages && (
            <LockedInline message="Package creation is not included on this plan." />
          )}

          <div className={`grid gap-4 ${!features.packages ? 'pointer-events-none opacity-40' : ''}`}>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Package name
              </label>
              <input
                value={packageName}
                onChange={(event) => setPackageName(event.target.value)}
                placeholder="Example: 5 Haircuts"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Internal description
              </label>
              <textarea
                value={packageDescription}
                onChange={(event) => setPackageDescription(event.target.value)}
                placeholder="Example: Customer receives 5 standard haircut appointments."
                className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Number of sessions included
                </label>
                <input
                  value={packageSessions}
                  onChange={(event) => setPackageSessions(event.target.value)}
                  placeholder="Example: 5"
                  type="number"
                  min="1"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Package sale price (£)
                </label>
                <input
                  value={packagePrice}
                  onChange={(event) => setPackagePrice(event.target.value)}
                  placeholder="Example: 100"
                  type="number"
                  min="1"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={createPackage}
              className="rounded-2xl bg-cyan-400 px-6 py-4 font-black text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.25)] transition hover:-translate-y-1 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!features.packages}
            >
              Create package type
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.42)]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Assign package to customer</h2>
              <p className="text-slate-400">
                Use this when a customer has bought a package and you want to add the sessions to their account.
              </p>
            </div>
            {!features.packageAssignments && <SmallLockedBadge />}
          </div>

          {!features.packageAssignments && (
            <LockedInline message="Customer package assignment is not included on this plan." />
          )}

          <div className={`grid gap-4 ${!features.packageAssignments ? 'pointer-events-none opacity-40' : ''}`}>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Customer
              </label>
              <select
                value={selectedCustomerId}
                onChange={(event) => setSelectedCustomerId(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
              >
                <option value="">Choose customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.first_name} {customer.last_name || ''} —{' '}
                    {customer.email || 'No email'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Package to assign
              </label>
              <select
                value={selectedPackageId}
                onChange={(event) => setSelectedPackageId(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
              >
                <option value="">Choose package type</option>
                {packages
                  .filter((item) => item.active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {item.total_sessions} sessions — £
                      {Number(item.price).toFixed(2)}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Expiry date optional
              </label>
              <input
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
                type="date"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
              />
            </div>

            <button
              type="button"
              onClick={assignPackageToCustomer}
              className="rounded-2xl bg-cyan-400 px-6 py-4 font-black text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.25)] transition hover:-translate-y-1 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!features.packageAssignments}
            >
              Assign package to customer
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.42)] mb-8">
        <h2 className="text-2xl font-bold mb-2">Package types</h2>
        <p className="text-slate-400 mb-6">
          These are the package products this business can sell.
        </p>

        {packages.length === 0 && (
          <p className="text-slate-400">No package types created yet.</p>
        )}

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {packages.map((item) => (
            <div
              key={item.id}
              className="rounded-[2rem] border border-white/10 bg-slate-950 p-6 transition hover:-translate-y-1 hover:border-cyan-300/30"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-bold">{item.name}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${
                  item.active
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-red-500/10 text-red-300'
                }`}>
                  {item.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p className="text-slate-400 mt-2">
                {item.description || 'No internal description added.'}
              </p>

              <div className="mt-4 grid gap-2 text-sm text-slate-300">
                <p>
                  <span className="text-slate-500">Sessions included:</span>{' '}
                  {item.total_sessions}
                </p>
                <p>
                  <span className="text-slate-500">Sale price:</span> £
                  {Number(item.price).toFixed(2)}
                </p>
                <p>
                  <span className="text-slate-500">Feature access:</span>{' '}
                  <span className={features.packages ? 'text-emerald-400' : 'text-red-400'}>
                    {features.packages ? 'unlocked' : 'locked'}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => updatePackageStatus(item.id, !item.active)}
                className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!features.packages}
              >
                {item.active ? 'Deactivate package type' : 'Reactivate package type'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-2">Customer package balances</h2>
        <p className="text-slate-400 mb-6">
          These show which customers have packages, how many sessions they bought and how many are left.
        </p>

        {customerPackages.length === 0 && (
          <div className="rounded-[2rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_40px_140px_rgba(0,0,0,.35)] text-slate-400">
            No customer packages assigned yet.
          </div>
        )}

        <div className="space-y-4">
          {customerPackages.map((item) => {
            const customer = getCustomer(item.customer_id)
            const packageItem = getPackage(item.package_id)
            const progress =
              item.sessions_purchased > 0
                ? Math.min(100, (item.sessions_used / item.sessions_purchased) * 100)
                : 0

            return (
              <div
                key={item.id}
                className="rounded-[2rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_40px_140px_rgba(0,0,0,.35)]"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold">
                        {customer
                          ? `${customer.first_name} ${customer.last_name || ''}`
                          : 'Unknown customer'}
                      </h3>

                      <span
                        className={
                          item.status === 'active'
                            ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300'
                            : item.status === 'used'
                              ? 'rounded-full bg-sky-500/10 px-3 py-1 text-xs font-black text-sky-300'
                              : 'rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-300'
                        }
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="text-slate-400">{customer?.email || 'No customer email'}</p>

                    <div className="mt-4 grid gap-2 text-sm text-slate-300">
                      <p>
                        <span className="text-slate-500">Package type:</span>{' '}
                        {packageItem?.name || 'Unknown package'}
                      </p>

                      <p>
                        <span className="text-slate-500">Sessions purchased:</span>{' '}
                        {item.sessions_purchased}
                      </p>

                      <p>
                        <span className="text-slate-500">Sessions used:</span>{' '}
                        {item.sessions_used}
                      </p>

                      <p>
                        <span className="text-slate-500">Sessions remaining:</span>{' '}
                        {item.sessions_remaining}
                      </p>

                      {item.expiry_date && (
                        <p>
                          <span className="text-slate-500">Expiry date:</span>{' '}
                          {new Date(item.expiry_date).toLocaleDateString('en-GB')}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {item.status === 'active' && (
                      <>
                        <button
                          type="button"
                          onClick={() => useSession(item)}
                          className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-black text-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!features.packageUsage}
                        >
                          Use one session
                        </button>

                        <button
                          type="button"
                          onClick={() => cancelCustomerPackage(item.id)}
                          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm font-black text-red-200 transition hover:-translate-y-0.5 hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!features.packageAssignments}
                        >
                          Cancel customer package
                        </button>
                      </>
                    )}

                    {!features.packageUsage && (
                      <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">
                        Session usage is locked on this plan.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#07111f] p-6 shadow-[0_40px_140px_rgba(0,0,0,.32)]">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-3 text-4xl font-black tracking-[-0.05em] text-white">{value}</p>
    </div>
  )
}

function FeatureStatusCard({
  title,
  enabled,
  description,
}: {
  title: string
  enabled: boolean
  description: string
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#07111f] p-6 shadow-[0_40px_140px_rgba(0,0,0,.32)]">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="font-black">{title}</h3>
        <span
          className={
            enabled
              ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300'
              : 'rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-300'
          }
        >
          {enabled ? 'Unlocked' : 'Locked'}
        </span>
      </div>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  )
}

function LockedFeatureCard({
  title,
  description,
  feature,
  plan,
}: {
  title: string
  description: string
  feature: string
  plan: string
}) {
  return (
    <div className="max-w-3xl rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-amber-300">
        Upgrade required
      </p>
      <h2 className="text-3xl font-black text-white">{title}</h2>
      <p className="mt-3 text-slate-300">{description}</p>
      <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
        <p>
          <span className="font-black text-white">Feature:</span> {feature}
        </p>
        <p>
          <span className="font-black text-white">Current plan:</span> {plan}
        </p>
        <p>
          <span className="font-black text-white">Action:</span> Enable this feature from the platform admin feature controls or move the business to a package-enabled plan.
        </p>
      </div>
    </div>
  )
}

function LockedInline({ message }: { message: string }) {
  return (
    <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-semibold text-amber-200">
      {message}
    </div>
  )
}

function SmallLockedBadge() {
  return (
    <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">
      Locked
    </span>
  )
}
