import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

type Business = {
  id: string
  business_name: string | null
  logo_url: string | null
  primary_colour: string | null
  secondary_colour: string | null
  custom_booking_headline: string | null
  custom_booking_intro: string | null
  custom_domain: string | null
  domain_status: string | null
  ssl_status: string | null
}

type EmailBranding = {
  business_id: string
  sender_name: string | null
  sender_email: string | null
  reply_to_email: string | null
  footer_text: string | null
  header_logo_url: string | null
  primary_colour: string | null
  secondary_colour: string | null
}

function scoreBranding(business: Business) {
  let score = 0

  if (business.logo_url) score += 20
  if (business.primary_colour) score += 20
  if (business.secondary_colour) score += 20
  if (business.custom_booking_headline) score += 20
  if (business.custom_booking_intro) score += 20

  return score
}

function scoreDomain(business: Business) {
  let score = 0

  if (business.custom_domain) score += 40
  if (business.domain_status === 'connected') score += 60

  return score
}

function scoreSsl(business: Business) {
  if (business.ssl_status === 'active') return 100
  if (business.ssl_status === 'ssl_provisioning') return 60
  if (business.ssl_status === 'expiring_soon') return 50
  return 0
}

function scoreEmail(emailBranding?: EmailBranding | null) {
  if (!emailBranding) return 0

  let score = 0

  if (emailBranding.sender_name) score += 20
  if (emailBranding.sender_email) score += 20
  if (emailBranding.reply_to_email) score += 20
  if (emailBranding.footer_text) score += 20
  if (emailBranding.header_logo_url || emailBranding.primary_colour || emailBranding.secondary_colour) score += 20

  return score
}

function statusFromScore(score: number) {
  if (score >= 90) return 'ready_for_launch'
  if (score >= 70) return 'nearly_ready'
  if (score >= 40) return 'in_progress'
  return 'not_ready'
}

async function countRows(table: string, businessId: string) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)

  if (error) {
    console.error(`Count failed for ${table}:`, error.message)
    return 0
  }

  return count || 0
}

async function calculateBusinessReadiness(business: Business) {
  const [
    emailBrandingRes,
    servicesCount,
    teamCount,
    availabilityCount,
  ] = await Promise.all([
    supabaseAdmin
      .from('email_branding')
      .select('*')
      .eq('business_id', business.id)
      .maybeSingle(),

    countRows('services', business.id),
    countRows('team_members', business.id),
    countRows('availability', business.id),
  ])

  const emailBranding = emailBrandingRes.data as EmailBranding | null

  const brandingScore = scoreBranding(business)
  const domainScore = scoreDomain(business)
  const sslScore = scoreSsl(business)
  const emailScore = scoreEmail(emailBranding)
  const servicesScore = servicesCount > 0 ? 100 : 0
  const teamScore = teamCount > 0 ? 100 : 0
  const availabilityScore = availabilityCount > 0 ? 100 : 0

  const overallScore = Math.round(
    (
      brandingScore +
      domainScore +
      sslScore +
      emailScore +
      servicesScore +
      teamScore +
      availabilityScore
    ) / 7
  )

  const readinessStatus = statusFromScore(overallScore)

  const payload = {
    business_id: business.id,
    branding_score: brandingScore,
    domain_score: domainScore,
    ssl_score: sslScore,
    email_score: emailScore,
    services_score: servicesScore,
    availability_score: availabilityScore,
    team_score: teamScore,
    overall_score: overallScore,
    readiness_status: readinessStatus,
    last_calculated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from('launch_readiness_checks')
    .upsert(payload, { onConflict: 'business_id' })

  if (error) {
    throw new Error(error.message)
  }

  await supabaseAdmin
    .from('businesses')
    .update({
      launch_readiness_score: overallScore,
      launch_readiness_status: readinessStatus,
    })
    .eq('id', business.id)

  return {
    businessId: business.id,
    businessName: business.business_name,
    ...payload,
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
    const recalculateAll = Boolean(body?.recalculateAll)

    if (recalculateAll) {
      const { data: businesses, error } = await supabaseAdmin
        .from('businesses')
        .select(`
          id,
          business_name,
          logo_url,
          primary_colour,
          secondary_colour,
          custom_booking_headline,
          custom_booking_intro,
          custom_domain,
          domain_status,
          ssl_status
        `)
        .order('business_name', { ascending: true })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const results = []

      for (const business of (businesses || []) as Business[]) {
        results.push(await calculateBusinessReadiness(business))
      }

      return NextResponse.json({
        success: true,
        message: `Recalculated launch readiness for ${results.length} businesses.`,
        results,
      })
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId.' }, { status: 400 })
    }

    const { data: business, error } = await supabaseAdmin
      .from('businesses')
      .select(`
        id,
        business_name,
        logo_url,
        primary_colour,
        secondary_colour,
        custom_booking_headline,
        custom_booking_intro,
        custom_domain,
        domain_status,
        ssl_status
      `)
      .eq('id', businessId)
      .single()

    if (error || !business) {
      return NextResponse.json(
        { error: error?.message || 'Business not found.' },
        { status: 404 }
      )
    }

    const result = await calculateBusinessReadiness(business as Business)

    return NextResponse.json({
      success: true,
      message: 'Launch readiness recalculated.',
      result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Launch readiness recalculation failed.'

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
