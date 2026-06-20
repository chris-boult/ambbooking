'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type WaitingListEntry = {
  id: string
  business_id: string
  customer_id: string | null
  service_id: string
  team_member_id: string | null
  preferred_date: string
  preferred_time_range: string
  status: string
  notified_at: string | null
  expires_at: string | null
  notification_batch: number | null
  created_at: string
}

type Customer = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
}

type Service = {
  id: string
  name: string
}

type TeamMember = {
  id: string
  full_name: string
}

type Business = {
  id: string
}

function uniqueValues(values: (string | null)[]) {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

export default function WaitingListPage() {
  const [businessId, setBusinessId] = useState('')
  const [entries, setEntries] = useState<WaitingListEntry[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [newCustomerId, setNewCustomerId] = useState('')
  const [newServiceId, setNewServiceId] = useState('')
  const [newTeamMemberId, setNewTeamMemberId] = useState('')
  const [newPreferredDate, setNewPreferredDate] = useState('')
  const [newTimeRange, setNewTimeRange] = useState('any')

  const activeEntries = entries.filter((entry) => entry.status === 'waiting')
  const notifiedEntries = entries.filter((entry) => entry.status === 'notified')
  const bookedEntries = entries.filter((entry) => entry.status === 'booked')
  const expiredEntries = entries.filter((entry) => entry.status === 'expired')
  const removedEntries = entries.filter((entry) => entry.status === 'removed')

  const serviceCounts = useMemo(() => {
    return services.map((service) => {
      const count = entries.filter(
        (entry) =>
          entry.service_id === service.id &&
          ['waiting', 'notified'].includes(entry.status)
      ).length

      return {
        serviceName: service.name,
        count,
      }
    })
  }, [entries, services])

  function getCustomer(customerId: string | null) {
    return customers.find((customer) => customer.id === customerId)
  }

  function getService(serviceId: string) {
    return services.find((service) => service.id === serviceId)
  }

  function getTeamMember(teamMemberId: string | null) {
    return teamMembers.find((teamMember) => teamMember.id === teamMemberId)
  }

  async function loadData() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      setMessage('You need to be logged in.')
      return
    }

    let business: Business | null = null

    const { data: ownerBusiness } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (ownerBusiness) {
      business = ownerBusiness as Business
    }

    if (!business) {
      const { data: userBusiness } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (userBusiness) {
        business = userBusiness as Business
      }
    }

    if (!business) {
      const { data: anyBusiness } = await supabase
        .from('businesses')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (anyBusiness) {
        business = anyBusiness as Business
      }
    }

    if (!business) {
      setLoading(false)
      setMessage('No business found.')
      return
    }

    setBusinessId(business.id)

    const { data: serviceData } = await supabase
      .from('services')
      .select('id, name')
      .eq('business_id', business.id)
      .order('name', { ascending: true })

    const { data: teamData } = await supabase
      .from('team_members')
      .select('id, full_name')
      .eq('business_id', business.id)
      .order('full_name', { ascending: true })

    const { data: waitingData, error: waitingError } = await supabase
      .from('waiting_list')
      .select(`
        id,
        business_id,
        customer_id,
        service_id,
        team_member_id,
        preferred_date,
        preferred_time_range,
        status,
        notified_at,
        expires_at,
        notification_batch,
        created_at
      `)
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    if (waitingError) {
      setMessage(waitingError.message)
      setLoading(false)
      return
    }

    const waitingEntries = (waitingData as WaitingListEntry[]) || []
    const customerIds = uniqueValues(
      waitingEntries.map((entry) => entry.customer_id)
    )

    let customerData: Customer[] = []

    if (customerIds.length > 0) {
      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email')
        .in('id', customerIds)

      customerData = (data as Customer[]) || []
    }

    const { data: allCustomerData } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email')
      .eq('business_id', business.id)
      .order('first_name', { ascending: true })

    setServices((serviceData as Service[]) || [])
    setTeamMembers((teamData as TeamMember[]) || [])
    setEntries(waitingEntries)

    const combinedCustomers = [
      ...((allCustomerData as Customer[]) || []),
      ...customerData,
    ]

    const dedupedCustomers = Array.from(
      new Map(combinedCustomers.map((customer) => [customer.id, customer])).values()
    )

    setCustomers(dedupedCustomers)
    setLoading(false)
  }

  async function addWaitingListEntry() {
    setMessage('')

    if (!businessId || !newCustomerId || !newServiceId || !newPreferredDate) {
      setMessage('Please choose a customer, service and preferred date.')
      return
    }

    const { error } = await supabase.from('waiting_list').insert({
      business_id: businessId,
      customer_id: newCustomerId,
      service_id: newServiceId,
      team_member_id: newTeamMemberId || null,
      preferred_date: newPreferredDate,
      preferred_time_range: newTimeRange,
      status: 'waiting',
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setNewCustomerId('')
    setNewServiceId('')
    setNewTeamMemberId('')
    setNewPreferredDate('')
    setNewTimeRange('any')
    setMessage('Customer added to the waiting list.')
    await loadData()
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from('waiting_list')
      .update({ status })
      .eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadData()
  }

  async function notifyNow(entry: WaitingListEntry) {
    const time = window.prompt(
      'What time has become available? Use 24-hour format, for example 14:30'
    )

    if (!time) return

    await fetch('/api/process-waiting-list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_id: entry.business_id,
        service_id: entry.service_id,
        team_member_id: entry.team_member_id,
        booking_date: entry.preferred_date,
        booking_time: time,
      }),
    })

    await loadData()
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return <div className="p-8 text-white">Loading waiting list...</div>
  }

  return (
    <div className="p-8 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Waiting List</h1>
        <p className="text-slate-400">
          Manage customers waiting for cancelled or newly available slots.
        </p>
      </div>

      {message && (
        <div className="mb-6 bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-300">
          {message}
        </div>
      )}

      <div className="grid md:grid-cols-5 gap-4 mb-8">
        <StatCard title="Waiting" value={activeEntries.length} />
        <StatCard title="Notified" value={notifiedEntries.length} />
        <StatCard title="Booked" value={bookedEntries.length} />
        <StatCard title="Expired" value={expiredEntries.length} />
        <StatCard title="Removed" value={removedEntries.length} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Add customer to waiting list</h2>

        <div className="grid md:grid-cols-5 gap-4">
          <select
            value={newCustomerId}
            onChange={(event) => setNewCustomerId(event.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
          >
            <option value="">Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.first_name} {customer.last_name || ''} —{' '}
                {customer.email || 'No email'}
              </option>
            ))}
          </select>

          <select
            value={newServiceId}
            onChange={(event) => setNewServiceId(event.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
          >
            <option value="">Service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>

          <select
            value={newTeamMemberId}
            onChange={(event) => setNewTeamMemberId(event.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
          >
            <option value="">Any team member</option>
            {teamMembers.map((teamMember) => (
              <option key={teamMember.id} value={teamMember.id}>
                {teamMember.full_name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={newPreferredDate}
            onChange={(event) => setNewPreferredDate(event.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
          />

          <select
            value={newTimeRange}
            onChange={(event) => setNewTimeRange(event.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
          >
            <option value="any">Any time</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
          </select>
        </div>

        <button
          type="button"
          onClick={addWaitingListEntry}
          className="mt-4 bg-white text-slate-950 font-bold px-6 py-3 rounded-lg"
        >
          Add to waiting list
        </button>
      </div>

      {serviceCounts.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Demand by service</h2>

          <div className="grid md:grid-cols-3 gap-4">
            {serviceCounts.map((item) => (
              <div
                key={item.serviceName}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4"
              >
                <p className="text-slate-400 text-sm">{item.serviceName}</p>
                <p className="text-3xl font-bold">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <WaitingListSection
        title="Active waiting list"
        entries={activeEntries}
        getCustomer={getCustomer}
        getService={getService}
        getTeamMember={getTeamMember}
        onNotify={notifyNow}
        onRemove={(id) => updateStatus(id, 'removed')}
        onBooked={(id) => updateStatus(id, 'booked')}
      />

      <WaitingListSection
        title="Notified customers"
        entries={notifiedEntries}
        getCustomer={getCustomer}
        getService={getService}
        getTeamMember={getTeamMember}
        onRemove={(id) => updateStatus(id, 'removed')}
        onBooked={(id) => updateStatus(id, 'booked')}
      />

      <WaitingListSection
        title="Booked from waiting list"
        entries={bookedEntries}
        getCustomer={getCustomer}
        getService={getService}
        getTeamMember={getTeamMember}
      />

      <WaitingListSection
        title="Expired"
        entries={expiredEntries}
        getCustomer={getCustomer}
        getService={getService}
        getTeamMember={getTeamMember}
        onRemove={(id) => updateStatus(id, 'removed')}
      />

      <WaitingListSection
        title="Removed"
        entries={removedEntries}
        getCustomer={getCustomer}
        getService={getService}
        getTeamMember={getTeamMember}
      />
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-slate-400 text-sm mb-2">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}

function WaitingListSection({
  title,
  entries,
  getCustomer,
  getService,
  getTeamMember,
  onNotify,
  onRemove,
  onBooked,
}: {
  title: string
  entries: WaitingListEntry[]
  getCustomer: (id: string | null) => Customer | undefined
  getService: (id: string) => Service | undefined
  getTeamMember: (id: string | null) => TeamMember | undefined
  onNotify?: (entry: WaitingListEntry) => void
  onRemove?: (id: string) => void
  onBooked?: (id: string) => void
}) {
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>

      {entries.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400">
          No entries found.
        </div>
      )}

      <div className="space-y-4">
        {entries.map((entry) => {
          const customer = getCustomer(entry.customer_id)
          const service = getService(entry.service_id)
          const teamMember = getTeamMember(entry.team_member_id)

          return (
            <div
              key={entry.id}
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
                      <span className="text-slate-500">Service:</span>{' '}
                      {service?.name || 'Unknown'}
                    </p>

                    <p>
                      <span className="text-slate-500">Team member:</span>{' '}
                      {teamMember?.full_name || 'Any team member'}
                    </p>

                    <p>
                      <span className="text-slate-500">Preferred date:</span>{' '}
                      {new Date(entry.preferred_date).toLocaleDateString(
                        'en-GB',
                        {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        }
                      )}
                    </p>

                    <p>
                      <span className="text-slate-500">Time preference:</span>{' '}
                      {entry.preferred_time_range}
                    </p>

                    <p>
                      <span className="text-slate-500">Status:</span>{' '}
                      <span className="text-sky-400">{entry.status}</span>
                    </p>

                    {entry.notified_at && (
                      <p>
                        <span className="text-slate-500">Notified:</span>{' '}
                        {new Date(entry.notified_at).toLocaleString('en-GB')}
                      </p>
                    )}

                    {entry.expires_at && (
                      <p>
                        <span className="text-slate-500">Expires:</span>{' '}
                        {new Date(entry.expires_at).toLocaleString('en-GB')}
                      </p>
                    )}

                    <p>
                      <span className="text-slate-500">Batch:</span>{' '}
                      {entry.notification_batch || 0}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {onNotify && (
                    <button
                      type="button"
                      onClick={() => onNotify(entry)}
                      className="bg-sky-600 hover:bg-sky-700 px-4 py-2 rounded-lg font-semibold"
                    >
                      Notify now
                    </button>
                  )}

                  {onBooked && (
                    <button
                      type="button"
                      onClick={() => onBooked(entry.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg font-semibold"
                    >
                      Mark booked
                    </button>
                  )}

                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(entry.id)}
                      className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}