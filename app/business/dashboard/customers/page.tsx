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
  customer_source: string | null
  tags: string[] | null
  preferred_team_member_id: string | null
  preferred_service_id: string | null
  birthday: string | null
  no_show_count: number | null
  outstanding_balance: number | null
  archived: boolean | null
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

type TeamMember = {
  id: string
  full_name: string
}

type Service = {
  id: string
  name: string
  price: number
}

type CustomerWithStats = Customer & {
  totalBookings: number
  totalSpend: number
  lastBooking: string | null
  nextBooking: string | null
  bookings: Booking[]
  notesList: Note[]
}

type CsvCustomerImportRow = {
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  notes: string | null
  vip: boolean
  marketing_opt_in: boolean
  customer_source: string | null
  tags: string[]
  birthday: string | null
  no_show_count: number
  outstanding_balance: number
}


export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [businessId, setBusinessId] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [showImportCustomers, setShowImportCustomers] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [importPreview, setImportPreview] = useState<CsvCustomerImportRow[]>([])
  const [importingCsv, setImportingCsv] = useState(false)

  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newVip, setNewVip] = useState(false)
  const [newMarketingOptIn, setNewMarketingOptIn] = useState(true)
  const [newSource, setNewSource] = useState('')
  const [newTags, setNewTags] = useState('')
  const [newPreferredTeamMemberId, setNewPreferredTeamMemberId] = useState('')
  const [newPreferredServiceId, setNewPreferredServiceId] = useState('')
  const [newBirthday, setNewBirthday] = useState('')
  const [newNoShowCount, setNewNoShowCount] = useState('0')
  const [newOutstandingBalance, setNewOutstandingBalance] = useState('0')

  const [isEditing, setIsEditing] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editVip, setEditVip] = useState(false)
  const [editMarketingOptIn, setEditMarketingOptIn] = useState(true)
  const [editLastVisit, setEditLastVisit] = useState('')
  const [editSource, setEditSource] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editPreferredTeamMemberId, setEditPreferredTeamMemberId] = useState('')
  const [editPreferredServiceId, setEditPreferredServiceId] = useState('')
  const [editBirthday, setEditBirthday] = useState('')
  const [editNoShowCount, setEditNoShowCount] = useState('0')
  const [editOutstandingBalance, setEditOutstandingBalance] = useState('0')

  const filteredCustomers = customers.filter((customer) => {
    if (!showArchived && customer.archived) return false

    const search = searchTerm.trim().toLowerCase()

    if (!search) return true

    const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase()
    const email = customer.email?.toLowerCase() || ''
    const phone = customer.phone?.toLowerCase() || ''
    const notes = customer.notes?.toLowerCase() || ''
    const source = customer.customer_source?.toLowerCase() || ''
    const tags = customer.tags?.join(' ').toLowerCase() || ''

    return (
      fullName.includes(search) ||
      email.includes(search) ||
      phone.includes(search) ||
      notes.includes(search) ||
      source.includes(search) ||
      tags.includes(search)
    )
  })

  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) || null

  useEffect(() => {
    loadData()
  }, [])

  function parseTags(value: string) {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  function getTeamMemberName(id: string | null) {
    if (!id) return 'Not set'
    return teamMembers.find((member) => member.id === id)?.full_name || 'Unknown'
  }

  function getServiceName(id: string | null) {
    if (!id) return 'Not set'
    return services.find((service) => service.id === id)?.name || 'Unknown'
  }

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

    const { data: teamData } = await supabase
      .from('team_members')
      .select('id,full_name')
      .eq('business_id', business.id)
      .order('full_name')

    const { data: serviceData } = await supabase
      .from('services')
      .select('id,name,price')
      .eq('business_id', business.id)
      .order('name')

    setTeamMembers((teamData as TeamMember[] | null) || [])
    setServices((serviceData as Service[] | null) || [])

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
        customer_source,
        tags,
        preferred_team_member_id,
        preferred_service_id,
        birthday,
        no_show_count,
        outstanding_balance,
        archived,
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

  function resetNewCustomerForm() {
    setNewFirstName('')
    setNewLastName('')
    setNewEmail('')
    setNewPhone('')
    setNewNotes('')
    setNewVip(false)
    setNewMarketingOptIn(true)
    setNewSource('')
    setNewTags('')
    setNewPreferredTeamMemberId('')
    setNewPreferredServiceId('')
    setNewBirthday('')
    setNewNoShowCount('0')
    setNewOutstandingBalance('0')
  }

  async function addCustomerManually() {
    if (!businessId) {
      setMessage('Business not loaded.')
      return
    }

    if (!newFirstName.trim()) {
      setMessage('First name is required.')
      return
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        first_name: newFirstName.trim(),
        last_name: newLastName.trim() || null,
        email: newEmail.trim() || null,
        phone: newPhone.trim() || null,
        notes: newNotes.trim() || null,
        vip: newVip,
        marketing_opt_in: newMarketingOptIn,
        customer_source: newSource.trim() || null,
        tags: parseTags(newTags),
        preferred_team_member_id: newPreferredTeamMemberId || null,
        preferred_service_id: newPreferredServiceId || null,
        birthday: newBirthday || null,
        no_show_count: Number(newNoShowCount || 0),
        outstanding_balance: Number(newOutstandingBalance || 0),
        archived: false,
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    resetNewCustomerForm()
    setShowAddCustomer(false)
    setSelectedCustomerId(data.id)
    setMessage('Customer added successfully.')
    loadData()
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
    setEditSource(customer.customer_source || '')
    setEditTags(customer.tags?.join(', ') || '')
    setEditPreferredTeamMemberId(customer.preferred_team_member_id || '')
    setEditPreferredServiceId(customer.preferred_service_id || '')
    setEditBirthday(customer.birthday || '')
    setEditNoShowCount(String(customer.no_show_count || 0))
    setEditOutstandingBalance(String(customer.outstanding_balance || 0))
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
        customer_source: editSource || null,
        tags: parseTags(editTags),
        preferred_team_member_id: editPreferredTeamMemberId || null,
        preferred_service_id: editPreferredServiceId || null,
        birthday: editBirthday || null,
        no_show_count: Number(editNoShowCount || 0),
        outstanding_balance: Number(editOutstandingBalance || 0),
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

  async function archiveCustomer(customer: CustomerWithStats) {
    const confirmed = window.confirm(
      `Archive ${customer.first_name} ${customer.last_name || ''}?`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('customers')
      .update({ archived: true })
      .eq('id', customer.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setSelectedCustomerId(null)
    setIsEditing(false)
    setMessage('Customer archived successfully.')
    loadData()
  }

  async function restoreCustomer(customer: CustomerWithStats) {
    const { error } = await supabase
      .from('customers')
      .update({ archived: false })
      .eq('id', customer.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Customer restored successfully.')
    loadData()
  }

  async function deleteCustomer(customer: CustomerWithStats) {
    const confirmed = window.confirm(
      `Permanently delete ${customer.first_name} ${customer.last_name || ''}? This cannot be undone.`
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
    setMessage('Customer deleted permanently.')
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

  function parseCsvLine(line: string) {
    const values: string[] = []
    let current = ''
    let insideQuotes = false

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index]
      const nextChar = line[index + 1]

      if (char === '"' && nextChar === '"') {
        current += '"'
        index += 1
      } else if (char === '"') {
        insideQuotes = !insideQuotes
      } else if (char === ',' && !insideQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    values.push(current.trim())
    return values
  }

  function normaliseCsvHeader(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  function getCsvValue(row: Record<string, string>, keys: string[]) {
    for (const key of keys) {
      const value = row[key]

      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim()
      }
    }

    return ''
  }

  function toBoolean(value: string, fallback = false) {
    if (!value) return fallback

    const normalised = value.toLowerCase().trim()

    return [
      'yes',
      'y',
      'true',
      '1',
      'opt in',
      'opt_in',
      'opted in',
      'opted_in',
      'subscribed',
    ].includes(normalised)
  }

  function parseCustomerCsv(csv: string): CsvCustomerImportRow[] {
    const lines = csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length < 2) return []

    const headers = parseCsvLine(lines[0]).map(normaliseCsvHeader)

    return lines
      .slice(1)
      .map((line) => {
        const values = parseCsvLine(line)
        const row = headers.reduce<Record<string, string>>((result, header, index) => {
          result[header] = values[index] || ''
          return result
        }, {})

        const fullName = getCsvValue(row, ['name', 'full_name', 'customer_name'])
        const firstNameFromCsv = getCsvValue(row, ['first_name', 'firstname', 'forename'])
        const lastNameFromCsv = getCsvValue(row, ['last_name', 'lastname', 'surname'])

        const splitName = fullName.split(' ').filter(Boolean)
        const firstName = firstNameFromCsv || splitName[0] || ''
        const lastName =
          lastNameFromCsv ||
          (splitName.length > 1 ? splitName.slice(1).join(' ') : '')

        const rawTags = getCsvValue(row, ['tags', 'tag', 'labels'])
        const rawBirthday = getCsvValue(row, ['birthday', 'date_of_birth', 'dob'])
        const rawNoShows = getCsvValue(row, ['no_show_count', 'no_shows', 'noshow_count'])
        const rawOutstanding = getCsvValue(row, [
          'outstanding_balance',
          'balance',
          'amount_due',
        ])

        return {
          first_name: firstName,
          last_name: lastName || null,
          email: getCsvValue(row, ['email', 'email_address']) || null,
          phone:
            getCsvValue(row, [
              'phone',
              'phone_number',
              'mobile',
              'mobile_number',
              'telephone',
            ]) || null,
          notes: getCsvValue(row, ['notes', 'note', 'customer_notes']) || null,
          vip: toBoolean(getCsvValue(row, ['vip', 'is_vip']), false),
          marketing_opt_in: toBoolean(
            getCsvValue(row, [
              'marketing_opt_in',
              'marketing',
              'email_marketing',
              'sms_marketing',
            ]),
            true
          ),
          customer_source:
            getCsvValue(row, ['source', 'customer_source', 'lead_source']) || null,
          tags: rawTags
            ? rawTags
                .split(/[|,]/)
                .map((tag) => tag.trim())
                .filter(Boolean)
            : [],
          birthday: rawBirthday || null,
          no_show_count: Number(rawNoShows || 0),
          outstanding_balance: Number(rawOutstanding || 0),
        }
      })
      .filter((row) => row.first_name.trim())
  }

  async function handleCustomerCsvUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setImportFileName(file.name)
    setMessage('')

    const text = await file.text()
    const rows = parseCustomerCsv(text)

    setImportPreview(rows)

    if (rows.length === 0) {
      setMessage(
        'No valid customers found in the CSV. Make sure it has a header row and at least a name column.'
      )
    }
  }

  async function importCustomersCsv() {
    if (!businessId) {
      setMessage('Business not loaded.')
      return
    }

    if (importPreview.length === 0) {
      setMessage('Upload a CSV before importing.')
      return
    }

    setImportingCsv(true)

    const { error } = await supabase.from('customers').insert(
      importPreview.map((customer) => ({
        business_id: businessId,
        first_name: customer.first_name.trim(),
        last_name: customer.last_name,
        email: customer.email,
        phone: customer.phone,
        notes: customer.notes,
        vip: customer.vip,
        marketing_opt_in: customer.marketing_opt_in,
        customer_source: customer.customer_source || 'CSV import',
        tags: customer.tags,
        birthday: customer.birthday,
        no_show_count: customer.no_show_count,
        outstanding_balance: customer.outstanding_balance,
        archived: false,
      }))
    )

    setImportingCsv(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(`${importPreview.length} customers imported successfully.`)
    setShowImportCustomers(false)
    setImportFileName('')
    setImportPreview([])
    loadData()
  }

  function exportCustomersCsv() {
    const rows = filteredCustomers.map((customer) => ({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      vip: customer.vip ? 'Yes' : 'No',
      marketing_opt_in: customer.marketing_opt_in === false ? 'No' : 'Yes',
      source: customer.customer_source || '',
      tags: customer.tags?.join('|') || '',
      birthday: customer.birthday || '',
      no_show_count: customer.no_show_count || 0,
      outstanding_balance: customer.outstanding_balance || 0,
      total_bookings: customer.totalBookings,
      total_spend: customer.totalSpend,
      archived: customer.archived ? 'Yes' : 'No',
    }))

    const headers = Object.keys(rows[0] || {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      vip: '',
      marketing_opt_in: '',
      source: '',
      tags: '',
      birthday: '',
      no_show_count: '',
      outstanding_balance: '',
      total_bookings: '',
      total_spend: '',
      archived: '',
    })

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = String((row as Record<string, string | number>)[header] ?? '')
            return `"${value.replace(/"/g, '""')}"`
          })
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'customers.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <p className="text-slate-400 mb-2">CRM</p>
          <h1 className="text-4xl font-bold mb-2">Customers</h1>
          <p className="text-slate-500">
            View customer history, CRM notes, VIP status and lifetime value.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setShowAddCustomer((value) => !value)
              setShowImportCustomers(false)
            }}
            className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-black text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.3)] transition hover:-translate-y-1 hover:bg-cyan-300"
          >
            <span className="text-lg leading-none">+</span>
            {showAddCustomer ? 'Close form' : 'Add customer'}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowImportCustomers((value) => !value)
              setShowAddCustomer(false)
            }}
            className="group inline-flex items-center justify-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-6 py-4 text-sm font-black text-cyan-100 shadow-[0_0_50px_rgba(34,211,238,.12)] transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-cyan-400/15"
          >
            <span className="text-base leading-none">⇧</span>
            Import CSV
          </button>

          <button
            type="button"
            onClick={exportCustomersCsv}
            className="group inline-flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-6 py-4 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/[0.09]"
          >
            <span className="text-base leading-none">⇩</span>
            Export CSV
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8 text-slate-300">
          {message}
        </div>
      )}

      {showImportCustomers && (
        <section className="mb-10 overflow-hidden rounded-[2.5rem] border border-cyan-400/20 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.32em] text-cyan-300">
                Customer import
              </p>

              <h2 className="text-3xl font-black tracking-[-0.04em]">
                Bring your existing customers into AMB Booking.
              </h2>

              <p className="mt-3 max-w-3xl leading-7 text-slate-400">
                Upload a CSV from your old booking system, spreadsheet, Mailchimp list or CRM. Supported columns include name, first name, last name, email, phone, notes, source, tags, birthday, VIP, marketing opt-in, no-shows and outstanding balance.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowImportCustomers(false)
                setImportFileName('')
                setImportPreview([])
              }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08]"
            >
              Close import
            </button>
          </div>

          <label className="block cursor-pointer rounded-[2rem] border border-dashed border-cyan-400/40 bg-cyan-400/10 p-8 text-center transition hover:bg-cyan-400/15">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleCustomerCsvUpload}
              className="hidden"
            />

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-400 text-sm font-black text-slate-950 shadow-[0_0_60px_rgba(34,211,238,.35)]">
              CSV
            </div>

            <h3 className="text-2xl font-black">
              Choose customer CSV
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              {importFileName || 'Click here to upload a CSV file.'}
            </p>
          </label>

          {importPreview.length > 0 && (
            <div className="mt-8">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-2xl font-black">
                    Import preview
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {importPreview.length} customers ready to import.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={importCustomersCsv}
                  disabled={importingCsv}
                  className="rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {importingCsv ? 'Importing customers...' : `Import ${importPreview.length} customers`}
                </button>
              </div>

              <div className="max-h-[360px] overflow-auto rounded-2xl border border-white/10 bg-slate-950">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-950 text-slate-400">
                    <tr>
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Source</th>
                      <th className="p-4">Tags</th>
                    </tr>
                  </thead>

                  <tbody>
                    {importPreview.slice(0, 50).map((customer, index) => (
                      <tr
                        key={`${customer.email || customer.phone || customer.first_name}-${index}`}
                        className="border-t border-white/10"
                      >
                        <td className="p-4 font-bold text-white">
                          {customer.first_name} {customer.last_name}
                        </td>
                        <td className="p-4 text-slate-400">{customer.email || '-'}</td>
                        <td className="p-4 text-slate-400">{customer.phone || '-'}</td>
                        <td className="p-4 text-slate-400">{customer.customer_source || '-'}</td>
                        <td className="p-4 text-slate-400">{customer.tags.join(', ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importPreview.length > 50 && (
                <p className="mt-3 text-sm text-slate-500">
                  Showing first 50 rows only. All {importPreview.length} rows will be imported.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {showAddCustomer && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Add customer manually</h2>
            <p className="text-slate-500 mt-1">
              Add CRM details, preferences, notes and commercial status.
            </p>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">
                Basic details
              </h3>

              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">First name *</label>
                  <input
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                    placeholder="First name"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Last name</label>
                  <input
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                    placeholder="Last name"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Email</label>
                  <input
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                    placeholder="Email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Phone</label>
                  <input
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                    placeholder="Phone number"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">
                CRM details
              </h3>

              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Customer source</label>
                  <input
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                    placeholder="Instagram, referral, walk-in..."
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Tags</label>
                  <input
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                    placeholder="Comma separated, e.g. beard, colour"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Birthday</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                    value={newBirthday}
                    onChange={(e) => setNewBirthday(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Marketing status</label>
                  <label className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl p-3">
                    <input
                      type="checkbox"
                      checked={newMarketingOptIn}
                      onChange={(e) => setNewMarketingOptIn(e.target.checked)}
                    />
                    <span>Marketing opt-in</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">
                Preferences
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Preferred staff</label>
                  <select
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                    value={newPreferredTeamMemberId}
                    onChange={(e) => setNewPreferredTeamMemberId(e.target.value)}
                  >
                    <option value="">No preferred staff</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Preferred service</label>
                  <select
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                    value={newPreferredServiceId}
                    onChange={(e) => setNewPreferredServiceId(e.target.value)}
                  >
                    <option value="">No preferred service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">
                Commercial status
              </h3>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">No-show count</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                    placeholder="0"
                    value={newNoShowCount}
                    onChange={(e) => setNewNoShowCount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Outstanding balance (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                    placeholder="0.00"
                    value={newOutstandingBalance}
                    onChange={(e) => setNewOutstandingBalance(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Customer status</label>
                  <label className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl p-3">
                    <input
                      type="checkbox"
                      checked={newVip}
                      onChange={(e) => setNewVip(e.target.checked)}
                    />
                    <span>VIP customer</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">
                Notes
              </h3>

              <textarea
                className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 min-h-24"
                placeholder="Profile notes, preferences, usual style, allergies..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={addCustomerManually}
            className="mt-6 bg-white text-slate-950 font-bold px-5 py-3 rounded-xl"
          >
            Add customer
          </button>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard label="Customers" value={customers.filter((customer) => !customer.archived).length} />
        <StatCard
          label="VIPs"
          value={customers.filter((customer) => customer.vip && !customer.archived).length}
        />
        <StatCard
          label="Revenue"
          value={`£${customers.reduce((total, c) => total + c.totalSpend, 0)}`}
        />
        <StatCard
          label="Outstanding"
          value={`£${customers.reduce((total, c) => total + Number(c.outstanding_balance || 0), 0)}`}
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

          <label className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            <span className="text-slate-300">Show archived customers</span>
          </label>

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
              } ${customer.archived ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold">
                    {customer.first_name} {customer.last_name}
                  </h3>
                  <p className="text-slate-400 text-sm">{customer.email}</p>
                  <p className="text-slate-500 text-sm">{customer.phone}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {customer.vip && (
                    <span className="bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 rounded-full px-3 py-1 text-xs font-bold">
                      VIP
                    </span>
                  )}

                  {customer.archived && (
                    <span className="bg-slate-700 text-slate-300 border border-slate-600 rounded-full px-3 py-1 text-xs font-bold">
                      Archived
                    </span>
                  )}
                </div>
              </div>

              {customer.tags && customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {customer.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="bg-slate-800 text-slate-300 rounded-full px-3 py-1 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

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
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h2 className="text-3xl font-bold">
                        {selectedCustomer.first_name} {selectedCustomer.last_name}
                      </h2>

                      {selectedCustomer.vip && (
                        <span className="bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 rounded-full px-3 py-1 text-xs font-bold">
                          VIP
                        </span>
                      )}

                      {selectedCustomer.archived && (
                        <span className="bg-slate-700 text-slate-300 border border-slate-600 rounded-full px-3 py-1 text-xs font-bold">
                          Archived
                        </span>
                      )}
                    </div>

                    <p className="text-slate-400">{selectedCustomer.email}</p>
                    <p className="text-slate-500">{selectedCustomer.phone}</p>

                    <div className="mt-4 grid md:grid-cols-2 gap-2 text-sm text-slate-400">
                      <p>Source: {selectedCustomer.customer_source || 'Not set'}</p>
                      <p>Birthday: {selectedCustomer.birthday ? new Date(selectedCustomer.birthday).toLocaleDateString('en-GB') : 'Not set'}</p>
                      <p>Preferred staff: {getTeamMemberName(selectedCustomer.preferred_team_member_id)}</p>
                      <p>Preferred service: {getServiceName(selectedCustomer.preferred_service_id)}</p>
                      <p>No-shows: {selectedCustomer.no_show_count || 0}</p>
                      <p>Balance: £{Number(selectedCustomer.outstanding_balance || 0)}</p>
                    </div>

                    {selectedCustomer.tags && selectedCustomer.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {selectedCustomer.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-slate-800 text-slate-300 rounded-full px-3 py-1 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-slate-500 text-sm mt-4">
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
                    <ProfileActionButton onClick={() => startEditing(selectedCustomer)}>
                      Edit
                    </ProfileActionButton>

                    <ProfileActionButton
                      onClick={() => toggleVip(selectedCustomer)}
                      variant="vip"
                    >
                      {selectedCustomer.vip ? 'Remove VIP' : 'Mark VIP'}
                    </ProfileActionButton>

                    <ProfileActionButton
                      onClick={() => toggleMarketing(selectedCustomer)}
                      variant="marketing"
                    >
                      {selectedCustomer.marketing_opt_in === false ? 'Opt in' : 'Opt out'}
                    </ProfileActionButton>

                    {selectedCustomer.archived ? (
                      <ProfileActionButton
                        onClick={() => restoreCustomer(selectedCustomer)}
                        variant="restore"
                      >
                        Restore
                      </ProfileActionButton>
                    ) : (
                      <ProfileActionButton
                        onClick={() => archiveCustomer(selectedCustomer)}
                        variant="archive"
                      >
                        Archive
                      </ProfileActionButton>
                    )}

                    <ProfileActionButton
                      onClick={() => deleteCustomer(selectedCustomer)}
                      variant="danger"
                    >
                      Delete
                    </ProfileActionButton>
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

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Last visit
                      </label>
                      <input
                        type="date"
                        className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                        value={editLastVisit}
                        onChange={(e) => setEditLastVisit(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Birthday
                      </label>
                      <input
                        type="date"
                        className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                        value={editBirthday}
                        onChange={(e) => setEditBirthday(e.target.value)}
                      />
                    </div>

                    <input
                      className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                      value={editSource}
                      onChange={(e) => setEditSource(e.target.value)}
                      placeholder="Source"
                    />

                    <input
                      className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Tags, comma separated"
                    />

                    <select
                      className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                      value={editPreferredTeamMemberId}
                      onChange={(e) => setEditPreferredTeamMemberId(e.target.value)}
                    >
                      <option value="">Preferred staff</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                      value={editPreferredServiceId}
                      onChange={(e) => setEditPreferredServiceId(e.target.value)}
                    >
                      <option value="">Preferred service</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        No-show count
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                        value={editNoShowCount}
                        onChange={(e) => setEditNoShowCount(e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Outstanding balance (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                        value={editOutstandingBalance}
                        onChange={(e) => setEditOutstandingBalance(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
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

function ProfileActionButton({
  children,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'vip' | 'marketing' | 'restore' | 'archive' | 'danger'
}) {
  const classes = {
    default: 'border-white/10 bg-white/[0.045] text-white hover:bg-white/[0.09]',
    vip: 'border-yellow-400/25 bg-yellow-400/10 text-yellow-200 hover:bg-yellow-400/15',
    marketing: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/15',
    restore: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15',
    archive: 'border-orange-400/25 bg-orange-400/10 text-orange-200 hover:bg-orange-400/15',
    danger: 'border-red-400/25 bg-red-400/10 text-red-200 hover:bg-red-400/15',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-2.5 text-sm font-black transition hover:-translate-y-0.5 ${classes[variant]}`}
    >
      {children}
    </button>
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
