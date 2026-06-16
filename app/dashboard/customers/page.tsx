'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Customer = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  notes: string | null
  vip: boolean | null
  marketing_opt_in: boolean | null
  last_visit: string | null
}

type Booking = {
  id: string
  customer_id: string
  booking_date: string
  booking_time: string
  status: string | null
  services:
    | {
        name: string
        price: number
      }[]
    | null
}

type Note = {
  id: string
  customer_id: string
  note: string
  created_at: string
}

type CustomerWithStats = Customer & {
  totalBookings: number
  totalSpend: number
  lastBooking: string | null
  nextBooking: string | null
  bookings: Booking[]
  notesList: Note[]
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [businessId, setBusinessId] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editVip, setEditVip] = useState(false)
  const [editMarketingOptIn, setEditMarketingOptIn] = useState(true)
  const [editLastVisit, setEditLastVisit] = useState('')

  const filteredCustomers = customers.filter((customer) => {
    const search = searchTerm.trim().toLowerCase()

    if (!search) return true

    const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase()
    const email = customer.email?.toLowerCase() || ''
    const phone = customer.phone?.toLowerCase() || ''
    const notes = customer.notes?.toLowerCase() || ''

    return (
      fullName.includes(search) ||
      email.includes(search) ||
      phone.includes(search) ||
      notes.includes(search)
    )
  })

  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) || null

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    if (!business) return

    setBusinessId(business.id)

    const { data: customerData } = await supabase
      .from('customers')
      .select(`
        id,
        business_id,
        first_name,
        last_name,
        email,
        phone,
        notes,
        vip,
        marketing_opt_in,
        last_visit,
        created_at
      `)
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    const { data: bookingData } = await supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        booking_date,
        booking_time,
        status,
        services(name,price)
      `)
      .eq('business_id', business.id)

    const { data: notesData } = await supabase
      .from('customer_notes')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    const today = new Date().toISOString().split('T')[0]

    const bookings = (bookingData as unknown as Booking[]) || []
    const notes = (notesData as Note[] | null) || []

    const enriched =
      (customerData as Customer[] | null)?.map((customer) => {
        const customerBookings = bookings.filter(
          (booking) => booking.customer_id === customer.id
        )

        const activeBookings = customerBookings.filter(
          (booking) =>
            booking.status !== 'cancelled' &&
            booking.status !== 'no_show'
        )

        const totalSpend = activeBookings.reduce((total, booking) => {
          return total + Number(booking.services?.[0]?.price || 0)
        }, 0)

        const pastBookings = activeBookings
          .filter((booking) => booking.booking_date < today)
          .sort((a, b) => b.booking_date.localeCompare(a.booking_date))

        const futureBookings = activeBookings
          .filter((booking) => booking.booking_date >= today)
          .sort((a, b) => a.booking_date.localeCompare(b.booking_date))

        const customerNotes = notes.filter(
          (item) => item.customer_id === customer.id
        )

        return {
          ...customer,
          totalBookings: activeBookings.length,
          totalSpend,
          lastBooking: customer.last_visit || pastBookings[0]?.booking_date || null,
          nextBooking: futureBookings[0]?.booking_date || null,
          bookings: customerBookings,
          notesList: customerNotes,
        }
      }) || []

    setCustomers(enriched)
  }

  function startEditing(customer: CustomerWithStats) {
    setIsEditing(true)
    setMessage('')
    setEditFirstName(customer.first_name || '')
    setEditLastName(customer.last_name || '')
    setEditEmail(customer.email || '')
    setEditPhone(customer.phone || '')
    setEditNotes(customer.notes || '')
    setEditVip(Boolean(customer.vip))
    setEditMarketingOptIn(customer.marketing_opt_in !== false)
    setEditLastVisit(customer.last_visit || '')
  }

  async function saveCustomerChanges() {
    if (!selectedCustomer) return

    const { error } = await supabase
      .from('customers')
      .update({
        first_name: editFirstName,
        last_name: editLastName,
        email: editEmail,
        phone: editPhone,
        notes: editNotes,
        vip: editVip,
        marketing_opt_in: editMarketingOptIn,
        last_visit: editLastVisit || null,
      })
      .eq('id', selectedCustomer.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setIsEditing(false)
    setMessage('Customer updated successfully.')
    loadData()
  }

  async function deleteCustomer(customer: CustomerWithStats) {
    const confirmed = window.confirm(
      `Delete ${customer.first_name} ${customer.last_name || ''}?`
    )

    if (!confirmed) return

    await supabase.from('customer_notes').delete().eq('customer_id', customer.id)

    await supabase
      .from('bookings')
      .update({ customer_id: null })
      .eq('customer_id', customer.id)

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customer.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setSelectedCustomerId(null)
    setIsEditing(false)
    setMessage('Customer deleted successfully.')
    loadData()
  }

  async function addNote() {
    if (!selectedCustomer || !note.trim()) return

    const { error } = await supabase.from('customer_notes').insert({
      business_id: businessId,
      customer_id: selectedCustomer.id,
      note: note.trim(),
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setNote('')
    setMessage('Note added successfully.')
    loadData()
  }

  async function toggleVip(customer: CustomerWithStats) {
    const { error } = await supabase
      .from('customers')
      .update({ vip: !customer.vip })
      .eq('id', customer.id)

    if (error) {
      setMessage(error.message)
      return
    }

    loadData()
  }

  async function toggleMarketing(customer: CustomerWithStats) {
    const { error } = await supabase
      .from('customers')
      .update({ marketing_opt_in: customer.marketing_opt_in === false })
      .eq('id', customer.id)

    if (error) {
      setMessage(error.message)
      return
    }

    loadData()
  }

  return (
    <div>
      <div className="mb-10">
        <p className="text-slate-400 mb-2">CRM</p>
        <h1 className="text-4xl font-bold mb-2">Customers</h1>
        <p className="text-slate-500">
          View customer history, CRM notes, VIP status and lifetime value.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard label="Customers" value={customers.length} />
        <StatCard
          label="VIPs"
          value={customers.filter((customer) => customer.vip).length}
        />
        <StatCard
          label="Revenue"
          value={`£${customers.reduce((total, c) => total + c.totalSpend, 0)}`}
        />
        <StatCard
          label="Notes"
          value={customers.reduce((total, c) => total + c.notesList.length, 0)}
        />
      </div>

      <div className="grid xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1 space-y-4">
          <input
            className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => {
                setSelectedCustomerId(customer.id)
                setIsEditing(false)
                setMessage('')
              }}
              className={`w-full text-left bg-slate-900 border rounded-2xl p-5 ${
                selectedCustomerId === customer.id
                  ? 'border-white'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold">
                    {customer.first_name} {customer.last_name}
                  </h3>
                  <p className="text-slate-400 text-sm">{customer.email}</p>
                  <p className="text-slate-500 text-sm">{customer.phone}</p>
                </div>

                {customer.vip && (
                  <span className="bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 rounded-full px-3 py-1 text-xs font-bold">
                    VIP
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <MiniStat label="Bookings" value={customer.totalBookings} />
                <MiniStat label="Spend" value={`£${customer.totalSpend}`} />
              </div>
            </button>
          ))}

          {filteredCustomers.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-500">
              No customers found.
            </div>
          )}
        </div>

        <div className="xl:col-span-2">
          {!selectedCustomer && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-slate-500">
              Select a customer to view their profile.
            </div>
          )}

          {selectedCustomer && (
            <div className="space-y-8">
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col lg:flex-row lg:justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-3xl font-bold">
                        {selectedCustomer.first_name} {selectedCustomer.last_name}
                      </h2>

                      {selectedCustomer.vip && (
                        <span className="bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 rounded-full px-3 py-1 text-xs font-bold">
                          VIP
                        </span>
                      )}
                    </div>

                    <p className="text-slate-400">{selectedCustomer.email}</p>
                    <p className="text-slate-500">{selectedCustomer.phone}</p>

                    <p className="text-slate-500 text-sm mt-2">
                      Marketing:{' '}
                      <span
                        className={
                          selectedCustomer.marketing_opt_in === false
                            ? 'text-red-400'
                            : 'text-emerald-400'
                        }
                      >
                        {selectedCustomer.marketing_opt_in === false
                          ? 'Opted out'
                          : 'Opted in'}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => toggleVip(selectedCustomer)}
                      className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold"
                    >
                      {selectedCustomer.vip ? 'Remove VIP' : 'Mark VIP'}
                    </button>

                    <button
                      onClick={() => toggleMarketing(selectedCustomer)}
                      className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold"
                    >
                      Toggle marketing
                    </button>

                    <button
                      onClick={() => startEditing(selectedCustomer)}
                      className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteCustomer(selectedCustomer)}
                      className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {message && <p className="text-slate-300 mb-4">{message}</p>}

                <div className="grid md:grid-cols-4 gap-4">
                  <MiniStat label="Bookings" value={selectedCustomer.totalBookings} />
                  <MiniStat label="Spend" value={`£${selectedCustomer.totalSpend}`} />
                  <MiniStat
                    label="Last visit"
                    value={
                      selectedCustomer.lastBooking
                        ? new Date(selectedCustomer.lastBooking).toLocaleDateString('en-GB')
                        : 'None'
                    }
                  />
                  <MiniStat
                    label="Next"
                    value={
                      selectedCustomer.nextBooking
                        ? new Date(selectedCustomer.nextBooking).toLocaleDateString('en-GB')
                        : 'None'
                    }
                  />
                </div>

                {selectedCustomer.notes && (
                  <div className="border border-slate-800 rounded-2xl p-5 mt-6">
                    <h3 className="text-xl font-bold mb-2">Profile notes</h3>
                    <p className="text-slate-300 whitespace-pre-wrap">
                      {selectedCustomer.notes}
                    </p>
                  </div>
                )}
              </section>

              {isEditing && (
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-2xl font-bold mb-4">Edit customer</h3>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <input
                      className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      placeholder="First name"
                    />

                    <input
                      className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      placeholder="Last name"
                    />

                    <input
                      className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Email"
                    />

                    <input
                      className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Phone"
                    />

                    <input
                      type="date"
                      className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                      value={editLastVisit}
                      onChange={(e) => setEditLastVisit(e.target.value)}
                    />
                  </div>

                  <textarea
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 mb-4"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Profile notes, preferences, usual style, allergies, preferred staff member..."
                  />

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <label className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <input
                        type="checkbox"
                        checked={editVip}
                        onChange={(e) => setEditVip(e.target.checked)}
                      />
                      <span>VIP customer</span>
                    </label>

                    <label className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <input
                        type="checkbox"
                        checked={editMarketingOptIn}
                        onChange={(e) => setEditMarketingOptIn(e.target.checked)}
                      />
                      <span>Marketing opt-in</span>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={saveCustomerChanges}
                      className="bg-white text-slate-950 font-bold px-5 py-3 rounded-xl"
                    >
                      Save changes
                    </button>

                    <button
                      onClick={() => setIsEditing(false)}
                      className="bg-slate-700 hover:bg-slate-600 font-bold px-5 py-3 rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </section>
              )}

              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-2xl font-bold mb-4">Add timeline note</h3>

                <textarea
                  className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 mb-4"
                  placeholder="Add customer note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />

                <button
                  onClick={addNote}
                  className="bg-white text-slate-950 font-bold px-5 py-3 rounded-xl"
                >
                  Save note
                </button>
              </section>

              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-2xl font-bold mb-4">Timeline notes</h3>

                <div className="space-y-3">
                  {selectedCustomer.notesList.map((item) => (
                    <div
                      key={item.id}
                      className="border border-slate-800 rounded-xl p-4"
                    >
                      <p>{item.note}</p>
                      <p className="text-slate-500 text-sm mt-2">
                        {new Date(item.created_at).toLocaleString('en-GB')}
                      </p>
                    </div>
                  ))}

                  {selectedCustomer.notesList.length === 0 && (
                    <p className="text-slate-500">No timeline notes yet.</p>
                  )}
                </div>
              </section>

              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-2xl font-bold mb-4">Appointment history</h3>

                <div className="space-y-3">
                  {selectedCustomer.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-slate-800 rounded-xl p-4 flex justify-between gap-4"
                    >
                      <div>
                        <p className="font-bold">
                          {booking.services?.[0]?.name || 'Unknown service'}
                        </p>
                        <p className="text-slate-400 text-sm">
                          {new Date(booking.booking_date).toLocaleDateString('en-GB')}{' '}
                          at {booking.booking_time?.slice(0, 5)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p>£{booking.services?.[0]?.price || 0}</p>
                        <p className="text-slate-500 text-sm">
                          {booking.status || 'confirmed'}
                        </p>
                      </div>
                    </div>
                  ))}

                  {selectedCustomer.bookings.length === 0 && (
                    <p className="text-slate-500">No appointment history yet.</p>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <p className="text-slate-400 mb-2">{label}</p>
      <h2 className="text-3xl font-bold">{value}</h2>
    </div>
  )
}

function MiniStat({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  )
}
