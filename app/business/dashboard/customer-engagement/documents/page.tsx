'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
  slug: string | null
  plan: string | null
  lifetime_access: boolean | null
}

type Customer = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

type CustomerDocument = {
  id: string
  business_id: string
  customer_id: string | null
  title: string
  file_url: string
  category: string | null
  created_at: string | null
}

type DocumentWithCustomer = CustomerDocument & {
  customer_lookup?: Customer | null
}

type AssignmentFilter = 'all' | 'all_customers' | 'assigned'

const DOCUMENTS_FEATURE = 'documents'
const DOCUMENT_UPLOADS_FEATURE = 'document_uploads'
const DOCUMENT_ASSIGNMENT_FEATURE = 'document_assignment'
const DOCUMENT_EXPORT_FEATURE = 'document_export'
const DOCUMENT_TEMPLATES_FEATURE = 'document_templates'
const DOCUMENT_SIGNATURES_FEATURE = 'document_signatures'
const DOCUMENT_CONSENT_FORMS_FEATURE = 'document_consent_forms'
const DOCUMENT_BULK_UPLOAD_FEATURE = 'document_bulk_upload'

type FeatureState = {
  documents: boolean
  uploads: boolean
  assignment: boolean
  exportCsv: boolean
  templates: boolean
  signatures: boolean
  consentForms: boolean
  bulkUpload: boolean
}

const defaultFeatureState: FeatureState = {
  documents: false,
  uploads: false,
  assignment: false,
  exportCsv: false,
  templates: false,
  signatures: false,
  consentForms: false,
  bulkUpload: false,
}

const DOCUMENT_BUCKET = 'customer-documents'

function normalisePlan(plan?: string | null) {
  const value = String(plan || 'starter').toLowerCase().trim()

  if (value === 'premium') return 'pro'
  if (value === 'professional') return 'pro'
  if (value === 'agency') return 'pro'

  return value
}

function planDefaultsForBusiness(business?: Business | null): FeatureState {
  if (business?.lifetime_access) {
    return {
      documents: true,
      uploads: true,
      assignment: true,
      exportCsv: true,
      templates: true,
      signatures: true,
      consentForms: true,
      bulkUpload: true,
    }
  }

  const plan = normalisePlan(business?.plan)

  if (plan === 'pro' || plan === 'enterprise') {
    return {
      documents: true,
      uploads: true,
      assignment: true,
      exportCsv: true,
      templates: true,
      signatures: true,
      consentForms: true,
      bulkUpload: true,
    }
  }

  if (plan === 'growth') {
    return {
      documents: true,
      uploads: true,
      assignment: true,
      exportCsv: true,
      templates: true,
      signatures: false,
      consentForms: true,
      bulkUpload: false,
    }
  }

  return {
    documents: false,
    uploads: false,
    assignment: false,
    exportCsv: false,
    templates: false,
    signatures: false,
    consentForms: false,
    bulkUpload: false,
  }
}


function formatDate(value?: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function customerName(customer?: Customer | null) {
  if (!customer) return 'All customers'
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Customer'
}

function safeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
}

export default function DocumentsCentrePage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [documents, setDocuments] = useState<DocumentWithCustomer[]>([])
  const [features, setFeatures] = useState<FeatureState>(defaultFeatureState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all')

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [customerId, setCustomerId] = useState('all')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function getBusinessForUser() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) throw userError
    if (!user) throw new Error('You need to be logged in.')

    const { data: ownedBusinesses, error: businessError } = await supabase
      .from('businesses')
      .select('id,business_name,slug,plan,lifetime_access')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (businessError) throw businessError

    const ownedBusiness = ownedBusinesses?.[0]

    if (ownedBusiness) return ownedBusiness as Business

    const { data: staffRows } = await supabase
      .from('staff_users')
      .select('business_id')
      .eq('email', user.email)
      .limit(1)

    if (staffRows?.[0]?.business_id) {
      const { data: staffBusinesses, error: staffBusinessError } = await supabase
        .from('businesses')
        .select('id,business_name,slug,plan,lifetime_access')
        .eq('id', staffRows[0].business_id)
        .limit(1)

      if (staffBusinessError) throw staffBusinessError

      const staffBusiness = staffBusinesses?.[0]
      if (staffBusiness) return staffBusiness as Business
    }

    throw new Error('No business found for this user.')
  }

  async function loadFeatureState(foundBusiness: Business) {
    const planDefaults = planDefaultsForBusiness(foundBusiness)

    const { data, error } = await supabase
      .from('business_features')
      .select('feature_key, enabled')
      .eq('business_id', foundBusiness.id)

    if (error) {
      setFeatures(planDefaults)
      return
    }

    const applyOverride = (key: string, fallback: boolean) => {
      const row = data?.find((feature) => feature.feature_key === key)
      return typeof row?.enabled === 'boolean' ? row.enabled : fallback
    }

    setFeatures({
      documents: applyOverride(DOCUMENTS_FEATURE, planDefaults.documents),
      uploads: applyOverride(DOCUMENT_UPLOADS_FEATURE, planDefaults.uploads),
      assignment: applyOverride(DOCUMENT_ASSIGNMENT_FEATURE, planDefaults.assignment),
      exportCsv: applyOverride(DOCUMENT_EXPORT_FEATURE, planDefaults.exportCsv),
      templates: applyOverride(DOCUMENT_TEMPLATES_FEATURE, planDefaults.templates),
      signatures: applyOverride(DOCUMENT_SIGNATURES_FEATURE, planDefaults.signatures),
      consentForms: applyOverride(DOCUMENT_CONSENT_FORMS_FEATURE, planDefaults.consentForms),
      bulkUpload: applyOverride(DOCUMENT_BULK_UPLOAD_FEATURE, planDefaults.bulkUpload),
    })
  }

  async function loadData() {
    setLoading(true)
    setMessage('')

    try {
      const foundBusiness = await getBusinessForUser()
      setBusiness(foundBusiness)
      await loadFeatureState(foundBusiness)

      const [customerResult, documentResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id,first_name,last_name,email')
          .eq('business_id', foundBusiness.id)
          .order('first_name', { ascending: true }),
        supabase
          .from('customer_documents')
          .select('*')
          .eq('business_id', foundBusiness.id)
          .order('created_at', { ascending: false }),
      ])

      if (customerResult.error) throw customerResult.error
      if (documentResult.error) throw documentResult.error

      const customerRows = (customerResult.data as Customer[]) || []
      const documentRows = (documentResult.data as CustomerDocument[]) || []

      const customerMap = new Map(customerRows.map((customer) => [customer.id, customer]))

      setCustomers(customerRows)
      setDocuments(
        documentRows.map((document) => ({
          ...document,
          customer_lookup: document.customer_id ? customerMap.get(document.customer_id) || null : null,
        }))
      )
    } catch (error: any) {
      console.error('Documents load error:', error)
      setMessage(error?.message || 'Could not load documents.')
    }

    setLoading(false)
  }

  async function uploadAndShareDocument() {
    if (!business) return

    setMessage('')

    if (!features.documents) {
      setMessage('Documents are not enabled on this plan.')
      return
    }

    if (!features.uploads) {
      setMessage('Document uploads are not enabled on this plan.')
      return
    }

    if (!title.trim()) {
      setMessage('Enter a document title.')
      return
    }

    if (!selectedFile) {
      setMessage('Choose a file to upload.')
      return
    }

    if (customerId !== 'all' && !features.assignment) {
      setMessage('Customer-specific document assignment is not enabled on this plan.')
      return
    }

    setSaving(true)
    setUploading(true)

    const filePath = `${business.id}/${Date.now()}-${safeFileName(selectedFile.name)}`

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(filePath, selectedFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      setMessage(uploadError.message)
      setSaving(false)
      setUploading(false)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from(DOCUMENT_BUCKET)
      .getPublicUrl(filePath)

    const fileUrl = publicUrlData.publicUrl

    const { data, error } = await supabase
      .from('customer_documents')
      .insert({
        business_id: business.id,
        customer_id: customerId === 'all' ? null : customerId,
        title: title.trim(),
        file_url: fileUrl,
        category: category.trim() || null,
      })
      .select('*')
      .single()

    if (error) {
      await supabase.storage.from(DOCUMENT_BUCKET).remove([filePath]).catch(() => null)
      setMessage(error.message)
      setSaving(false)
      setUploading(false)
      return
    }

    const selectedCustomer = customerId === 'all' ? null : customers.find((customer) => customer.id === customerId) || null

    setDocuments((current) => [
      {
        ...(data as CustomerDocument),
        customer_lookup: selectedCustomer,
      },
      ...current,
    ])

    setTitle('')
    setCategory('')
    setCustomerId('all')
    setSelectedFile(null)

    const fileInput = document.getElementById('customer-document-file') as HTMLInputElement | null
    if (fileInput) fileInput.value = ''

    setMessage('Document uploaded and shared.')
    setSaving(false)
    setUploading(false)
  }

  async function deleteDocument(document: DocumentWithCustomer) {
    if (!confirm('Delete this document from the customer portal?')) return

    setMessage('')

    const { error } = await supabase
      .from('customer_documents')
      .delete()
      .eq('id', document.id)

    if (error) {
      setMessage(error.message)
      return
    }

    const publicPathMarker = `/storage/v1/object/public/${DOCUMENT_BUCKET}/`
    const publicPathIndex = document.file_url.indexOf(publicPathMarker)

    if (publicPathIndex >= 0) {
      const storagePath = decodeURIComponent(document.file_url.slice(publicPathIndex + publicPathMarker.length))
      await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]).catch(() => null)
    }

    setDocuments((current) => current.filter((item) => item.id !== document.id))
    setMessage('Document deleted.')
  }


  function exportDocumentsCsv() {
    if (!features.exportCsv) {
      setMessage('Document export is not enabled on this plan.')
      return
    }

    const rows = [
      ['Title', 'Category', 'Assigned to', 'File URL', 'Created at'],
      ...filteredDocuments.map((document) => [
        document.title,
        document.category || '',
        customerName(document.customer_lookup),
        document.file_url,
        formatDate(document.created_at),
      ]),
    ]

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `customer-documents-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredDocuments = useMemo(() => {
    const q = search.toLowerCase().trim()

    return documents.filter((document) => {
      const matchesAssignment =
        assignmentFilter === 'all' ||
        (assignmentFilter === 'all_customers' && !document.customer_id) ||
        (assignmentFilter === 'assigned' && Boolean(document.customer_id))

      const matchesSearch =
        !q ||
        [
          document.title,
          document.category || '',
          document.file_url,
          customerName(document.customer_lookup),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)

      return matchesAssignment && matchesSearch
    })
  }, [documents, search, assignmentFilter])

  const stats = useMemo(() => {
    return {
      total: documents.length,
      allCustomers: documents.filter((document) => !document.customer_id).length,
      assigned: documents.filter((document) => document.customer_id).length,
      categories: new Set(documents.map((document) => document.category).filter(Boolean)).size,
    }
  }, [documents])

  if (loading) {
    return <div className="text-white">Loading documents...</div>
  }

  if (!features.documents) {
    return (
      <div>
        <section className="mb-10">
          <p className="mb-2 text-slate-400">Customer Engagement</p>
          <h1 className="mb-2 text-4xl font-bold">Documents</h1>
          <p className="max-w-3xl text-slate-500">
            Documents are locked on this plan.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
            {message}
          </div>
        )}

        <LockedFeatureCard
          title="Documents are locked"
          text="Upgrade this business or enable documents from the Master Admin Feature Manager to unlock customer document uploads and sharing."
        />
      </div>
    )
  }

  return (
    <div>
      <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-slate-400">Customer Engagement</p>
          <h1 className="mb-2 text-4xl font-bold">Documents</h1>
          <p className="max-w-3xl text-slate-500">
            Upload files and share them with individual customers or all customer portal users.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
          <div className="mt-4 inline-flex rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-300">
            Current plan: {normalisePlan(business?.plan).toUpperCase()}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={exportDocumentsCsv}
            disabled={!features.exportCsv}
            className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={loadData}
            className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950"
          >
            Refresh
          </button>
        </div>
      </section>

      {message && (
        <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
          {message}
        </div>
      )}

      <section className="mb-8 grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        <FeatureCard title="Documents" enabled={features.documents} />
        <FeatureCard title="Uploads" enabled={features.uploads} />
        <FeatureCard title="Assignment" enabled={features.assignment} />
        <FeatureCard title="Export" enabled={features.exportCsv} />
        <FeatureCard title="Templates" enabled={features.templates} />
        <FeatureCard title="Signatures" enabled={features.signatures} />
        <FeatureCard title="Consent Forms" enabled={features.consentForms} />
        <FeatureCard title="Bulk Upload" enabled={features.bulkUpload} />
      </section>


      <section className="mb-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-6 text-cyan-100">
        <h2 className="text-2xl font-bold">Documents commercial status</h2>
        <p className="mt-2 max-w-4xl text-sm">
          Documents now use plan defaults with business feature overrides. A Pro or Premium business unlocks the full Documents Centre by default, while the Master Admin Feature Manager can still switch individual capabilities on or off.
        </p>
      </section>

      <section className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard label="Documents uploaded" value={stats.total} />
        <StatCard label="Shared with all" value={stats.allCustomers} />
        <StatCard label="Customer assigned" value={stats.assigned} />
        <StatCard label="Categories" value={stats.categories} />
      </section>


      {(!features.templates || !features.exportCsv || !features.signatures || !features.consentForms || !features.bulkUpload) && (
        <section className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-amber-100">
          <h2 className="text-2xl font-bold text-amber-200">Premium document tools</h2>
          <p className="mt-2 text-sm">
            Locked document tools can be enabled by moving this business to Pro/Premium or by switching on individual feature overrides in Master Admin.
          </p>
        </section>
      )}


      <section className="mb-8 grid gap-6 xl:grid-cols-4">
        <PremiumFeaturePanel
          title="Document templates"
          description="Create reusable document templates for onboarding packs, treatment forms, waivers and customer guides."
          enabled={features.templates}
        />

        <PremiumFeaturePanel
          title="PDF export"
          description="Export document lists, customer document records and internal audit logs for operational reporting."
          enabled={features.exportCsv}
        />

        <PremiumFeaturePanel
          title="Digital signatures"
          description="Send forms and documents for approval, agreement or acceptance before appointments."
          enabled={features.signatures}
        />

        <PremiumFeaturePanel
          title="Consent forms"
          description="Manage consent forms, waivers, treatment acceptance forms and customer declarations."
          enabled={features.consentForms}
        />
      </section>

      <section className="mb-8 grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-2 text-2xl font-bold">Upload document</h2>
          <p className="mb-6 text-slate-400">
            Upload PDFs, images, forms or documents directly to Supabase Storage and publish them into the customer portal.
          </p>

          <div className="space-y-4">
            {!features.uploads && (
              <LockedInline message="Document uploads are locked on this plan." />
            )}

            {!features.assignment && (
              <LockedInline message="Customer-specific assignment is locked on this plan." />
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Document title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Meal plan, invoice, onboarding PDF"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">File</span>
              <input
                id="customer-document-file"
                disabled={!features.uploads}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt,.csv"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:font-bold file:text-slate-950"
              />
              {selectedFile && (
                <span className="mt-2 block text-xs text-slate-500">
                  Selected: {selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              )}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Category</span>
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Plans, forms, invoices, guides"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Assign to</span>
              <select
                disabled={!features.assignment}
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                <option value="all">All customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customerName(customer)}{customer.email ? ` · ${customer.email}` : ''}
                  </option>
                ))}
              </select>
              {!features.assignment && (
                <span className="mt-2 block text-xs text-amber-300">
                  Individual customer assignment is locked. Enable Document Assignment to unlock customer-specific files.
                </span>
              )}
            </label>

            <button
              type="button"
              onClick={uploadAndShareDocument}
              disabled={saving || uploading || !features.uploads}
              className="w-full rounded-xl bg-white px-5 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : saving ? 'Sharing...' : 'Upload and share document'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search documents..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
            />

            <select
              value={assignmentFilter}
              onChange={(event) => setAssignmentFilter(event.target.value as AssignmentFilter)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
            >
              <option value="all">All documents</option>
              <option value="all_customers">Shared with all</option>
              <option value="assigned">Assigned customer</option>
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {filteredDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onDelete={() => deleteDocument(document)}
              />
            ))}

            {filteredDocuments.length === 0 && <EmptyState message="No documents found." />}
          </div>
        </section>
      </section>
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="mb-2 text-slate-400">{label}</p>
      <h2 className="text-3xl font-bold">{value}</h2>
    </div>
  )
}

function DocumentCard({
  document,
  onDelete,
}: {
  document: DocumentWithCustomer
  onDelete: () => void
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-bold">{document.title}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {document.category || 'Uncategorised'} · {customerName(document.customer_lookup)}
          </p>
          <p className="mt-1 break-all text-sm text-slate-600">{document.file_url}</p>
          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Added {formatDate(document.created_at)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:w-36">
          <a
            href={document.file_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-slate-800 px-4 py-3 text-center text-sm font-bold text-white hover:bg-slate-700"
          >
            Open
          </a>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/20"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}

function FeatureCard({ title, enabled }: { title: string; enabled: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="font-bold text-white">{title}</p>
        <span
          className={
            enabled
              ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300'
              : 'rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-300'
          }
        >
          {enabled ? 'Enabled' : 'Locked'}
        </span>
      </div>
    </div>
  )
}

function PremiumFeaturePanel({
  title,
  description,
  enabled,
}: {
  title: string
  description: string
  enabled: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <span
          className={
            enabled
              ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300'
              : 'rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-300'
          }
        >
          {enabled ? 'Enabled' : 'Pro Feature'}
        </span>
      </div>
      <p className="text-sm text-slate-400">{description}</p>
      {!enabled && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
          Enable this from the Master Admin Feature Manager.
        </div>
      )}
    </div>
  )
}

function LockedInline({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-semibold text-amber-200">
      {message}
    </div>
  )
}

function LockedFeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="max-w-3xl rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8 text-amber-100">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-amber-300">
        Upgrade required
      </p>
      <h2 className="text-3xl font-black text-white">{title}</h2>
      <p className="mt-3 text-slate-300">{text}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-8 text-center text-slate-500">
      {message}
    </div>
  )
}
