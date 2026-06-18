import { NextRequest, NextResponse } from 'next/server'
import * as tls from 'tls'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

type Business = {
  id: string
  business_name: string | null
  custom_domain: string | null
  domain_status: string | null
  ssl_status: string | null
}

function cleanDomain(domain: string) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
}

function normaliseCertValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.join(', ')
  return value || 'Unknown'
}

function daysBetweenNow(date: Date) {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function scoreFromDays(daysRemaining: number) {
  if (daysRemaining <= 0) return 0
  if (daysRemaining <= 7) return 25
  if (daysRemaining <= 14) return 50
  if (daysRemaining <= 30) return 75
  return 100
}

function sslStatusFromDays(daysRemaining: number) {
  if (daysRemaining <= 0) return 'expired'
  if (daysRemaining <= 14) return 'expiring_soon'
  return 'active'
}

function getCertificate(domain: string): Promise<{
  validTo: string
  issuer: string
  subject: string
}> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: false,
        timeout: 10000,
      },
      () => {
        const certificate = socket.getPeerCertificate()
        socket.end()

        if (!certificate || !certificate.valid_to) {
          reject(new Error('No SSL certificate found.'))
          return
        }

        resolve({
          validTo: certificate.valid_to,
          issuer: normaliseCertValue(certificate.issuer?.O || certificate.issuer?.CN),
          subject: normaliseCertValue(certificate.subject?.CN),
        })
      }
    )

    socket.on('timeout', () => {
      socket.destroy()
      reject(new Error('SSL check timed out.'))
    })

    socket.on('error', error => {
      reject(error)
    })
  })
}

async function updateBusinessSsl(businessId: string, patch: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from('businesses')
    .update({
      ...patch,
      ssl_last_checked_at: new Date().toISOString(),
      domain_last_checked_at: new Date().toISOString(),
    })
    .eq('id', businessId)

  if (error) throw new Error(error.message)
}

async function logDomainCheck({
  businessId,
  domainStatus,
  sslStatus,
  notes,
  errorMessage,
}: {
  businessId: string
  domainStatus: string
  sslStatus: string
  notes: string
  errorMessage?: string | null
}) {
  await supabaseAdmin.from('domain_checks').insert({
    business_id: businessId,
    domain_status: domainStatus,
    ssl_status: sslStatus,
    notes,
    error_message: errorMessage || null,
  })
}

async function checkBusinessSsl(business: Business) {
  const domain = cleanDomain(business.custom_domain || '')

  if (!domain) {
    await updateBusinessSsl(business.id, {
      ssl_status: 'not_checked',
      ssl_error: 'No custom domain set.',
      ssl_expires_at: null,
      ssl_provider: null,
      ssl_days_remaining: null,
      ssl_health_score: 0,
    })

    await logDomainCheck({
      businessId: business.id,
      domainStatus: business.domain_status || 'not_connected',
      sslStatus: 'not_checked',
      notes: 'SSL check skipped because no custom domain is set.',
      errorMessage: 'No custom domain set.',
    })

    return {
      businessId: business.id,
      domain,
      ok: false,
      error: 'No custom domain set.',
    }
  }

  try {
    const certificate = await getCertificate(domain)
    const expiresAt = new Date(certificate.validTo)
    const daysRemaining = daysBetweenNow(expiresAt)
    const sslStatus = sslStatusFromDays(daysRemaining)
    const healthScore = scoreFromDays(daysRemaining)

    await updateBusinessSsl(business.id, {
      ssl_status: sslStatus,
      ssl_error: null,
      ssl_expires_at: expiresAt.toISOString(),
      ssl_provider: certificate.issuer,
      ssl_days_remaining: daysRemaining,
      ssl_health_score: healthScore,
    })

    await logDomainCheck({
      businessId: business.id,
      domainStatus: business.domain_status || 'connected',
      sslStatus,
      notes: `SSL checked successfully. Certificate issued by ${certificate.issuer}. ${daysRemaining} days remaining.`,
    })

    return {
      businessId: business.id,
      domain,
      ok: true,
      sslStatus,
      expiresAt: expiresAt.toISOString(),
      provider: certificate.issuer,
      daysRemaining,
      healthScore,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SSL check failed.'

    await updateBusinessSsl(business.id, {
      ssl_status: 'failed',
      ssl_error: message,
      ssl_expires_at: null,
      ssl_provider: null,
      ssl_days_remaining: null,
      ssl_health_score: 0,
    })

    await logDomainCheck({
      businessId: business.id,
      domainStatus: business.domain_status || 'connected',
      sslStatus: 'failed',
      notes: 'SSL check failed.',
      errorMessage: message,
    })

    return {
      businessId: business.id,
      domain,
      ok: false,
      sslStatus: 'failed',
      error: message,
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase server environment variables.' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const businessId = body?.businessId
    const checkAll = Boolean(body?.checkAll)

    if (checkAll) {
      const { data, error } = await supabaseAdmin
        .from('businesses')
        .select('id,business_name,custom_domain,domain_status,ssl_status')
        .not('custom_domain', 'is', null)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const businesses = (data || []) as Business[]
      const results = []

      for (const business of businesses) {
        results.push(await checkBusinessSsl(business))
      }

      return NextResponse.json({
        message: `Checked SSL for ${results.length} businesses.`,
        results,
      })
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId.' }, { status: 400 })
    }

    const { data: business, error } = await supabaseAdmin
      .from('businesses')
      .select('id,business_name,custom_domain,domain_status,ssl_status')
      .eq('id', businessId)
      .single()

    if (error || !business) {
      return NextResponse.json(
        { error: error?.message || 'Business not found.' },
        { status: 404 }
      )
    }

    const result = await checkBusinessSsl(business as Business)

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json({
      message: 'SSL check completed successfully.',
      ...result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SSL check failed.'

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}