'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Customer = {
  id: string
  first_name: string
  last_name: string | null
}

type Service = {
  id: string
  name: string
}

type TeamMember = {
  id: string
  full_name: string
}

type Booking = {
  id: string
  booking_date: string
  booking_time: string
  status: string
  customers: {
    first_name: string
    last_name: string | null
  }
  services: {
    name: string
  }
  team_members: {
    full_name: string
  }
}

export default function BookingsPage() {
  const [businessId, setBusinessId] = useState('')

  const [customers, setCustomers] = useState<Customer[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])

  const [customerId, setCustomerId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [teamMemberId, setTeamMemberId] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) return

    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userData.user.id)
      .single()

    if (!business) return

    setBusinessId(business.id)

    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business.id)

    const { data: serviceData } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)

    const { data: teamData } = await supabase
      .from('team_members')
      .select('*')
      .eq('business_id', business.id)

    const { data: bookingData } = await supabase
      .from('bookings')
      .select(`
        *,
        customers(first_name,last_name),
        services(name),
        team_members(full_name)
      `)
      .eq('business_id', business.id)
      .order('booking_date', { ascending: true })

    setCustomers(customerData || [])
    setServices(serviceData || [])
    setTeamMembers(teamData || [])
    setBookings((bookingData as Booking[]) || [])
  }

  async function createBooking(
    e: React.FormEvent
  ) {
    e.preventDefault()

    const { error } = await supabase
      .from('bookings')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        service_id: serviceId,
        team_member_id: teamMemberId,
        booking_date: bookingDate,
        booking_time: bookingTime,
      })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Booking created successfully')

    setCustomerId('')
    setServiceId('')
    setTeamMemberId('')
    setBookingDate('')
    setBookingTime('')

    loadData()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-2">
        Bookings
      </h1>

      <p className="text-slate-400 mb-8">
        Manage appointments and bookings.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">
            Create Booking
          </h2>

          <form
            onSubmit={createBooking}
            className="space-y-4"
          >
            <select
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              value={customerId}
              onChange={(e) =>
                setCustomerId(e.target.value)
              }
            >
              <option value="">Select customer</option>

              {customers.map((customer) => (
                <option
                  key={customer.id}
                  value={customer.id}
                >
                  {customer.first_name}{' '}
                  {customer.last_name}
                </option>
              ))}
            </select>

            <select
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              value={serviceId}
              onChange={(e) =>
                setServiceId(e.target.value)
              }
            >
              <option value="">Select service</option>

              {services.map((service) => (
                <option
                  key={service.id}
                  value={service.id}
                >
                  {service.name}
                </option>
              ))}
            </select>

            <select
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              value={teamMemberId}
              onChange={(e) =>
                setTeamMemberId(e.target.value)
              }
            >
              <option value="">Select team member</option>

              {teamMembers.map((member) => (
                <option
                  key={member.id}
                  value={member.id}
                >
                  {member.full_name}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              value={bookingDate}
              onChange={(e) =>
                setBookingDate(e.target.value)
              }
            />

            <input
              type="time"
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              value={bookingTime}
              onChange={(e) =>
                setBookingTime(e.target.value)
              }
            />

            <button className="w-full bg-white text-slate-950 font-bold p-3 rounded-lg">
              Create Booking
            </button>

            {message && (
              <p className="text-slate-300">
                {message}
              </p>
            )}
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">
            Upcoming Bookings
          </h2>

          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="border border-slate-800 rounded-xl p-4"
              >
                <h3 className="font-bold">
                  {booking.customers?.first_name}{' '}
                  {booking.customers?.last_name}
                </h3>

                <p className="text-slate-400">
                  {booking.services?.name}
                </p>

                <p className="text-slate-400">
                  {booking.team_members?.full_name}
                </p>

                <p className="text-slate-400">
                  {booking.booking_date} at{' '}
                  {booking.booking_time}
                </p>
              </div>
            ))}

            {bookings.length === 0 && (
              <p className="text-slate-500">
                No bookings yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}