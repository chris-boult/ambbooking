import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns/promises'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const vercelToken = process.env.VERCEL_API_TOKEN || ''
const vercelProjectId = process.env.VERCEL_PROJECT_ID || ''
const vercelTeamId = process.env.VERCEL_TEAM_ID || ''

const defaultDomainTarget = process.env.VERCEL_DOMAIN_TARGET || 'cname.vercel-dns.com'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

type Business = {
  id: string
  business_name: string | null
  custom_domain: string | null
  domain_verification_token: string | null
  domain_target: string | null
}

function cleanDomain(domain: string) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
}

function isValidDomain(domain: string) {
  return /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,}$/i.test(domain)
}

function vercelUrl(path: string) {
  const query = vercelTeamId ? `?teamId=${encodeURIComponent(vercelTeamId)}` : ''
  return `https://api.vercel.com${path}${query}`
}

async function vercelFetch(path: string, options: RequestInit = {}) {
  if (!vercelToken) {
    throw new Error('Missing VERCEL_API_TOKEN environment variable.')
  }

  const response = await fetch(vercelUrl(path), {
    ...options,
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const json = await response.json().catch(() => ({}))

  return {
    ok: response.ok,
    status: response.status,
    json,
  }
}

async function getTxtRecords(hostname: string) {
  try {
    const records = await dns.resolveTxt(hostname)
    return records.map(record => record.join(''))
  } catch {
    return []
  }
}

async function getCnameRecords(domain: string) {
  try {
    return await dns.resolveCname(domain)
  } catch {
    return []
  }
}

function cnameMatches(records: string[], expectedTarget: string) {
  const cleanExpected = expectedTarget.replace(/\.$/, '').toLowerCase()

  return records.some(record => {
    const cleanRecord = record.replace(/\.$/, '').toLowerCase()
    return cleanRecord === cleanExpected || cleanRecord.endsWith(`.${cleanExpected}`)
  })
}

async function logDomainCheck({
  businessId,
  domainStatus,
  sslStatus,
  notes,
  expectedToken,
  foundToken,
  errorMessage,
}: {
  businessId: string
  domainStatus: string
  sslStatus: string
  notes: string
  expectedToken?: string | null
  foundToken?: string | null
  errorMessage?: string | null
}) {
  await supabaseAdmin.from('domain_checks').insert({
    business_id: businessId,
    domain_status: domainStatus,
    ssl_status: sslStatus,
    notes,
    expected_token: expectedToken || null,
    found_token: foundToken || null,
    error_message: errorMessage || null,
  })
}

async function updateBusinessDomain(
  businessId: string,
  patch: Record<string, any>,
) {
  const { error } = await supabaseAdmin
    .from('businesses')
    .update({
      ...patch,
      domain_last_checked_at: new Date().toISOString(),
    })
    .eq('id', businessId)

  if (error) {
    throw new Error(error.message)
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

    if (!vercelProjectId) {
      return NextResponse.json(
        { error: 'Missing VERCEL_PROJECT_ID environment variable.' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => null)
    const businessId = body?.businessId

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId.' }, { status: 400 })
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id,business_name,custom_domain,domain_verification_token,domain_target')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: businessError?.message || 'Business not found.' },
        { status: 404 }
      )
    }

    const typedBusiness = business as Business
    const domain = cleanDomain(typedBusiness.custom_domain || '')
    const expectedToken = typedBusiness.domain_verification_token || ''
    const expectedTarget = typedBusiness.domain_target || defaultDomainTarget

    if (!domain) {
      await updateBusinessDomain(businessId, {
        domain_status: 'not_connected',
        ssl_status: 'not_checked',
        domain_error: 'No custom domain has been set.',
      })

      await logDomainCheck({
        businessId,
        domainStatus: 'not_connected',
        sslStatus: 'not_checked',
        notes: 'Verification failed because no custom domain was set.',
        expectedToken,
        errorMessage: 'No custom domain has been set.',
      })

      return NextResponse.json(
        { error: 'No custom domain has been set.' },
        { status: 400 }
      )
    }

    if (!isValidDomain(domain)) {
      await updateBusinessDomain(businessId, {
        domain_status: 'failed',
        ssl_status: 'not_checked',
        domain_error: 'Invalid domain format.',
      })

      await logDomainCheck({
        businessId,
        domainStatus: 'failed',
        sslStatus: 'not_checked',
        notes: 'Verification failed because the domain format was invalid.',
        expectedToken,
        errorMessage: 'Invalid domain format.',
      })

      return NextResponse.json(
        { error: 'Invalid domain format.' },
        { status: 400 }
      )
    }

    if (!expectedToken) {
      await updateBusinessDomain(businessId, {
        domain_status: 'pending_verification',
        ssl_status: 'not_checked',
        domain_error: 'No verification token has been generated yet.',
      })

      await logDomainCheck({
        businessId,
        domainStatus: 'pending_verification',
        sslStatus: 'not_checked',
        notes: 'Verification stopped because no token exists.',
        errorMessage: 'No verification token has been generated yet.',
      })

      return NextResponse.json(
        { error: 'No verification token has been generated yet.' },
        { status: 400 }
      )
    }

    const txtHost = `_ambbooking.${domain}`
    const txtRecords = await getTxtRecords(txtHost)
    const foundToken = txtRecords.find(record => record === expectedToken) || txtRecords[0] || null

    if (!txtRecords.includes(expectedToken)) {
      await updateBusinessDomain(businessId, {
        domain_status: 'pending_verification',
        ssl_status: 'not_checked',
        domain_error: `TXT record not found at ${txtHost}.`,
        domain_target: expectedTarget,
      })

      await logDomainCheck({
        businessId,
        domainStatus: 'pending_verification',
        sslStatus: 'not_checked',
        notes: 'TXT verification token was not found.',
        expectedToken,
        foundToken,
        errorMessage: `TXT record not found at ${txtHost}.`,
      })

      return NextResponse.json(
        {
          error: `TXT record not found at ${txtHost}.`,
          expectedToken,
          foundToken,
          txtHost,
        },
        { status: 400 }
      )
    }

    const cnameRecords = await getCnameRecords(domain)
    const cnameOk = cnameMatches(cnameRecords, expectedTarget)

    if (!cnameOk) {
      await updateBusinessDomain(businessId, {
        domain_status: 'pending_verification',
        ssl_status: 'not_checked',
        domain_error: `CNAME does not point to ${expectedTarget}.`,
        domain_target: expectedTarget,
      })

      await logDomainCheck({
        businessId,
        domainStatus: 'pending_verification',
        sslStatus: 'not_checked',
        notes: 'TXT token matched, but CNAME target was incorrect.',
        expectedToken,
        foundToken,
        errorMessage: `Expected CNAME target ${expectedTarget}. Found: ${cnameRecords.join(', ') || 'none'}.`,
      })

      return NextResponse.json(
        {
          error: `CNAME does not point to ${expectedTarget}.`,
          expectedTarget,
          foundCnames: cnameRecords,
        },
        { status: 400 }
      )
    }

    const addDomain = await vercelFetch(`/v10/projects/${encodeURIComponent(vercelProjectId)}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    })

    const alreadyExists =
      addDomain.status === 400 &&
      String(addDomain.json?.error?.message || addDomain.json?.message || '')
        .toLowerCase()
        .includes('already')

    if (!addDomain.ok && !alreadyExists) {
      const vercelError = addDomain.json?.error?.message || addDomain.json?.message || 'Vercel rejected the domain.'

      await updateBusinessDomain(businessId, {
        domain_status: 'failed',
        ssl_status: 'not_checked',
        domain_error: vercelError,
        domain_target: expectedTarget,
      })

      await logDomainCheck({
        businessId,
        domainStatus: 'failed',
        sslStatus: 'not_checked',
        notes: 'DNS passed but Vercel rejected the domain.',
        expectedToken,
        foundToken,
        errorMessage: vercelError,
      })

      return NextResponse.json(
        { error: vercelError, vercelResponse: addDomain.json },
        { status: 400 }
      )
    }

    const verifyDomain = await vercelFetch(
      `/v9/projects/${encodeURIComponent(vercelProjectId)}/domains/${encodeURIComponent(domain)}/verify`,
      { method: 'POST' }
    )

    const vercelVerified =
      verifyDomain.ok &&
      (
        verifyDomain.json?.verified === true ||
        verifyDomain.json?.verification === undefined ||
        verifyDomain.json?.configuredBy
      )

    const domainStatus = vercelVerified ? 'connected' : 'pending_verification'
    const sslStatus = vercelVerified ? 'ssl_provisioning' : 'not_checked'

    await updateBusinessDomain(businessId, {
      custom_domain: domain,
      domain_status: domainStatus,
      ssl_status: sslStatus,
      domain_verified_at: vercelVerified ? new Date().toISOString() : null,
      domain_error: vercelVerified ? null : 'Vercel verification is still pending.',
      ssl_error: null,
      domain_target: expectedTarget,
    })

    await logDomainCheck({
      businessId,
      domainStatus,
      sslStatus,
      notes: vercelVerified
        ? 'TXT and CNAME verified. Domain added to Vercel. SSL provisioning started.'
        : 'TXT and CNAME verified locally, but Vercel verification is still pending.',
      expectedToken,
      foundToken,
      errorMessage: vercelVerified ? null : 'Vercel verification is still pending.',
    })

    await supabaseAdmin.from('audit_logs').insert({
      actor_email: 'system',
      action: vercelVerified ? 'domain_verified' : 'domain_verification_pending',
      entity_type: 'business',
      entity_id: businessId,
      metadata: {
        domain,
        expectedTarget,
        txtHost,
        expectedToken,
        foundToken,
        cnameRecords,
        vercelVerified,
      },
    })

    return NextResponse.json({
      message: vercelVerified
        ? 'Domain verified and added to Vercel. SSL provisioning has started.'
        : 'DNS checks passed, but Vercel verification is still pending. Try again shortly.',
      domain,
      domainStatus,
      sslStatus,
      expectedTarget,
      txtHost,
      foundToken,
      cnameRecords,
      vercel: {
        added: addDomain.ok || alreadyExists,
        alreadyExists,
        verified: vercelVerified,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Domain verification failed.' },
      { status: 500 }
    )
  }
}
