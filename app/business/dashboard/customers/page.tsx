'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  Crown,
  Download,
  Mail,
  Phone,
  Plus,
  Search,
  Upload,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import DashboardPage from '@/components/dashboard/DashboardPage'
import DashboardHero from '@/components/dashboard/DashboardHero'
import DashboardGrid from '@/components/dashboard/DashboardGrid'
import DashboardStatCard from '@/components/dashboard/StatCard'
import SectionCard from '@/components/dashboard/SectionCard'

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

type FilterKey = 'all' | 'vip' | 'marketing' | 'archived'

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'vip', label: 'VIP' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'archived', label: 'Archived' },
]

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [businessId, setBusinessId] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
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

  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) || null

  const activeCustomers = customers.filter((customer) => !customer.archived)
  const vipCustomers = activeCustomers.filter((customer) => customer.vip)
  const marketingCustomers = activeCustomers.filter(
    (customer) => customer.marketing_opt_in !== false
  )
  const archivedCustomers = customers.filter((customer) => customer.archived)
  const totalRevenue = customers.reduce((total, c) => total + c.totalSpend, 0)
  const outstandingBalance = customers.reduce(
    (total, c) => total + Number(c.outstanding_balance || 0),
    0
  )

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      if (activeFilter === 'all' && customer.archived) return false
      if (activeFilter === 'vip' && (!customer.vip || customer.archived)) return false
      if (
        activeFilter === 'marketing' &&
        (customer.marketing_opt_in === false || customer.archived)
      ) {
        return false
      }
      if (activeFilter === 'archived' && !customer.archived) return false

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
  }, [customers, activeFilter, searchTerm])

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
          (booking) => booking.status !== 'cancelled' && booking.status !== 'no_show'
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

        const customerNotes = notes.filter((item) => item.customer_id === customer.id)

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

    const { error } = await supabase.from('customers').delete().eq('id', customer.id)

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
          lastNameFromCsv || (splitName.length > 1 ? splitName.slice(1).join(' ') : '')

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

    const headers = Object.keys(
      rows[0] || {
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
      }
    )

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
    <DashboardPage>
      <DashboardHero
        eyebrow="CRM"
        title="Customers."
        description="View customer history, CRM notes, VIP status and lifetime value."
        actions={
          <>
            <ActionButton
              onClick={() => {
                setShowAddCustomer((value) => !value)
                setShowImportCustomers(false)
              }}
              variant="primary"
              icon={<Plus size={17} />}
            >
              {showAddCustomer ? 'Close form' : 'Add customer'}
            </ActionButton>

            <ActionButton
              onClick={() => {
                setShowImportCustomers((value) => !value)
                setShowAddCustomer(false)
              }}
              variant="secondary"
              icon={<Upload size={17} />}
            >
              Import
            </ActionButton>

            <ActionButton onClick={exportCustomersCsv} icon={<Download size={17} />}>
              Export
            </ActionButton>
          </>
        }
      />

      {message && (
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-100">
          {message}
        </div>
      )}

      <DashboardGrid columns={4}>
        <DashboardStatCard label="Customers" value={activeCustomers.length} icon={<Users size={22} />} />
        <DashboardStatCard label="VIPs" value={vipCustomers.length} icon={<Crown size={22} />} colour="amber" />
        <DashboardStatCard label="Revenue" value={`£${totalRevenue}`} icon={<Wallet size={22} />} colour="emerald" />
        <DashboardStatCard label="Outstanding" value={`£${outstandingBalance}`} icon={<Archive size={22} />} colour="rose" />
      </DashboardGrid>

      {showImportCustomers && (
        <SectionCard title="Import customers" description="Upload a CSV from your previous CRM or booking system.">
          <label className="block cursor-pointer rounded-[2rem] border border-dashed border-cyan-400/40 bg-cyan-400/10 p-8 text-center transition hover:bg-cyan-400/15">
            <input type="file" accept=".csv,text/csv" onChange={handleCustomerCsvUpload} className="hidden" />
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-400 text-sm font-black text-slate-950">
              CSV
            </div>
            <h3 className="text-2xl font-black text-white">Choose customer CSV</h3>
            <p className="mt-2 text-sm text-slate-400">{importFileName || 'Click here to upload a CSV file.'}</p>
          </label>

          {importPreview.length > 0 && (
            <div className="mt-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-slate-300">
                  {importPreview.length} customers ready to import.
                </p>
                <ActionButton onClick={importCustomersCsv} variant="primary">
                  {importingCsv ? 'Importing...' : `Import ${importPreview.length}`}
                </ActionButton>
              </div>

              <div className="max-h-[320px] overflow-auto rounded-2xl border border-white/10 bg-slate-950">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-950 text-slate-400">
                    <tr>
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.slice(0, 50).map((customer, index) => (
                      <tr key={`${customer.email || customer.phone || customer.first_name}-${index}`} className="border-t border-white/10">
                        <td className="p-4 font-bold text-white">{customer.first_name} {customer.last_name}</td>
                        <td className="p-4 text-slate-400">{customer.email || '-'}</td>
                        <td className="p-4 text-slate-400">{customer.phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {showAddCustomer && (
        <SectionCard title="Add customer manually" description="Add CRM details, preferences and customer notes.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input label="First name *" value={newFirstName} onChange={setNewFirstName} />
            <Input label="Last name" value={newLastName} onChange={setNewLastName} />
            <Input label="Email" value={newEmail} onChange={setNewEmail} />
            <Input label="Phone" value={newPhone} onChange={setNewPhone} />
            <Input label="Customer source" value={newSource} onChange={setNewSource} />
            <Input label="Tags" value={newTags} onChange={setNewTags} placeholder="Comma separated" />
            <Input label="Birthday" value={newBirthday} onChange={setNewBirthday} type="date" />
            <Input label="No-show count" value={newNoShowCount} onChange={setNewNoShowCount} type="number" />
            <Input label="Outstanding balance (£)" value={newOutstandingBalance} onChange={setNewOutstandingBalance} type="number" />

            <Select label="Preferred staff" value={newPreferredTeamMemberId} onChange={setNewPreferredTeamMemberId}>
              <option value="">No preferred staff</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.full_name}</option>
              ))}
            </Select>

            <Select label="Preferred service" value={newPreferredServiceId} onChange={setNewPreferredServiceId}>
              <option value="">No preferred service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </Select>

            <Toggle label="VIP customer" checked={newVip} onChange={setNewVip} />
            <Toggle label="Marketing opt-in" checked={newMarketingOptIn} onChange={setNewMarketingOptIn} />
          </div>

          <textarea
            className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
            placeholder="Profile notes, preferences, usual style, allergies..."
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
          />

          <div className="mt-5">
            <ActionButton onClick={addCustomerManually} variant="primary">
              Add customer
            </ActionButton>
          </div>
        </SectionCard>
      )}

      <SectionCard>
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search customers..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950 py-4 pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300 lg:w-96"
              />
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
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-3">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId(customer.id)
                    setIsEditing(false)
                    setMessage('')
                  }}
                  className={`w-full rounded-[2rem] border p-5 text-left transition hover:-translate-y-0.5 ${
                    selectedCustomerId === customer.id
                      ? 'border-cyan-300/40 bg-cyan-400/10'
                      : 'border-white/10 bg-slate-950/80 hover:border-white/20'
                  } ${customer.archived ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-white">
                        {customer.first_name} {customer.last_name}
                      </h3>
                      <p className="mt-1 truncate text-sm text-slate-400">{customer.email || 'No email'}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">{customer.phone || 'No phone'}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {customer.vip && <Badge colour="amber">VIP</Badge>}
                      {customer.archived && <Badge colour="slate">Archived</Badge>}
                    </div>
                  </div>

                  {customer.tags && customer.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {customer.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-white/[0.04] px-3 py-1 text-xs font-bold text-slate-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniStat label="Bookings" value={customer.totalBookings} />
                    <MiniStat label="Spend" value={`£${customer.totalSpend}`} />
                  </div>
                </button>
              ))}

              {filteredCustomers.length === 0 && (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-500">
                  No customers found.
                </div>
              )}
            </div>

            <div>
              {!selectedCustomer ? (
                <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-500">
                  Select a customer to view their profile.
                </div>
              ) : (
                <CustomerProfile
                  customer={selectedCustomer}
                  isEditing={isEditing}
                  note={note}
                  setNote={setNote}
                  startEditing={startEditing}
                  toggleVip={toggleVip}
                  toggleMarketing={toggleMarketing}
                  archiveCustomer={archiveCustomer}
                  restoreCustomer={restoreCustomer}
                  deleteCustomer={deleteCustomer}
                  addNote={addNote}
                  getTeamMemberName={getTeamMemberName}
                  getServiceName={getServiceName}
                  editState={{
                    editFirstName,
                    editLastName,
                    editEmail,
                    editPhone,
                    editNotes,
                    editVip,
                    editMarketingOptIn,
                    editLastVisit,
                    editSource,
                    editTags,
                    editPreferredTeamMemberId,
                    editPreferredServiceId,
                    editBirthday,
                    editNoShowCount,
                    editOutstandingBalance,
                    setEditFirstName,
                    setEditLastName,
                    setEditEmail,
                    setEditPhone,
                    setEditNotes,
                    setEditVip,
                    setEditMarketingOptIn,
                    setEditLastVisit,
                    setEditSource,
                    setEditTags,
                    setEditPreferredTeamMemberId,
                    setEditPreferredServiceId,
                    setEditBirthday,
                    setEditNoShowCount,
                    setEditOutstandingBalance,
                    saveCustomerChanges,
                    setIsEditing,
                    teamMembers,
                    services,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </DashboardPage>
  )
}

function CustomerProfile({
  customer,
  isEditing,
  note,
  setNote,
  startEditing,
  toggleVip,
  toggleMarketing,
  archiveCustomer,
  restoreCustomer,
  deleteCustomer,
  addNote,
  getTeamMemberName,
  getServiceName,
  editState,
}: {
  customer: CustomerWithStats
  isEditing: boolean
  note: string
  setNote: (value: string) => void
  startEditing: (customer: CustomerWithStats) => void
  toggleVip: (customer: CustomerWithStats) => void
  toggleMarketing: (customer: CustomerWithStats) => void
  archiveCustomer: (customer: CustomerWithStats) => void
  restoreCustomer: (customer: CustomerWithStats) => void
  deleteCustomer: (customer: CustomerWithStats) => void
  addNote: () => void
  getTeamMemberName: (id: string | null) => string
  getServiceName: (id: string | null) => string
  editState: any
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black tracking-[-0.04em] text-white">
                {customer.first_name} {customer.last_name}
              </h2>
              {customer.vip && <Badge colour="amber">VIP</Badge>}
              {customer.archived && <Badge colour="slate">Archived</Badge>}
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-400">
              <p className="flex items-center gap-2"><Mail size={15} /> {customer.email || 'No email'}</p>
              <p className="flex items-center gap-2"><Phone size={15} /> {customer.phone || 'No phone'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ProfileActionButton onClick={() => startEditing(customer)}>Edit</ProfileActionButton>
            <ProfileActionButton onClick={() => toggleVip(customer)} variant="vip">
              {customer.vip ? 'Remove VIP' : 'Mark VIP'}
            </ProfileActionButton>
            <ProfileActionButton onClick={() => toggleMarketing(customer)} variant="marketing">
              {customer.marketing_opt_in === false ? 'Opt in' : 'Opt out'}
            </ProfileActionButton>
            {customer.archived ? (
              <ProfileActionButton onClick={() => restoreCustomer(customer)} variant="restore">
                Restore
              </ProfileActionButton>
            ) : (
              <ProfileActionButton onClick={() => archiveCustomer(customer)} variant="archive">
                Archive
              </ProfileActionButton>
            )}
            <ProfileActionButton onClick={() => deleteCustomer(customer)} variant="danger">
              Delete
            </ProfileActionButton>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat label="Bookings" value={customer.totalBookings} />
          <MiniStat label="Spend" value={`£${customer.totalSpend}`} />
          <MiniStat label="Last visit" value={customer.lastBooking ? new Date(customer.lastBooking).toLocaleDateString('en-GB') : 'None'} />
          <MiniStat label="Next" value={customer.nextBooking ? new Date(customer.nextBooking).toLocaleDateString('en-GB') : 'None'} />
        </div>

        <div className="mt-5 grid gap-2 text-sm text-slate-400 md:grid-cols-2">
          <p>Source: {customer.customer_source || 'Not set'}</p>
          <p>Birthday: {customer.birthday ? new Date(customer.birthday).toLocaleDateString('en-GB') : 'Not set'}</p>
          <p>Preferred staff: {getTeamMemberName(customer.preferred_team_member_id)}</p>
          <p>Preferred service: {getServiceName(customer.preferred_service_id)}</p>
          <p>No-shows: {customer.no_show_count || 0}</p>
          <p>Balance: £{Number(customer.outstanding_balance || 0)}</p>
        </div>

        {customer.notes && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <h3 className="font-black text-white">Profile notes</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{customer.notes}</p>
          </div>
        )}
      </div>

      {isEditing && <EditCustomerForm editState={editState} />}

      <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5">
        <h3 className="text-xl font-black text-white">Add timeline note</h3>
        <textarea
          className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-[#020617] px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
          placeholder="Add customer note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-4">
          <ActionButton onClick={addNote} variant="primary">Save note</ActionButton>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5">
        <h3 className="text-xl font-black text-white">Timeline notes</h3>
        <div className="mt-4 space-y-3">
          {customer.notesList.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-slate-300">{item.note}</p>
              <p className="mt-2 text-xs text-slate-500">{new Date(item.created_at).toLocaleString('en-GB')}</p>
            </div>
          ))}
          {customer.notesList.length === 0 && <p className="text-slate-500">No timeline notes yet.</p>}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5">
        <h3 className="text-xl font-black text-white">Appointment history</h3>
        <div className="mt-4 space-y-3">
          {customer.bookings.map((booking) => (
            <div key={booking.id} className="flex justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div>
                <p className="font-black text-white">{booking.services?.[0]?.name || 'Unknown service'}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {new Date(booking.booking_date).toLocaleDateString('en-GB')} at {booking.booking_time?.slice(0, 5)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-black text-white">£{booking.services?.[0]?.price || 0}</p>
                <p className="mt-1 text-sm text-slate-500">{booking.status || 'confirmed'}</p>
              </div>
            </div>
          ))}
          {customer.bookings.length === 0 && <p className="text-slate-500">No appointment history yet.</p>}
        </div>
      </div>
    </div>
  )
}

function EditCustomerForm({ editState }: { editState: any }) {
  const s = editState

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5">
      <h3 className="text-xl font-black text-white">Edit customer</h3>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Input label="First name" value={s.editFirstName} onChange={s.setEditFirstName} />
        <Input label="Last name" value={s.editLastName} onChange={s.setEditLastName} />
        <Input label="Email" value={s.editEmail} onChange={s.setEditEmail} />
        <Input label="Phone" value={s.editPhone} onChange={s.setEditPhone} />
        <Input label="Last visit" value={s.editLastVisit} onChange={s.setEditLastVisit} type="date" />
        <Input label="Birthday" value={s.editBirthday} onChange={s.setEditBirthday} type="date" />
        <Input label="Source" value={s.editSource} onChange={s.setEditSource} />
        <Input label="Tags" value={s.editTags} onChange={s.setEditTags} />
        <Input label="No-show count" value={s.editNoShowCount} onChange={s.setEditNoShowCount} type="number" />
        <Input label="Outstanding balance (£)" value={s.editOutstandingBalance} onChange={s.setEditOutstandingBalance} type="number" />

        <Select label="Preferred staff" value={s.editPreferredTeamMemberId} onChange={s.setEditPreferredTeamMemberId}>
          <option value="">Preferred staff</option>
          {s.teamMembers.map((member: TeamMember) => (
            <option key={member.id} value={member.id}>{member.full_name}</option>
          ))}
        </Select>

        <Select label="Preferred service" value={s.editPreferredServiceId} onChange={s.setEditPreferredServiceId}>
          <option value="">Preferred service</option>
          {s.services.map((service: Service) => (
            <option key={service.id} value={service.id}>{service.name}</option>
          ))}
        </Select>

        <Toggle label="VIP customer" checked={s.editVip} onChange={s.setEditVip} />
        <Toggle label="Marketing opt-in" checked={s.editMarketingOptIn} onChange={s.setEditMarketingOptIn} />
      </div>

      <textarea
        className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-[#020617] px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
        value={s.editNotes}
        onChange={(e) => s.setEditNotes(e.target.value)}
        placeholder="Profile notes..."
      />

      <div className="mt-5 flex flex-wrap gap-3">
        <ActionButton onClick={s.saveCustomerChanges} variant="primary">Save changes</ActionButton>
        <ActionButton onClick={() => s.setIsEditing(false)}>Cancel</ActionButton>
      </div>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-slate-400">{label}</span>
      <input
        type={type}
        className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-slate-400">{label}</span>
      <select
        className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-cyan-400"
      />
      <span className="text-sm font-bold text-slate-300">{label}</span>
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
  variant?: 'default' | 'primary' | 'secondary'
  icon?: React.ReactNode
}) {
  const styles = {
    default: 'border-white/10 bg-white/[0.045] text-white hover:bg-white/[0.09]',
    primary: 'border-cyan-400/20 bg-cyan-400 text-slate-950 hover:bg-cyan-300',
    secondary: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15',
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

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}

function Badge({
  children,
  colour,
}: {
  children: React.ReactNode
  colour: 'amber' | 'slate'
}) {
  const styles = {
    amber: 'border-yellow-400/25 bg-yellow-400/10 text-yellow-200',
    slate: 'border-white/10 bg-white/[0.06] text-slate-300',
  }

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${styles[colour]}`}>
      {children}
    </span>
  )
}