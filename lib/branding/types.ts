export type BrandMode = 'amb' | 'co_branded' | 'white_label' | 'agency'

export type BrandConfig = {
  businessId?: string
  businessName: string
  bookingName: string
  platformName: string
  logoUrl: string | null
  faviconUrl: string | null
  primaryColour: string
  secondaryColour: string
  accentColour: string
  supportEmail: string
  supportPhone: string | null
  websiteUrl: string | null
  customDomain: string | null
  brandMode: BrandMode
  poweredBy: boolean
  whiteLabel: boolean
}