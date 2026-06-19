'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PaymentType = 'pay_later' | 'deposit' | 'full_payment'
type ServiceMode = 'standard' | 'add_on' | 'bundle'

type Service = {
  id: string
  business_id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  buffer_before_minutes?: number | null
  buffer_after_minutes?: number | null
  deposit_required?: boolean | null
  deposit_amount: number | null
  is_active?: boolean | null
  created_at?: string | null
  payment_type: PaymentType | null
  category?: string | null
  service_type?: string | null
  parent_service_id?: string | null
  is_add_on?: boolean | null
  add_on_price?: number | null
  sort_order?: number | null
  recommended_service_ids?: string[] | null
  requires_service_id?: string | null
  bundle_price?: number | null
  bundle_discount_type?: string | null
  bundle_discount_value?: number | null
}

const emptyForm = {
  mode: 'standard' as ServiceMode,
  name: '',
  description: '',
  category: '',
  duration: '',
  price: '',
  bufferBefore: '0',
  bufferAfter: '0',
  paymentType: 'pay_later' as PaymentType,
  depositAmount: '',
  parentServiceId: '',
  recommendedServiceIds: [] as string[],
  requiresServiceId: '',
  bundlePrice: '',
  bundleDiscountType: '',
  bundleDiscountValue: '',
  sortOrder: '0',
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [businessId, setBusinessId] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const activeServices = useMemo(
    () => services.filter((service) => service.is_active !== false),
    [services]
  )

  const standardServices = useMemo(
    () => activeServices.filter((service) => !service.is_add_on && service.service_type !== 'bundle'),
    [activeServices]
  )

  const addOnServices = useMemo(
    () => activeServices.filter((service) => service.is_add_on || service.service_type === 'add_on'),
    [activeServices]
  )

  const bundleServices = useMemo(
    () => activeServices.filter((service) => service.service_type === 'bundle'),
    [activeServices]
  )

  const categories = useMemo(() => {
    return Array.from(new Set(activeServices.map((s) => s.category).filter(Boolean) as string[])).sort()
  }, [activeServices])

  async function loadData() {
    setMessage('')

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      setMessage('You need to be logged in.')
      return
    }

    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: true })

    if (businessError) {
      setMessage(businessError.message)
      return
    }

    const business = businesses?.[0]

    if (!business) {
      setMessage('No business found for this account.')
      return
    }

    setBusinessId(business.id)

    const { data: servicesData, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      return
    }

    setServices((servicesData || []) as Service[])
  }

  function updateForm(key: keyof typeof emptyForm, value: any) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function startEdit(service: Service) {
    const mode: ServiceMode =
      service.service_type === 'bundle'
        ? 'bundle'
        : service.is_add_on || service.service_type === 'add_on'
          ? 'add_on'
          : 'standard'

    setEditingId(service.id)
    setForm({
      mode,
      name: service.name || '',
      description: service.description || '',
      category: service.category || '',
      duration: String(service.duration_minutes || ''),
      price: String(service.price || ''),
      bufferBefore: String(service.buffer_before_minutes || 0),
      bufferAfter: String(service.buffer_after_minutes || 0),
      paymentType: service.payment_type || 'pay_later',
      depositAmount: String(service.deposit_amount || ''),
      parentServiceId: service.parent_service_id || '',
      recommendedServiceIds: service.recommended_service_ids || [],
      requiresServiceId: service.requires_service_id || '',
      bundlePrice: String(service.bundle_price || ''),
      bundleDiscountType: service.bundle_discount_type || '',
      bundleDiscountValue: String(service.bundle_discount_value || ''),
      sortOrder: String(service.sort_order || 0),
    })
    setMessage('')
  }

  function toggleRecommended(serviceId: string) {
    setForm((current) => ({
      ...current,
      recommendedServiceIds: current.recommendedServiceIds.includes(serviceId)
        ? current.recommendedServiceIds.filter((id) => id !== serviceId)
        : [...current.recommendedServiceIds, serviceId],
    }))
  }

  async function handleSaveService(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    if (!businessId) {
      setMessage('No business selected.')
      return
    }

    if (!form.name || !form.duration || !form.price) {
      setMessage('Please complete service name, duration and price.')
      return
    }

    const numericPrice = Number(form.price)
    const numericDuration = Number(form.duration)
    const numericBufferBefore = Number(form.bufferBefore || 0)
    const numericBufferAfter = Number(form.bufferAfter || 0)
    const numericDeposit = Number(form.depositAmount || 0)
    const numericBundlePrice = Number(form.bundlePrice || 0)

    if (numericDuration <= 0 || numericPrice < 0) {
      setMessage('Please enter a valid duration and price.')
      return
    }

    if (numericBufferBefore < 0 || numericBufferAfter < 0) {
      setMessage('Buffer times cannot be negative.')
      return
    }

    if (form.paymentType === 'deposit') {
      if (numericDeposit <= 0) {
        setMessage('Please enter a deposit amount.')
        return
      }

      if (numericDeposit > numericPrice) {
        setMessage('Deposit cannot be greater than the service price.')
        return
      }
    }

    setLoading(true)

    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      duration_minutes: numericDuration,
      price: numericPrice,
      buffer_before_minutes: numericBufferBefore,
      buffer_after_minutes: numericBufferAfter,
      payment_type: form.paymentType,
      deposit_amount: form.paymentType === 'deposit' ? numericDeposit : 0,
      service_type: form.mode,
      is_add_on: form.mode === 'add_on',
      parent_service_id: form.mode === 'add_on' && form.parentServiceId ? form.parentServiceId : null,
      add_on_price: form.mode === 'add_on' ? numericPrice : null,
      recommended_service_ids: form.mode === 'standard' ? form.recommendedServiceIds : [],
      requires_service_id: form.requiresServiceId || null,
      bundle_price: form.mode === 'bundle' && numericBundlePrice > 0 ? numericBundlePrice : null,
      bundle_discount_type: form.mode === 'bundle' ? form.bundleDiscountType || null : null,
      bundle_discount_value: form.mode === 'bundle' ? Number(form.bundleDiscountValue || 0) : null,
      sort_order: Number(form.sortOrder || 0),
      is_active: true,
    }

    const { error } = editingId
      ? await supabase.from('services').update(payload).eq('id', editingId)
      : await supabase.from('services').insert(payload)

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(editingId ? 'Service updated successfully.' : 'Service created successfully.')
    resetForm()
    await loadData()
  }

  async function archiveService(serviceId: string) {
    setMessage('')

    const confirmed = window.confirm(
      'Archive this service? Existing bookings will be kept, but customers will no longer be able to book it.'
    )

    if (!confirmed) return

    const previousServices = services

    setServices((current) =>
      current.map((service) =>
        service.id === serviceId ? { ...service, is_active: false } : service
      )
    )

    if (editingId === serviceId) {
      resetForm()
    }

    const { error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', serviceId)

    if (error) {
      setServices(previousServices)
      setMessage(error.message)
      return
    }

    setMessage('Service archived.')
  }

  function paymentLabel(type: PaymentType | null) {
    if (type === 'deposit') return 'Deposit required'
    if (type === 'full_payment') return 'Full payment required'
    return 'Pay at appointment'
  }

  function serviceModeLabel(service: Service) {
    if (service.service_type === 'bundle') return 'Bundle'
    if (service.is_add_on || service.service_type === 'add_on') return 'Add-on'
    return 'Standard'
  }

  function findServiceName(id?: string | null) {
    return activeServices.find((service) => service.id === id)?.name || '—'
  }

  function totalBlockedMinutes(service: Service) {
    return (
      Number(service.buffer_before_minutes || 0) +
      Number(service.duration_minutes || 0) +
      Number(service.buffer_after_minutes || 0)
    )
  }

  return (
    <main className="min-h-screen space-y-8 bg-slate-950 p-6 text-white md:p-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">Setup</p>
        <h1 className="mt-2 text-4xl font-black">Services</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Create standard services, add-ons and bundles. Add setup, travel or cleanup buffer time so your calendar blocks the real time needed.
        </p>
      </div>

      {message && <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">{message}</div>}

      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
          <h2 className="text-2xl font-black">{editingId ? 'Edit service' : 'Add service'}</h2>
          <p className="mt-2 text-slate-400">Choose what you are creating first. The form only shows what you need.</p>

          <form onSubmit={handleSaveService} className="mt-6 space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              {([
                ['standard', 'Standard service', 'Bookable on its own'],
                ['add_on', 'Add-on', 'Suggested extra'],
                ['bundle', 'Bundle', 'Combined service'],
              ] as [ServiceMode, string, string][]).map(([mode, label, helper]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateForm('mode', mode)}
                  className={`rounded-2xl border p-4 text-left ${
                    form.mode === mode
                      ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100'
                      : 'border-white/10 bg-black/20 text-slate-300'
                  }`}
                >
                  <p className="font-black">{label}</p>
                  <p className="mt-1 text-xs opacity-70">{helper}</p>
                </button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Name"
                value={form.name}
                onChange={(v) => updateForm('name', v)}
                placeholder={form.mode === 'bundle' ? 'Haircut + Beard Trim' : form.mode === 'add_on' ? 'Beard Trim' : 'Haircut'}
              />

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-400">Category</label>
                <input
                  list="service-categories"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                  placeholder="Hair, Beard, Extras, Bundles"
                  value={form.category}
                  onChange={(e) => updateForm('category', e.target.value)}
                />
                <datalist id="service-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
            </div>

            <textarea
              className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
              placeholder="Description"
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Duration minutes" type="number" value={form.duration} onChange={(v) => updateForm('duration', v)} placeholder="30" />
              <Field label={form.mode === 'bundle' ? 'Normal price' : 'Price'} type="number" value={form.price} onChange={(v) => updateForm('price', v)} placeholder="20.00" />
              <Field label="Sort order" type="number" value={form.sortOrder} onChange={(v) => updateForm('sortOrder', v)} placeholder="0" />
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
              <p className="mb-2 font-black text-cyan-100">Buffer time</p>
              <p className="mb-4 text-sm text-slate-400">
                Use this for travel, setup, cleaning, prep, reset time or gaps that should block the calendar.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Buffer before minutes"
                  type="number"
                  value={form.bufferBefore}
                  onChange={(v) => updateForm('bufferBefore', v)}
                  placeholder="0"
                />
                <Field
                  label="Buffer after minutes"
                  type="number"
                  value={form.bufferAfter}
                  onChange={(v) => updateForm('bufferAfter', v)}
                  placeholder="0"
                />
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                Total blocked time:{' '}
                <span className="font-black text-cyan-200">
                  {Number(form.bufferBefore || 0) + Number(form.duration || 0) + Number(form.bufferAfter || 0)} mins
                </span>
              </div>
            </div>

            {form.mode === 'add_on' && (
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="mb-3 font-black text-cyan-100">Attach this add-on to a main service</p>
                <select
                  value={form.parentServiceId}
                  onChange={(e) => updateForm('parentServiceId', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none"
                >
                  <option value="">Optional: select parent service</option>
                  {standardServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-sm text-slate-400">You can also edit a standard service and choose this add-on under Recommended services.</p>
              </div>
            )}

            {form.mode === 'standard' && addOnServices.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="mb-2 font-black">Recommended add-ons</p>
                <p className="mb-4 text-sm text-slate-400">These appear automatically when a customer selects this service.</p>

                <div className="grid gap-3 md:grid-cols-2">
                  {addOnServices.map((service) => (
                    <label key={service.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200">
                      <input type="checkbox" checked={form.recommendedServiceIds.includes(service.id)} onChange={() => toggleRecommended(service.id)} />
                      <span className="flex-1">{service.name}</span>
                      <span className="text-slate-400">£{Number(service.price || 0).toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.mode === 'bundle' && (
              <div className="rounded-2xl border border-purple-400/20 bg-purple-400/10 p-5">
                <p className="mb-3 font-black text-purple-100">Bundle pricing</p>

                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Bundle price" type="number" value={form.bundlePrice} onChange={(v) => updateForm('bundlePrice', v)} placeholder="25.00" />

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-400">Discount type</label>
                    <select value={form.bundleDiscountType} onChange={(e) => updateForm('bundleDiscountType', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                      <option value="">None</option>
                      <option value="fixed">Fixed amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>

                  <Field label="Discount value" type="number" value={form.bundleDiscountValue} onChange={(v) => updateForm('bundleDiscountValue', v)} placeholder="5" />
                </div>
              </div>
            )}

            <details className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <summary className="cursor-pointer font-black">Advanced settings</summary>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-400">Requires service</label>
                  <select value={form.requiresServiceId} onChange={(e) => updateForm('requiresServiceId', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                    <option value="">No requirement</option>
                    {activeServices.filter((s) => s.id !== editingId).map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </details>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Payment rule</p>

              <div className="grid gap-3 md:grid-cols-3">
                {([
                  ['pay_later', 'Pay at appointment'],
                  ['deposit', 'Deposit required'],
                  ['full_payment', 'Full payment required'],
                ] as [PaymentType, string][]).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateForm('paymentType', type)}
                    className={`rounded-2xl border p-4 text-left font-bold ${
                      form.paymentType === type ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {form.paymentType === 'deposit' && (
                <div className="mt-4">
                  <Field label="Deposit amount" type="number" value={form.depositAmount} onChange={(v) => updateForm('depositAmount', v)} placeholder="10.00" />
                </div>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <button disabled={loading} className="rounded-2xl bg-white px-5 py-4 font-black text-slate-950 disabled:opacity-50">
                {loading ? 'Saving...' : editingId ? 'Update service' : 'Create service'}
              </button>

              {editingId && (
                <button type="button" onClick={resetForm} className="rounded-2xl border border-white/10 px-5 py-4 font-black text-white hover:bg-white/10">
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Your services</h2>
              <p className="mt-2 text-slate-400">Grouped by service type.</p>
            </div>
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-300">
              {activeServices.length} service{activeServices.length === 1 ? '' : 's'}
            </span>
          </div>

          <ServiceGroup
            title="Standard services"
            services={standardServices}
            allServices={activeServices}
            onEdit={startEdit}
            onArchive={archiveService}
            findServiceName={findServiceName}
            serviceModeLabel={serviceModeLabel}
            paymentLabel={paymentLabel}
            totalBlockedMinutes={totalBlockedMinutes}
          />

          <ServiceGroup
            title="Add-ons"
            services={addOnServices}
            allServices={activeServices}
            onEdit={startEdit}
            onArchive={archiveService}
            findServiceName={findServiceName}
            serviceModeLabel={serviceModeLabel}
            paymentLabel={paymentLabel}
            totalBlockedMinutes={totalBlockedMinutes}
          />

          <ServiceGroup
            title="Bundles"
            services={bundleServices}
            allServices={activeServices}
            onEdit={startEdit}
            onArchive={archiveService}
            findServiceName={findServiceName}
            serviceModeLabel={serviceModeLabel}
            paymentLabel={paymentLabel}
            totalBlockedMinutes={totalBlockedMinutes}
          />

          {activeServices.length === 0 && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-slate-500">
              No services created yet.
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-400">{label}</span>
      <input
        type={type}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function ServiceGroup({
  title,
  services,
  allServices,
  onEdit,
  onArchive,
  findServiceName,
  serviceModeLabel,
  paymentLabel,
  totalBlockedMinutes,
}: {
  title: string
  services: Service[]
  allServices: Service[]
  onEdit: (service: Service) => void
  onArchive: (id: string) => void
  findServiceName: (id?: string | null) => string
  serviceModeLabel: (service: Service) => string
  paymentLabel: (type: PaymentType | null) => string
  totalBlockedMinutes: (service: Service) => number
}) {
  if (services.length === 0) return null

  return (
    <div className="mt-8">
      <h3 className="mb-4 text-lg font-black text-cyan-100">{title}</h3>

      <div className="space-y-4">
        {services.map((service) => {
          const recommended = (service.recommended_service_ids || [])
            .map((id) => allServices.find((item) => item.id === id)?.name)
            .filter(Boolean)

          const bufferBefore = Number(service.buffer_before_minutes || 0)
          const bufferAfter = Number(service.buffer_after_minutes || 0)

          return (
            <div key={service.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xl font-black">{service.name}</h4>
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
                      {serviceModeLabel(service)}
                    </span>
                    {service.category && (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
                        {service.category}
                      </span>
                    )}
                  </div>

                  {service.description && <p className="mt-2 max-w-xl text-slate-400">{service.description}</p>}

                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <span className="rounded-full bg-white/10 px-3 py-1 font-bold text-slate-300">
                      {service.duration_minutes} mins
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 font-bold text-slate-300">
                      £{Number(service.price || 0).toFixed(2)}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 font-bold text-slate-300">
                      {paymentLabel(service.payment_type)}
                    </span>

                    {(bufferBefore > 0 || bufferAfter > 0) && (
                      <span className="rounded-full bg-cyan-400/10 px-3 py-1 font-bold text-cyan-200">
                        Blocks {totalBlockedMinutes(service)} mins
                      </span>
                    )}

                    {bufferBefore > 0 && (
                      <span className="rounded-full bg-blue-500/10 px-3 py-1 font-bold text-blue-300">
                        Before buffer {bufferBefore} mins
                      </span>
                    )}

                    {bufferAfter > 0 && (
                      <span className="rounded-full bg-purple-500/10 px-3 py-1 font-bold text-purple-300">
                        After buffer {bufferAfter} mins
                      </span>
                    )}

                    {service.parent_service_id && (
                      <span className="rounded-full bg-blue-500/10 px-3 py-1 font-bold text-blue-300">
                        Attached to {findServiceName(service.parent_service_id)}
                      </span>
                    )}

                    {service.requires_service_id && (
                      <span className="rounded-full bg-amber-500/10 px-3 py-1 font-bold text-amber-300">
                        Requires {findServiceName(service.requires_service_id)}
                      </span>
                    )}

                    {service.bundle_price ? (
                      <span className="rounded-full bg-purple-500/10 px-3 py-1 font-bold text-purple-300">
                        Bundle £{Number(service.bundle_price).toFixed(2)}
                      </span>
                    ) : null}
                  </div>

                  {recommended.length > 0 && (
                    <p className="mt-3 text-sm text-slate-400">
                      Recommends: <span className="text-cyan-200">{recommended.join(', ')}</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => onEdit(service)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">
                    Edit
                  </button>
                  <button onClick={() => onArchive(service.id)} className="rounded-xl bg-red-500/15 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/25">
                    Archive
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}