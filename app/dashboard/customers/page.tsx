'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Customer = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [businessId, setBusinessId] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
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
      .order('created_at', { ascending: false })

    setCustomers(customerData || [])
  }

  async function createCustomer(
    e: React.FormEvent
  ) {
    e.preventDefault()

    const { error } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
      })

    if (error) {
      setMessage(error.message)
      return
    }

    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setMessage('Customer created successfully')

    loadData()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-2">
        Customers
      </h1>

      <p className="text-slate-400 mb-8">
        Manage your customer database.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">
            Add Customer
          </h2>

          <form
            onSubmit={createCustomer}
            className="space-y-4"
          >
            <input
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              placeholder="First name"
              value={firstName}
              onChange={(e) =>
                setFirstName(e.target.value)
              }
            />

            <input
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              placeholder="Last name"
              value={lastName}
              onChange={(e) =>
                setLastName(e.target.value)
              }
            />

            <input
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              placeholder="Email address"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <input
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              placeholder="Phone number"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
            />

            <button className="w-full bg-white text-slate-950 font-bold p-3 rounded-lg">
              Create Customer
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
            Your Customers
          </h2>

          <div className="space-y-4">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="border border-slate-800 rounded-xl p-4"
              >
                <h3 className="font-bold">
                  {customer.first_name}{' '}
                  {customer.last_name}
                </h3>

                <p className="text-slate-400 text-sm">
                  {customer.email}
                </p>

                <p className="text-slate-400 text-sm">
                  {customer.phone}
                </p>
              </div>
            ))}

            {customers.length === 0 && (
              <p className="text-slate-500">
                No customers yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}