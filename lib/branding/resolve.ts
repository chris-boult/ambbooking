import type { BrandConfig, BrandMode } from './types'
import { defaultBrand } from './defaults'

type BusinessBrandRow = {
  id?: string
  business_name?: string | null
  slug?: string | null
  logo_url?: string | null
  favicon_url?: string | null
  primary_colour?: string | null
  secondary_colour?: string | null
  accent_colour?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  custom_domain?: string | null
  white_label_mode?: boolean | null
  hide_amb_branding?: boolean | null
  brand_mode?: BrandMode | null
}

export function resolveBrand(business?: BusinessBrandRow | null): BrandConfig {
  if (!business) return defaultBrand

  const whiteLabel = Boolean(
    business.white_label_mode || business.hide_amb_branding
  )

  const brandMode: BrandMode =
    business.brand_mode ||
    (whiteLabel ? 'white_label' : 'co_branded')

  const businessName = business.business_name || defaultBrand.businessName

  return {
    businessId: business.id,
    businessName,
    bookingName: whiteLabel ? `${businessName} Booking` : defaultBrand.bookingName,
    platformName: whiteLabel ? businessName : defaultBrand.platformName,
    logoUrl: business.logo_url || defaultBrand.logoUrl,
    faviconUrl: business.favicon_url || defaultBrand.faviconUrl,
    primaryColour: business.primary_colour || defaultBrand.primaryColour,
    secondaryColour: business.secondary_colour || defaultBrand.secondaryColour,
    accentColour: business.accent_colour || defaultBrand.accentColour,
    supportEmail: business.email || defaultBrand.supportEmail,
    supportPhone: business.phone || defaultBrand.supportPhone,
    websiteUrl: business.website || defaultBrand.websiteUrl,
    customDomain: business.custom_domain || defaultBrand.customDomain,
    brandMode,
    poweredBy: !whiteLabel,
    whiteLabel,
  }
}