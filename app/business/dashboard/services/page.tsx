'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import {
  Archive,
  Clock,
  CreditCard,
  Package,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import DashboardPage from '@/components/dashboard/DashboardPage'
import DashboardHero from '@/components/dashboard/DashboardHero'
import DashboardGrid from '@/components/dashboard/DashboardGrid'
import StatCard from '@/components/dashboard/StatCard'
import SectionCard from '@/components/dashboard/SectionCard'

type PaymentType = 'pay_later' | 'deposit' | 'full_payment'
type ServiceMode = 'standard' | 'add_on' | 'bundle'
type FilterKey = 'all' | 'standard' | 'add_on' | 'bundle'

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

const HIDDEN_SERVICES_STORAGE_KEY = 'amb_hidden_service_ids'

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

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'standard', label: 'Standard' },
  { key: 'add_on', label: 'Add-ons' },
  { key: 'bundle', label: 'Bundles' },
]

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [businessId, setBusinessId] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [hiddenServiceIds, setHiddenServiceIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(HIDDEN_SERVICES_STORAGE_KEY)

      if (stored) {
        try {
          setHiddenServiceIds(JSON.parse(stored))
        } catch {
          setHiddenServiceIds([])
        }
      }
    }

    loadData()
  }, [])

  const activeServices = useMemo(
    () =>
      services.filter(
        (service) =>
          service.is_active !== false && !hiddenServiceIds.includes(service.id)
      ),
    [services, hiddenServiceIds]
  )

  const standardServices = useMemo(
    () =>
      activeServices.filter(
        (service) => !service.is_add_on && service.service_type !== 'bundle'
      ),
    [activeServices]
  )

  const addOnServices = useMemo(
    () =>
      activeServices.filter(
        (service) => service.is_add_on || service.service_type === 'add_on'
      ),
    [activeServices]
  )

  const bundleServices = useMemo(
    () => activeServices.filter((service) => service.service_type === 'bundle'),
    [activeServices]
  )

  const categories = useMemo(() => {
    return Array.from(
      new Set(activeServices.map((s) => s.category).filter(Boolean) as string[])
    ).sort()
  }, [activeServices])

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase()

    return activeServices.filter((service) => {
      const mode = getServiceMode(service)

      if (activeFilter !== 'all' && mode !== activeFilter) return false

      if (!query) return true

      return [
        service.name,
        service.description || '',
        service.category || '',
        serviceModeLabel(service),
        paymentLabel(service.payment_type),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [activeServices, activeFilter, search])

  function rememberHiddenService(serviceId: string) {
    setHiddenServiceIds((current) => {
      const next = Array.from(new Set([...current, serviceId]))

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(HIDDEN_SERVICES_STORAGE_KEY, JSON.stringify(next))
      }

      return next
    })
  }

  function forgetHiddenService(serviceId: string) {
    setHiddenServiceIds((current) => {
      const next = current.filter((id) => id !== serviceId)

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(HIDDEN_SERVICES_STORAGE_KEY, JSON.stringify(next))
      }

      return next
    })
  }

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

    setServices(((servicesData || []) as Service[]).filter((service) => service.is_active !== false))
  }

  function updateForm(key: keyof typeof emptyForm, value: any) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(service: Service) {
    const mode: ServiceMode =
      service.service_type === 'bundle'
        ? 'bundle'
        : service.is_add_on || service.service_type === 'add_on'
          ? 'add_on'
          : 'standard'

    setEditingId(service.id)
    setShowForm(true)
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
      parent_service_id:
        form.mode === 'add_on' && form.parentServiceId ? form.parentServiceId : null,
      add_on_price: form.mode === 'add_on' ? numericPrice : null,
      recommended_service_ids: form.mode === 'standard' ? form.recommendedServiceIds : [],
      requires_service_id: form.requiresServiceId || null,
      bundle_price: form.mode === 'bundle' && numericBundlePrice > 0 ? numericBundlePrice : null,
      bundle_discount_type: form.mode === 'bundle' ? form.bundleDiscountType || null : null,
      bundle_discount_value:
        form.mode === 'bundle' ? Number(form.bundleDiscountValue || 0) : null,
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

    if (editingId) {
      forgetHiddenService(editingId)
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

    rememberHiddenService(serviceId)

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
      .eq('business_id', businessId)

    if (error) {
      setServices(previousServices)
      setMessage(
        `Service hidden from this device, but Supabase could not archive it: ${error.message}`
      )
      return
    }

    setMessage('Service archived.')
    await loadData()
  }

  async function deleteService(serviceId: string) {
    setMessage('')

    const service = services.find((item) => item.id === serviceId)
    const serviceName = service?.name || 'this service'

    const confirmed = window.confirm(
      `Delete ${serviceName}? If this service has existing bookings, AMB Booking will archive it instead so historic bookings are preserved.`
    )

    if (!confirmed) return

    const previousServices = services

    rememberHiddenService(serviceId)
    setServices((current) => current.filter((item) => item.id !== serviceId))

    if (editingId === serviceId) {
      resetForm()
    }

    const { error: deleteError } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)
      .eq('business_id', businessId)

    if (!deleteError) {
      setMessage('Service deleted successfully.')
      await loadData()
      return
    }

    const { error: archiveError } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', serviceId)
      .eq('business_id', businessId)

    if (archiveError) {
      setServices(previousServices)
      setMessage(
        `Service hidden from this device, but Supabase could not delete or archive it: ${
          archiveError.message || deleteError.message
        }`
      )
      return
    }

    setMessage(
      'Service has existing linked records, so it was archived instead of permanently deleted.'
    )

    await loadData()
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
    <DashboardPage>
      <DashboardHero
        eyebrow="Setup"
        title="Services."
        description="Create standard services, add-ons and bundles. Add buffer time so your calendar blocks the real time needed."
        actions={
          <ActionButton
            onClick={() => {
              setShowForm((value) => !value)
              if (!showForm) {
                setEditingId(null)
                setForm(emptyForm)
              }
            }}
            variant="primary"
            icon={<Plus size={17} />}
          >
            {showForm ? 'Close form' : 'Add service'}
          </ActionButton>
        }
      />

      {message && (
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-100">
          {message}
        </div>
      )}

      <DashboardGrid columns={4}>
        <StatCard
          label="Active services"
          value={activeServices.length}
          icon={<Sparkles size={22} />}
        />
        <StatCard
          label="Standard"
          value={standardServices.length}
          icon={<Clock size={22} />}
          colour="emerald"
        />
        <StatCard
          label="Add-ons"
          value={addOnServices.length}
          icon={<Plus size={22} />}
          colour="amber"
        />
        <StatCard
          label="Bundles"
          value={bundleServices.length}
          icon={<Package size={22} />}
          colour="violet"
        />
      </DashboardGrid>

      {showForm && (
        <SectionCard
          title={editingId ? 'Edit service' : 'Add service'}
          description="Choose what you are creating first. The form only shows what you need."
        >
          <ServiceForm
            form={form}
            loading={loading}
            editingId={editingId}
            categories={categories}
            standardServices={standardServices}
            addOnServices={addOnServices}
            activeServices={activeServices}
            toggleRecommended={toggleRecommended}
            updateForm={updateForm}
            resetForm={resetForm}
            handleSaveService={handleSaveService}
          />
        </SectionCard>
      )}

      <SectionCard>
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.03em] text-white">
                Your services
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Manage pricing, duration, payments, buffers, bundles and add-ons.
              </p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search services..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950 py-4 pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300 lg:w-96"
              />
            </div>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${
                  activeFilter === filter.key
                    ? 'border-cyan-300/30 bg-cyan-400/15 text-cyan-100'
                    : 'border-white/10 bg-white/[0.04] text-slate-400'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {filteredServices.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
              <p className="text-lg font-black text-white">No services found.</p>
              <p className="mt-2 text-sm text-slate-500">
                Add your first service or change your filter.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  activeServices={activeServices}
                  onEdit={startEdit}
                  onArchive={archiveService}
                  onDelete={deleteService}
                  findServiceName={findServiceName}
                  serviceModeLabel={serviceModeLabel}
                  paymentLabel={paymentLabel}
                  totalBlockedMinutes={totalBlockedMinutes}
                />
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </DashboardPage>
  )
}

function ServiceForm({
  form,
  loading,
  editingId,
  categories,
  standardServices,
  addOnServices,
  activeServices,
  toggleRecommended,
  updateForm,
  resetForm,
  handleSaveService,
}: {
  form: typeof emptyForm
  loading: boolean
  editingId: string | null
  categories: string[]
  standardServices: Service[]
  addOnServices: Service[]
  activeServices: Service[]
  toggleRecommended: (serviceId: string) => void
  updateForm: (key: keyof typeof emptyForm, value: any) => void
  resetForm: () => void
  handleSaveService: (e: React.FormEvent) => void
}) {
  return (
    <form onSubmit={handleSaveService} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {([
          ['standard', 'Standard service', 'Bookable on its own', Sparkles],
          ['add_on', 'Add-on', 'Suggested extra', Plus],
          ['bundle', 'Bundle', 'Combined service', Package],
        ] as [ServiceMode, string, string, ElementType][]).map(([mode, label, helper, Icon]) => (
          <button
            key={mode}
            type="button"
            onClick={() => updateForm('mode', mode)}
            className={`rounded-2xl border p-4 text-left transition ${
              form.mode === mode
                ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100'
                : 'border-white/10 bg-slate-950 text-slate-300'
            }`}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <Icon size={18} />
            </div>
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
          placeholder={
            form.mode === 'bundle'
              ? 'Haircut + Beard Trim'
              : form.mode === 'add_on'
                ? 'Beard Trim'
                : 'Haircut'
          }
        />

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-400">Category</span>
          <input
            list="service-categories"
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
            placeholder="Hair, Beard, Extras, Bundles"
            value={form.category}
            onChange={(e) => updateForm('category', e.target.value)}
          />
          <datalist id="service-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </label>
      </div>

      <textarea
        className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
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
          <Field label="Buffer before minutes" type="number" value={form.bufferBefore} onChange={(v) => updateForm('bufferBefore', v)} placeholder="0" />
          <Field label="Buffer after minutes" type="number" value={form.bufferAfter} onChange={(v) => updateForm('bufferAfter', v)} placeholder="0" />
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm text-slate-300">
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
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
        </div>
      )}

      {form.mode === 'standard' && addOnServices.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
          <p className="mb-2 font-black text-white">Recommended add-ons</p>
          <p className="mb-4 text-sm text-slate-400">
            These appear automatically when a customer selects this service.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            {addOnServices.map((service) => (
              <label
                key={service.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={form.recommendedServiceIds.includes(service.id)}
                  onChange={() => toggleRecommended(service.id)}
                />
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

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Discount type</span>
              <select
                value={form.bundleDiscountType}
                onChange={(e) => updateForm('bundleDiscountType', e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none"
              >
                <option value="">None</option>
                <option value="fixed">Fixed amount</option>
                <option value="percentage">Percentage</option>
              </select>
            </label>

            <Field label="Discount value" type="number" value={form.bundleDiscountValue} onChange={(v) => updateForm('bundleDiscountValue', v)} placeholder="5" />
          </div>
        </div>
      )}

      <details className="rounded-2xl border border-white/10 bg-slate-950 p-5">
        <summary className="cursor-pointer font-black text-white">Advanced settings</summary>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-400">Requires service</span>
            <select
              value={form.requiresServiceId}
              onChange={(e) => updateForm('requiresServiceId', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none"
            >
              <option value="">No requirement</option>
              {activeServices.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </label>
        </div>
      </details>

      <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
          Payment rule
        </p>

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
              className={`rounded-2xl border p-4 text-left font-bold transition ${
                form.paymentType === type
                  ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100'
                  : 'border-white/10 text-slate-300'
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
        <button
          disabled={loading}
          className="rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
        >
          {loading ? 'Saving...' : editingId ? 'Update service' : 'Create service'}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="rounded-2xl border border-white/10 px-5 py-4 font-black text-white hover:bg-white/10"
          >
            Cancel edit
          </button>
        )}
      </div>
    </form>
  )
}

function ServiceCard({
  service,
  activeServices,
  onEdit,
  onArchive,
  onDelete,
  findServiceName,
  serviceModeLabel,
  paymentLabel,
  totalBlockedMinutes,
}: {
  service: Service
  activeServices: Service[]
  onEdit: (service: Service) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  findServiceName: (id?: string | null) => string
  serviceModeLabel: (service: Service) => string
  paymentLabel: (type: PaymentType | null) => string
  totalBlockedMinutes: (service: Service) => number
}) {
  const recommended = (service.recommended_service_ids || [])
    .map((id) => activeServices.find((item) => item.id === id)?.name)
    .filter(Boolean)

  const bufferBefore = Number(service.buffer_before_minutes || 0)
  const bufferAfter = Number(service.buffer_after_minutes || 0)

  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 shadow-[0_30px_100px_rgba(0,0,0,.35)]">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-black tracking-[-0.03em] text-white">
              {service.name}
            </h3>

            {service.description && (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                {service.description}
              </p>
            )}
          </div>

          <Badge>{serviceModeLabel(service)}</Badge>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <InfoTile label="Price" value={`£${Number(service.price || 0).toFixed(2)}`} />
          <InfoTile label="Duration" value={`${service.duration_minutes} mins`} />
          <InfoTile label="Blocked" value={`${totalBlockedMinutes(service)} mins`} />
          <InfoTile label="Payment" value={paymentLabel(service.payment_type)} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {service.category && <Pill>{service.category}</Pill>}

          {bufferBefore > 0 && <Pill colour="blue">Before {bufferBefore} mins</Pill>}
          {bufferAfter > 0 && <Pill colour="purple">After {bufferAfter} mins</Pill>}

          {service.parent_service_id && (
            <Pill colour="blue">Attached to {findServiceName(service.parent_service_id)}</Pill>
          )}

          {service.requires_service_id && (
            <Pill colour="amber">Requires {findServiceName(service.requires_service_id)}</Pill>
          )}

          {service.bundle_price ? (
            <Pill colour="purple">Bundle £{Number(service.bundle_price).toFixed(2)}</Pill>
          ) : null}
        </div>

        {recommended.length > 0 && (
          <p className="mt-4 text-sm text-slate-400">
            Recommends: <span className="text-cyan-200">{recommended.join(', ')}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-white/10 bg-white/[0.025] p-3">
        <button
          type="button"
          onClick={() => onEdit(service)}
          className="rounded-2xl bg-cyan-400/10 px-3 py-3 text-xs font-black text-cyan-200 hover:bg-cyan-400/20"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => onArchive(service.id)}
          className="rounded-2xl bg-orange-400/10 px-3 py-3 text-xs font-black text-orange-200 hover:bg-orange-400/20"
        >
          Archive
        </button>

        <button
          type="button"
          onClick={() => onDelete(service.id)}
          className="rounded-2xl bg-rose-400/10 px-3 py-3 text-xs font-black text-rose-200 hover:bg-rose-400/20"
        >
          Delete
        </button>
      </div>
    </article>
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
        className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function ActionButton({
  children,
  onClick,
  variant = 'default',
  icon,
}: {
  children: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'primary'
  icon?: React.ReactNode
}) {
  const styles = {
    default: 'border-white/10 bg-white/[0.045] text-white hover:bg-white/[0.09]',
    primary: 'border-cyan-400/20 bg-cyan-400 text-slate-950 hover:bg-cyan-300',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black transition hover:-translate-y-0.5 ${styles[variant]}`}
    >
      {icon}
      {children}
    </button>
  )
}

function InfoTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-200">
      {children}
    </span>
  )
}

function Pill({
  children,
  colour = 'slate',
}: {
  children: React.ReactNode
  colour?: 'slate' | 'blue' | 'purple' | 'amber'
}) {
  const styles = {
    slate: 'bg-white/[0.06] text-slate-300',
    blue: 'bg-blue-500/10 text-blue-300',
    purple: 'bg-purple-500/10 text-purple-300',
    amber: 'bg-amber-500/10 text-amber-300',
  }

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[colour]}`}>
      {children}
    </span>
  )
}

function getServiceMode(service: Service): FilterKey {
  if (service.service_type === 'bundle') return 'bundle'
  if (service.is_add_on || service.service_type === 'add_on') return 'add_on'
  return 'standard'
}