'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Service = {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [businessId, setBusinessId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [price, setPrice] = useState('')
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

    const { data: servicesData } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    setServices(servicesData || [])
  }

  async function handleCreateService(
    e: React.FormEvent
  ) {
    e.preventDefault()

    const { error } = await supabase
      .from('services')
      .insert({
        business_id: businessId,
        name,
        description,
        duration_minutes: Number(duration),
        price: Number(price),
      })

    if (error) {
      setMessage(error.message)
      return
    }

    setName('')
    setDescription('')
    setDuration('')
    setPrice('')
    setMessage('Service created successfully')

    loadData()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-2">
        Services
      </h1>

      <p className="text-slate-400 mb-8">
        Create and manage your bookable services.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">
            Add Service
          </h2>

          <form
            onSubmit={handleCreateService}
            className="space-y-4"
          >
            <input
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              placeholder="Service name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <textarea
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              placeholder="Description"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
            />

            <input
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              placeholder="Duration (minutes)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />

            <input
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            <button className="w-full bg-white text-slate-950 font-bold p-3 rounded-lg">
              Create Service
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
            Your Services
          </h2>

          <div className="space-y-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="border border-slate-800 rounded-xl p-4"
              >
                <h3 className="font-bold text-lg">
                  {service.name}
                </h3>

                <p className="text-slate-400 text-sm mt-1">
                  {service.description}
                </p>

                <div className="mt-3 flex gap-4 text-sm">
                  <span>
                    {service.duration_minutes} mins
                  </span>

                  <span>
                    £{service.price}
                  </span>
                </div>
              </div>
            ))}

            {services.length === 0 && (
              <p className="text-slate-500">
                No services created yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}