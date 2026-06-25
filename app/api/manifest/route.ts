import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

function cleanColour(value?: string | null) {
  if (!value) return '#020617'
  return value.startsWith('#') ? value : `#${value}`
}

function iconUrl(value?: string | null) {
  if (!value) return '/favicon.ico'
  return value
}

function iconType(value: string) {
  if (value.endsWith('.png')) return 'image/png'
  if (value.endsWith('.jpg') || value.endsWith('.jpeg')) return 'image/jpeg'
  if (value.endsWith('.webp')) return 'image/webp'
  return 'image/x-icon'
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')
  const hostname = url.hostname

  let query = supabase
    .from('businesses')
    .select('business_name,slug,logo_url,primary_colour,secondary_colour,custom_domain')
    .limit(1)

  if (slug) {
    query = query.eq('slug', slug)
  } else {
    query = query.eq('custom_domain', hostname)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error('Dynamic manifest lookup failed:', error)
  }

  const businessName = data?.business_name || 'AMB Booking'
  const businessSlug = data?.slug || slug || ''
  const primaryColour = cleanColour(data?.primary_colour || data?.secondary_colour)
  const logoUrl = iconUrl(data?.logo_url)
  const startUrl = businessSlug ? `/customer-portal/${businessSlug}` : '/'

  return NextResponse.json(
    {
      name: businessName,
      short_name: businessName.length > 12 ? businessName.slice(0, 12) : businessName,
      description: `Book appointments and manage your account with ${businessName}.`,
      start_url: startUrl,
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#020617',
      theme_color: primaryColour,
      icons: [
        {
          src: logoUrl,
          sizes: '192x192',
          type: iconType(logoUrl),
          purpose: 'any',
        },
        {
          src: logoUrl,
          sizes: '512x512',
          type: iconType(logoUrl),
          purpose: 'any',
        },
        {
          src: logoUrl,
          sizes: '512x512',
          type: iconType(logoUrl),
          purpose: 'maskable',
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  )
}
