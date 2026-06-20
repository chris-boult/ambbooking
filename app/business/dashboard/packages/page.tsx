'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
}

export default function PackagesPage() {
  const [businessId, setBusinessId] = useState('')
  const [packages, setPackages] = useState<Package[]>([])
  const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
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
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (ownerBusiness) return (ownerBusiness as Business).id

    const { data: userBusiness } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (userBusiness) return (userBusiness as Business).id

    const { data: anyBusiness } = await supabase
      .from('businesses')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (anyBusiness) return (anyBusiness as Business).id

    return ''
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

  async function createPackage() {
    setMessage('')

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
      name: packageName,
      description: packageDescription || null,
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
    const { error } = await supabase
      .from('packages')
      .update({ active })
      .eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadData()
  }

  async function useSession(customerPackage: CustomerPackage) {
    setMessage('')

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

    if (error) {
      setMessage(error.message)
      return
    }

    await loadData()
  }

  async function cancelCustomerPackage(id: string) {
    const { error } = await supabase
      .from('customer_packages')
      .update({ status: 'cancelled' })
      .eq('id', id)

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

  if (loading) {
    return <div className="p-8 text-white">Loading packages...</div>
  }

  return (
    <div className="p-8 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Packages</h1>
        <p className="text-slate-400">
          Create prepaid session bundles, assign them to customers and track remaining sessions.
        </p>
      </div>

      {message && (
        <div className="mb-6 bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-300">
          {message}
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Package types created" value={packages.length.toString()} />
        <StatCard title="Active customer packages" value={activeCustomerPackages.length.toString()} />
        <StatCard title="Fully used packages" value={fullyUsedCustomerPackages.length.toString()} />
        <StatCard title="Sessions still owed" value={remainingSessions.toString()} />
      </div>

      <div className="grid xl:grid-cols-2 gap-8 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-2">Create a package type</h2>
          <p className="text-slate-400 mb-6">
            This creates the package product, for example “5 Haircuts” or “10 PT Sessions”.
          </p>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Package name
              </label>
              <input
                value={packageName}
                onChange={(event) => setPackageName(event.target.value)}
                placeholder="Example: 5 Haircuts"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
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
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white min-h-28"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={createPackage}
              className="bg-white text-slate-950 font-bold px-6 py-3 rounded-lg"
            >
              Create package type
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-2">Assign package to customer</h2>
          <p className="text-slate-400 mb-6">
            Use this when a customer has bought a package and you want to add the sessions to their account.
          </p>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Customer
              </label>
              <select
                value={selectedCustomerId}
                onChange={(event) => setSelectedCustomerId(event.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
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
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
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
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
              />
            </div>

            <button
              type="button"
              onClick={assignPackageToCustomer}
              className="bg-white text-slate-950 font-bold px-6 py-3 rounded-lg"
            >
              Assign package to customer
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
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
              className="bg-slate-950 border border-slate-800 rounded-xl p-5"
            >
              <h3 className="text-xl font-bold">{item.name}</h3>

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
                  <span className="text-slate-500">Package status:</span>{' '}
                  <span className={item.active ? 'text-emerald-400' : 'text-red-400'}>
                    {item.active ? 'active' : 'inactive'}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => updatePackageStatus(item.id, !item.active)}
                className="mt-4 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold"
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400">
            No customer packages assigned yet.
          </div>
        )}

        <div className="space-y-4">
          {customerPackages.map((item) => {
            const customer = getCustomer(item.customer_id)
            const packageItem = getPackage(item.package_id)

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">
                      {customer
                        ? `${customer.first_name} ${customer.last_name || ''}`
                        : 'Unknown customer'}
                    </h3>

                    <p className="text-slate-400">{customer?.email}</p>

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

                      <p>
                        <span className="text-slate-500">Customer package status:</span>{' '}
                        <span
                          className={
                            item.status === 'active'
                              ? 'text-emerald-400'
                              : item.status === 'used'
                                ? 'text-sky-400'
                                : 'text-red-400'
                          }
                        >
                          {item.status}
                        </span>
                      </p>

                      {item.expiry_date && (
                        <p>
                          <span className="text-slate-500">Expiry date:</span>{' '}
                          {new Date(item.expiry_date).toLocaleDateString('en-GB')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {item.status === 'active' && (
                      <>
                        <button
                          type="button"
                          onClick={() => useSession(item)}
                          className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg font-semibold"
                        >
                          Use one session
                        </button>

                        <button
                          type="button"
                          onClick={() => cancelCustomerPackage(item.id)}
                          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold"
                        >
                          Cancel customer package
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-slate-400 text-sm mb-2">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}