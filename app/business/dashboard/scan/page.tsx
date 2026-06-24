'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
}

type Customer = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
}

type Membership = {
  id: string
  business_id: string
  customer_id: string
  membership_name: string
  status: string | null
  billing_interval: string | null
  monthly_amount: number | null
  included_sessions: number | null
  sessions_used: number | null
  current_period_start: string | null
  current_period_end: string | null
}

type Loyalty = {
  id: string
  business_id: string
  customer_id: string
  visits_required: number | null
  visits_completed: number | null
  reward_label: string | null
  status: string | null
}

type Voucher = {
  id: string
  business_id: string
  code: string | null
  amount: number | null
  remaining_amount: number | null
  recipient_email: string | null
  purchaser_email: string | null
  status: string | null
  expiry_date: string | null
  redeemed_at?: string | null
}

type PackageRow = {
  id: string
  sessions_purchased: number | null
  sessions_used: number | null
  sessions_remaining: number | null
  status: string | null
  packages?: {
    name?: string | null
    package_name?: string | null
  } | {
    name?: string | null
    package_name?: string | null
  }[] | null
}

type CheckIn = {
  id: string
  business_id: string
  customer_id: string
  checked_in_at: string
  source: string | null
  notes: string | null
  customer_name?: string | null
  customer_email?: string | null
}

type ScanResult = {
  type: 'membership' | 'voucher' | 'loyalty' | 'customer' | 'unknown'
  rawCode: string
  customer: Customer | null
  membership: Membership | null
  loyalty: Loyalty | null
  voucher: Voucher | null
  packages: PackageRow[]
}

function joinOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] || null
  return value
}

function customerName(customer: Customer | null) {
  if (!customer) return 'Unknown customer'
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Customer'
}

function money(value: number | string | null | undefined) {
  return `£${Number(value || 0).toFixed(2)}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function membershipSessionsRemaining(membership: Membership | null) {
  if (!membership) return 0
  return Math.max(0, Number(membership.included_sessions || 0) - Number(membership.sessions_used || 0))
}

function loyaltyProgress(loyalty: Loyalty | null) {
  if (!loyalty) return 0
  const required = Number(loyalty.visits_required || 0)
  const completed = Number(loyalty.visits_completed || 0)
  if (required <= 0) return 0
  return Math.min(100, Math.round((completed / required) * 100))
}

function loyaltyVisitsRemaining(loyalty: Loyalty | null) {
  if (!loyalty) return 0
  return Math.max(0, Number(loyalty.visits_required || 0) - Number(loyalty.visits_completed || 0))
}

function loyaltyRewardEarned(loyalty: Loyalty | null) {
  if (!loyalty) return false
  return loyalty.status === 'earned' || loyaltyProgress(loyalty) >= 100
}

function packageName(item: PackageRow) {
  const pack = joinOne(item.packages)
  return pack?.name || pack?.package_name || 'Package'
}

function packageSessionsRemaining(item: PackageRow) {
  return Number(item.sessions_remaining ?? 0)
}

function statusClass(status?: string | null) {
  if (status === 'active' || status === 'paid' || status === 'confirmed') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
  }

  if (status === 'redeemed' || status === 'expired' || status === 'cancelled') {
    return 'border-red-500/20 bg-red-500/10 text-red-300'
  }

  if (status === 'earned') {
    return 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200'
  }

  return 'border-slate-500/20 bg-slate-500/10 text-slate-300'
}

export default function ScanCentrePage() {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const busyRef = useRef(false)
  const [business, setBusiness] = useState<Business | null>(null)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [message, setMessage] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [todayCheckins, setTodayCheckins] = useState<CheckIn[]>([])

  useEffect(() => {
    loadBusiness()
    return () => {
      stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadBusiness() {
    setLoading(true)
    setMessage('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error('You need to be logged in.')

      const { data: ownedBusinesses, error: businessError } = await supabase
        .from('businesses')
        .select('id,business_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (businessError) throw businessError

      if (ownedBusinesses?.[0]) {
        const foundBusiness = ownedBusinesses[0] as Business
        setBusiness(foundBusiness)
        await loadTodayCheckins(foundBusiness.id)
        setLoading(false)
        return
      }

      const { data: staffRows } = await supabase
        .from('staff_users')
        .select('business_id')
        .eq('email', user.email)
        .limit(1)

      if (staffRows?.[0]?.business_id) {
        const { data: staffBusinesses, error: staffBusinessError } = await supabase
          .from('businesses')
          .select('id,business_name')
          .eq('id', staffRows[0].business_id)
          .limit(1)

        if (staffBusinessError) throw staffBusinessError

        if (staffBusinesses?.[0]) {
          const foundBusiness = staffBusinesses[0] as Business
          setBusiness(foundBusiness)
          await loadTodayCheckins(foundBusiness.id)
          setLoading(false)
          return
        }
      }

      throw new Error('No business found for this user.')
    } catch (error: any) {
      setMessage(error?.message || 'Could not load scan centre.')
      setLoading(false)
    }
  }


  async function loadTodayCheckins(businessId?: string) {
    const targetBusinessId = businessId || business?.id
    if (!targetBusinessId) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: checkinsData, error: checkinsError } = await supabase
      .from('customer_checkins')
      .select('id,business_id,customer_id,checked_in_at,source,notes')
      .eq('business_id', targetBusinessId)
      .gte('checked_in_at', today.toISOString())
      .order('checked_in_at', { ascending: false })

    if (checkinsError) {
      console.error('Could not load check-ins:', checkinsError)
      setMessage(checkinsError.message || 'Could not load check-ins.')
      return
    }

    const checkins = (checkinsData as CheckIn[]) || []
    const customerIds = Array.from(new Set(checkins.map((item) => item.customer_id).filter(Boolean)))

    if (customerIds.length === 0) {
      setTodayCheckins(checkins)
      return
    }

    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('id,first_name,last_name,email')
      .eq('business_id', targetBusinessId)
      .in('id', customerIds)

    if (customersError) {
      console.error('Could not load check-in customers:', customersError)
      setTodayCheckins(checkins)
      return
    }

    const customerMap = new Map(
      ((customersData as { id: string; first_name: string | null; last_name: string | null; email: string | null }[]) || []).map((customer) => [
        customer.id,
        customer,
      ])
    )

    const enrichedCheckins = checkins.map((checkin) => {
      const foundCustomer = customerMap.get(checkin.customer_id)
      const foundName = foundCustomer
        ? `${foundCustomer.first_name || ''} ${foundCustomer.last_name || ''}`.trim()
        : ''

      return {
        ...checkin,
        customer_name: foundName || foundCustomer?.email || 'Customer',
        customer_email: foundCustomer?.email || null,
      }
    })

    setTodayCheckins(enrichedCheckins)
  }

  async function startScanner() {
    setMessage('')

    if (scannerRef.current || cameraStarted) return

    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          if (busyRef.current) return
          busyRef.current = true
          await stopScanner()
          await resolveCode(decodedText)
          busyRef.current = false
        },
        () => {}
      )

      setCameraStarted(true)
    } catch (error: any) {
      setMessage(error?.message || 'Could not start camera. Use manual code entry instead.')
      setCameraStarted(false)
      scannerRef.current = null
    }
  }

  async function stopScanner() {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop()
      }
      await scannerRef.current?.clear()
    } catch {
      // Ignore scanner cleanup errors.
    }

    scannerRef.current = null
    setCameraStarted(false)
  }

  async function resolveCode(code: string) {
    if (!business) {
      setMessage('Business not loaded yet.')
      return
    }

    const rawCode = String(code || '').trim()
    if (!rawCode) {
      setMessage('No QR code found.')
      return
    }

    setMessage('')
    setScanResult(null)

    const cleanCode = rawCode
      .replace('membership:', '')
      .replace('voucher:', '')
      .replace('loyalty:', '')
      .replace('customer:', '')
      .trim()

    try {
      let result: ScanResult | null = null

      result = await findMembership(cleanCode, rawCode)
      if (result) return setScanResult(result)

      result = await findVoucher(cleanCode, rawCode)
      if (result) return setScanResult(result)

      result = await findLoyalty(cleanCode, rawCode)
      if (result) return setScanResult(result)

      result = await findCustomer(cleanCode, rawCode)
      if (result) return setScanResult(result)

      setScanResult({
        type: 'unknown',
        rawCode,
        customer: null,
        membership: null,
        loyalty: null,
        voucher: null,
        packages: [],
      })
      setMessage('No matching customer, membership, voucher or loyalty record found.')
    } catch (error: any) {
      setMessage(error?.message || 'Could not resolve QR code.')
    }
  }

  async function findMembership(code: string, rawCode: string): Promise<ScanResult | null> {
    if (!business) return null

    const { data, error } = await supabase
      .from('customer_memberships')
      .select('*')
      .eq('business_id', business.id)
      .eq('id', code)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return buildCustomerResult({
      type: 'membership',
      rawCode,
      customerId: data.customer_id,
      membership: data as Membership,
      voucher: null,
      loyaltyOverride: null,
    })
  }

  async function findVoucher(code: string, rawCode: string): Promise<ScanResult | null> {
    if (!business) return null

    let voucher: Voucher | null = null

    const byCode = await supabase
      .from('gift_vouchers')
      .select('*')
      .eq('business_id', business.id)
      .eq('code', code)
      .maybeSingle()

    if (byCode.error) throw byCode.error
    voucher = byCode.data as Voucher | null

    if (!voucher) {
      const byId = await supabase
        .from('gift_vouchers')
        .select('*')
        .eq('business_id', business.id)
        .eq('id', code)
        .maybeSingle()

      if (byId.error) throw byId.error
      voucher = byId.data as Voucher | null
    }

    if (!voucher) return null

    let customer: Customer | null = null

    if (voucher.recipient_email) {
      const { data: foundCustomer, error } = await supabase
        .from('customers')
        .select('id,first_name,last_name,email,phone')
        .eq('business_id', business.id)
        .eq('email', voucher.recipient_email)
        .maybeSingle()

      if (error) throw error
      customer = foundCustomer as Customer | null
    }

    if (!customer && voucher.purchaser_email) {
      const { data: foundCustomer, error } = await supabase
        .from('customers')
        .select('id,first_name,last_name,email,phone')
        .eq('business_id', business.id)
        .eq('email', voucher.purchaser_email)
        .maybeSingle()

      if (error) throw error
      customer = foundCustomer as Customer | null
    }

    return customer
      ? buildCustomerResult({
          type: 'voucher',
          rawCode,
          customerId: customer.id,
          membership: null,
          voucher,
          loyaltyOverride: null,
        })
      : {
          type: 'voucher',
          rawCode,
          customer: null,
          membership: null,
          loyalty: null,
          voucher,
          packages: [],
        }
  }

  async function findLoyalty(code: string, rawCode: string): Promise<ScanResult | null> {
    if (!business) return null

    const { data, error } = await supabase
      .from('customer_loyalty')
      .select('*')
      .eq('business_id', business.id)
      .eq('id', code)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return buildCustomerResult({
      type: 'loyalty',
      rawCode,
      customerId: data.customer_id,
      membership: null,
      voucher: null,
      loyaltyOverride: data as Loyalty,
    })
  }

  async function findCustomer(code: string, rawCode: string): Promise<ScanResult | null> {
    if (!business) return null

    const { data, error } = await supabase
      .from('customers')
      .select('id,first_name,last_name,email,phone')
      .eq('business_id', business.id)
      .eq('id', code)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return buildCustomerResult({
      type: 'customer',
      rawCode,
      customerId: data.id,
      membership: null,
      voucher: null,
      loyaltyOverride: null,
    })
  }

  async function buildCustomerResult({
    type,
    rawCode,
    customerId,
    membership,
    voucher,
    loyaltyOverride,
  }: {
    type: ScanResult['type']
    rawCode: string
    customerId: string
    membership: Membership | null
    voucher: Voucher | null
    loyaltyOverride: Loyalty | null
  }): Promise<ScanResult> {
    if (!business) throw new Error('Business not loaded.')

    const [customerResult, membershipResult, loyaltyResult, packageResult] = await Promise.all([
      supabase
        .from('customers')
        .select('id,first_name,last_name,email,phone')
        .eq('business_id', business.id)
        .eq('id', customerId)
        .maybeSingle(),
      membership
        ? Promise.resolve({ data: membership, error: null })
        : supabase
            .from('customer_memberships')
            .select('*')
            .eq('business_id', business.id)
            .eq('customer_id', customerId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
      loyaltyOverride
        ? Promise.resolve({ data: loyaltyOverride, error: null })
        : supabase
            .from('customer_loyalty')
            .select('*')
            .eq('business_id', business.id)
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
      supabase
        .from('customer_packages')
        .select('*, packages(name,package_name)')
        .eq('business_id', business.id)
        .eq('customer_id', customerId)
        .order('purchase_date', { ascending: false }),
    ])

    if (customerResult.error) throw customerResult.error
    if (membershipResult.error) throw membershipResult.error
    if (loyaltyResult.error) throw loyaltyResult.error
    if (packageResult.error) throw packageResult.error

    return {
      type,
      rawCode,
      customer: customerResult.data as Customer | null,
      membership: membershipResult.data as Membership | null,
      loyalty: loyaltyResult.data as Loyalty | null,
      voucher,
      packages: (packageResult.data as PackageRow[]) || [],
    }
  }


  async function checkInCustomer() {
    if (!business || !scanResult?.customer) {
      setMessage('Scan a customer before checking in.')
      return
    }

    setActionLoading('checkin')
    setMessage('')

    const scannedCustomer = scanResult.customer

    const { data, error } = await supabase
      .from('customer_checkins')
      .insert({
        business_id: business.id,
        customer_id: scannedCustomer.id,
        source: scanResult.type,
        notes: `Checked in from Scan Centre using ${scanResult.type} QR.`,
      })
      .select('id,business_id,customer_id,checked_in_at,source,notes')
      .single()

    if (error) {
      setMessage(error.message)
      setActionLoading('')
      return
    }

    let updatedLoyalty: Loyalty | null = scanResult.loyalty
    let loyaltyMessage = ''

    const { data: loyaltyWallet, error: loyaltyLookupError } = await supabase
      .from('customer_loyalty')
      .select('*')
      .eq('business_id', business.id)
      .eq('customer_id', scannedCustomer.id)
      .in('status', ['active', 'earned'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (loyaltyLookupError) {
      console.error('Auto loyalty lookup failed:', loyaltyLookupError)
      loyaltyMessage = ' Loyalty lookup failed.'
    }

    if (loyaltyWallet) {
      const visitsRequired = Number(loyaltyWallet.visits_required || 0)
      const currentVisits = Number(loyaltyWallet.visits_completed || 0)
      const nextVisits = currentVisits + 1

      const nextStatus =
        visitsRequired > 0 && nextVisits >= visitsRequired
          ? 'earned'
          : 'active'

      const { data: updatedLoyaltyData, error: loyaltyUpdateError } = await supabase
        .from('customer_loyalty')
        .update({
          visits_completed: nextVisits,
          status: nextStatus,
        })
        .eq('id', loyaltyWallet.id)
        .select('*')
        .single()

      if (loyaltyUpdateError) {
        console.error('Auto loyalty update failed:', loyaltyUpdateError)
        loyaltyMessage = ' Loyalty visit could not be added.'
      } else {
        updatedLoyalty = updatedLoyaltyData as Loyalty
        loyaltyMessage =
          nextStatus === 'earned'
            ? ` ${scannedCustomer.first_name || 'Customer'} has earned: ${loyaltyWallet.reward_label || 'their reward'}.`
            : ` Loyalty visit added: ${nextVisits}/${visitsRequired || '∞'}.`
      }
    } else if (!loyaltyLookupError) {
      loyaltyMessage = ' No loyalty wallet found.'
    }

    setTodayCheckins((current) => [
      {
        ...(data as CheckIn),
        customer_name: customerName(scannedCustomer),
        customer_email: scannedCustomer.email ?? null,
      },
      ...current,
    ])

    setScanResult({
      ...scanResult,
      customer: scannedCustomer,
      loyalty: updatedLoyalty,
    })

    setMessage(`${customerName(scannedCustomer)} checked in successfully.${loyaltyMessage}`)
    setActionLoading('')
  }

  async function useMembershipSession() {
    if (!scanResult?.membership) return

    const remaining = membershipSessionsRemaining(scanResult.membership)
    if (remaining <= 0) {
      setMessage('No membership sessions remaining.')
      return
    }

    if (!window.confirm('Use one membership session for this customer?')) return

    setActionLoading('membership')
    setMessage('')

    const nextUsed = Number(scanResult.membership.sessions_used || 0) + 1

    const { error } = await supabase
      .from('customer_memberships')
      .update({ sessions_used: nextUsed })
      .eq('id', scanResult.membership.id)

    if (error) {
      setMessage(error.message)
      setActionLoading('')
      return
    }

    await supabase
      .from('membership_usage')
      .insert({
        business_id: scanResult.membership.business_id,
        customer_membership_id: scanResult.membership.id,
        customer_id: scanResult.membership.customer_id,
        sessions_used: 1,
        usage_type: 'session',
        notes: 'Session used from Scan Centre',
        usage_date: new Date().toISOString().slice(0, 10),
      })

    setScanResult({
      ...scanResult,
      membership: {
        ...scanResult.membership,
        sessions_used: nextUsed,
      },
    })

    setMessage('Membership session used.')
    setActionLoading('')
  }

  async function addLoyaltyVisit() {
    if (!scanResult?.loyalty) return

    if (!window.confirm('Add one loyalty visit for this customer?')) return

    setActionLoading('loyalty')
    setMessage('')

    const visitsRequired = Number(scanResult.loyalty.visits_required || 10)
    const nextVisits = Number(scanResult.loyalty.visits_completed || 0) + 1
    const nextStatus = nextVisits >= visitsRequired ? 'earned' : 'active'

    const { error } = await supabase
      .from('customer_loyalty')
      .update({
        visits_completed: nextVisits,
        status: nextStatus,
      })
      .eq('id', scanResult.loyalty.id)

    if (error) {
      setMessage(error.message)
      setActionLoading('')
      return
    }

    setScanResult({
      ...scanResult,
      loyalty: {
        ...scanResult.loyalty,
        visits_completed: nextVisits,
        status: nextStatus,
      },
    })

    setMessage(nextStatus === 'earned' ? 'Loyalty reward earned.' : 'Loyalty visit added.')
    setActionLoading('')
  }

  async function redeemLoyaltyReward() {
    if (!scanResult?.loyalty) return

    if (!window.confirm('Redeem this loyalty reward and start a new cycle?')) return

    setActionLoading('redeem-loyalty')
    setMessage('')

    const { error } = await supabase
      .from('customer_loyalty')
      .update({
        visits_completed: 0,
        status: 'active',
      })
      .eq('id', scanResult.loyalty.id)

    if (error) {
      setMessage(error.message)
      setActionLoading('')
      return
    }

    setScanResult({
      ...scanResult,
      loyalty: {
        ...scanResult.loyalty,
        visits_completed: 0,
        status: 'active',
      },
    })

    setMessage('Loyalty reward redeemed and cycle reset.')
    setActionLoading('')
  }

  async function redeemVoucher() {
    if (!scanResult?.voucher) return

    const amountText = window.prompt(
      'How much should be redeemed from this voucher?',
      String(scanResult.voucher.remaining_amount || scanResult.voucher.amount || 0)
    )
    if (!amountText) return

    const amount = Number(amountText)
    if (!amount || amount <= 0) {
      setMessage('Enter a valid voucher amount.')
      return
    }

    const currentBalance = Number(scanResult.voucher.remaining_amount ?? scanResult.voucher.amount ?? 0)
    if (amount > currentBalance) {
      setMessage('Redeem amount is higher than voucher balance.')
      return
    }

    setActionLoading('voucher')
    setMessage('')

    const nextBalance = Math.max(0, currentBalance - amount)

    const { error } = await supabase
      .from('gift_vouchers')
      .update({
        remaining_amount: nextBalance,
        status: nextBalance <= 0 ? 'redeemed' : scanResult.voucher.status || 'active',
        redeemed_at: nextBalance <= 0 ? new Date().toISOString() : scanResult.voucher.redeemed_at || null,
      })
      .eq('id', scanResult.voucher.id)

    if (error) {
      setMessage(error.message)
      setActionLoading('')
      return
    }

    setScanResult({
      ...scanResult,
      voucher: {
        ...scanResult.voucher,
        remaining_amount: nextBalance,
        status: nextBalance <= 0 ? 'redeemed' : scanResult.voucher.status,
      },
    })

    setMessage(`Voucher redeemed: ${money(amount)}.`)
    setActionLoading('')
  }

  const activePackages = useMemo(() => {
    return (scanResult?.packages || []).filter((item) => item.status !== 'expired' && packageSessionsRemaining(item) > 0)
  }, [scanResult])

  if (loading) {
    return <div className="p-8 text-white">Loading scan centre...</div>
  }

  return (
    <div className="p-8 text-white">
      <section className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-slate-400">Customer Experience</p>
          <h1 className="text-4xl font-black">Scan Centre</h1>
          <p className="mt-3 max-w-3xl text-slate-500">
            Scan customer membership cards, loyalty cards and gift vouchers at reception.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startScanner}
            disabled={cameraStarted}
            className="rounded-2xl bg-white px-5 py-3 font-black text-slate-950 disabled:opacity-50"
          >
            {cameraStarted ? 'Camera active' : 'Start camera'}
          </button>

          <button
            type="button"
            onClick={stopScanner}
            className="rounded-2xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10"
          >
            Stop camera
          </button>

          <button
            type="button"
            onClick={() => loadTodayCheckins()}
            className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 font-black text-cyan-100 hover:bg-cyan-300/20"
          >
            Refresh check-ins
          </button>
        </div>
      </section>

      {message && (
        <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
          {message}
        </div>
      )}

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <InfoCard
          title="Today's check-ins"
          value={String(todayCheckins.length)}
          helper="Customers checked in today"
        />
        <InfoCard
          title="Latest check-in"
          value={todayCheckins[0] ? formatCheckinTime(todayCheckins[0].checked_in_at) : 'None'}
          helper={todayCheckins[0] ? checkinCustomerName(todayCheckins[0]) : 'No one checked in yet'}
        />
        <InfoCard
          title="Scan actions"
          value="Live"
          helper="Membership, loyalty, voucher and check-in actions"
        />
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-4 text-2xl font-black">Scanner</h2>

          <div id="qr-reader" className="overflow-hidden rounded-3xl bg-black" />

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="mb-3 text-sm font-black text-slate-300">Manual code entry</p>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Paste membership ID, voucher code, loyalty ID or customer ID"
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none placeholder:text-slate-600"
              />

              <button
                type="button"
                onClick={() => resolveCode(manualCode)}
                className="rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300"
              >
                Search
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-4 text-2xl font-black">Scan result</h2>

          {!scanResult && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-slate-500">
              Scan a customer QR code or enter a code manually.
            </div>
          )}

          {scanResult?.type === 'unknown' && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-200">
              <p className="font-black">No match found</p>
              <p className="mt-2 text-sm">Code: {scanResult.rawCode}</p>
            </div>
          )}

          {scanResult && scanResult.type !== 'unknown' && (
            <div className="space-y-5">
              <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                  {scanResult.type} scan
                </p>
                <h3 className="mt-3 text-3xl font-black">{customerName(scanResult.customer)}</h3>
                <p className="mt-2 text-slate-400">{scanResult.customer?.email || 'No email'} · {scanResult.customer?.phone || 'No phone'}</p>
              </div>

              {scanResult.customer && (
                <button
                  type="button"
                  onClick={checkInCustomer}
                  disabled={actionLoading === 'checkin'}
                  className="w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {actionLoading === 'checkin' ? 'Checking in...' : 'Check In + Add Loyalty Visit'}
                </button>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard
                  title="Membership"
                  value={scanResult.membership ? scanResult.membership.membership_name : 'None'}
                  helper={scanResult.membership ? `${membershipSessionsRemaining(scanResult.membership)} sessions remaining` : 'No active membership found'}
                />

                <InfoCard
                  title="Loyalty"
                  value={scanResult.loyalty ? `${loyaltyProgress(scanResult.loyalty)}%` : 'None'}
                  helper={
                    scanResult.loyalty
                      ? loyaltyRewardEarned(scanResult.loyalty)
                        ? 'Reward available'
                        : `${loyaltyVisitsRemaining(scanResult.loyalty)} visits remaining`
                      : 'No loyalty wallet found'
                  }
                />

                <InfoCard
                  title="Voucher"
                  value={scanResult.voucher ? money(scanResult.voucher.remaining_amount ?? scanResult.voucher.amount) : 'None'}
                  helper={scanResult.voucher ? scanResult.voucher.code || scanResult.voucher.id.slice(0, 8) : 'No voucher scanned'}
                />

                <InfoCard
                  title="Packages"
                  value={String(activePackages.length)}
                  helper={activePackages.length > 0 ? activePackages.map(packageName).join(', ') : 'No active package sessions'}
                />
              </div>

              {scanResult.membership && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xl font-black">{scanResult.membership.membership_name}</p>
                      <p className="mt-1 text-slate-400">
                        {membershipSessionsRemaining(scanResult.membership)} / {scanResult.membership.included_sessions || 0} sessions remaining
                      </p>
                      <p className="mt-1 text-sm text-slate-500">Renews {formatDate(scanResult.membership.current_period_end)}</p>
                    </div>

                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(scanResult.membership.status)}`}>
                      {scanResult.membership.status || 'active'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={useMembershipSession}
                    disabled={actionLoading === 'membership'}
                    className="mt-5 w-full rounded-2xl bg-white px-5 py-4 font-black text-slate-950 disabled:opacity-50"
                  >
                    {actionLoading === 'membership' ? 'Using session...' : 'Use membership session'}
                  </button>
                </div>
              )}

              {scanResult.loyalty && (
                <div className="space-y-4">
                  {loyaltyRewardEarned(scanResult.loyalty) && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                      <p className="font-black text-emerald-300">Reward Available</p>
                      <p className="mt-2 text-sm text-slate-300">
                        This customer has earned: {scanResult.loyalty.reward_label || 'their loyalty reward'}.
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xl font-black">{scanResult.loyalty.reward_label || 'Loyalty reward'}</p>
                        <p className="mt-1 text-slate-400">
                          {scanResult.loyalty.visits_completed || 0} / {scanResult.loyalty.visits_required || 0} visits
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {loyaltyRewardEarned(scanResult.loyalty)
                            ? 'Reward ready to redeem'
                            : `${loyaltyVisitsRemaining(scanResult.loyalty)} visits remaining`}
                        </p>
                      </div>

                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(scanResult.loyalty.status)}`}>
                        {loyaltyRewardEarned(scanResult.loyalty) ? 'earned' : scanResult.loyalty.status || 'active'}
                      </span>
                    </div>

                    <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-cyan-300" style={{ width: `${loyaltyProgress(scanResult.loyalty)}%` }} />
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={addLoyaltyVisit}
                        disabled={actionLoading === 'loyalty'}
                        className="rounded-2xl bg-white px-5 py-4 font-black text-slate-950 disabled:opacity-50"
                      >
                        {actionLoading === 'loyalty' ? 'Adding...' : 'Add loyalty visit'}
                      </button>

                      <button
                        type="button"
                        onClick={redeemLoyaltyReward}
                        disabled={actionLoading === 'redeem-loyalty'}
                        className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 font-black text-cyan-100 disabled:opacity-50"
                      >
                        {actionLoading === 'redeem-loyalty' ? 'Redeeming...' : 'Redeem reward'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {scanResult.voucher && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xl font-black">{scanResult.voucher.code || scanResult.voucher.id.slice(0, 8).toUpperCase()}</p>
                      <p className="mt-1 text-slate-400">
                        Balance {money(scanResult.voucher.remaining_amount ?? scanResult.voucher.amount)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">Expires {formatDate(scanResult.voucher.expiry_date)}</p>
                    </div>

                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(scanResult.voucher.status)}`}>
                      {scanResult.voucher.status || 'active'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={redeemVoucher}
                    disabled={actionLoading === 'voucher'}
                    className="mt-5 w-full rounded-2xl bg-white px-5 py-4 font-black text-slate-950 disabled:opacity-50"
                  >
                    {actionLoading === 'voucher' ? 'Redeeming...' : 'Redeem voucher amount'}
                  </button>
                </div>
              )}

              {activePackages.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="mb-4 text-xl font-black">Active packages</p>
                  <div className="space-y-3">
                    {activePackages.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950 p-4">
                        <p className="font-black">{packageName(item)}</p>
                        <p className="mt-1 text-sm text-slate-400">{packageSessionsRemaining(item)} sessions remaining</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="mb-4 text-xl font-black">Today's check-ins</p>
                <div className="space-y-3">
                  {todayCheckins.slice(0, 8).map((checkin) => (
                    <div key={checkin.id} className="rounded-2xl border border-white/10 bg-slate-950 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-black">{checkinCustomerName(checkin)}</p>
                          <p className="text-sm text-slate-500">{checkin.source || 'scan'}</p>
                        </div>
                        <p className="text-sm font-black text-cyan-200">{formatCheckinTime(checkin.checked_in_at)}</p>
                      </div>
                    </div>
                  ))}

                  {todayCheckins.length === 0 && (
                    <p className="text-sm text-slate-500">No check-ins yet today.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </section>
    </div>
  )
}


function checkinCustomerName(checkin: CheckIn) {
  return checkin.customer_name || checkin.customer_email || 'Customer'
}

function formatCheckinTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function InfoCard({
  title,
  value,
  helper,
}: {
  title: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{helper}</p>
    </div>
  )
}
