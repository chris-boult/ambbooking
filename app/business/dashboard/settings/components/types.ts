export type SettingsTab = 'business' | 'branding' | 'billing' | 'team' | 'features' | 'notifications' | 'advanced'

export type Business = {
  id: string
  business_name: string
  slug: string | null
  logo_url: string | null
  hero_image_url: string | null
  primary_colour: string | null
  secondary_colour: string | null
  business_description: string | null
  brand_theme: string | null
  plan?: string | null
  subscription_status?: string | null
  monthly_amount?: number | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stripe_connect_account_id?: string | null
  stripe_connect_status?: string | null
  stripe_connect_charges_enabled?: boolean | null
  stripe_connect_payouts_enabled?: boolean | null
  stripe_connect_onboarding_complete?: boolean | null
  email?: string | null
  phone?: string | null
  website?: string | null
  timezone?: string | null
  company_number?: string | null
  vat_number?: string | null
  address_line_1?: string | null
  address_line_2?: string | null
  city?: string | null
  postcode?: string | null
  country?: string | null
  booking_seo_title?: string | null
  booking_seo_description?: string | null
  booking_social_image_url?: string | null
  archived_at?: string | null
  archive_reason?: string | null
  public_booking_disabled?: boolean | null
  custom_domain?: string | null
}

export type TeamMember = { id: string; full_name: string }

export type StaffUser = {
  id: string
  email: string
  role: string
  team_member_id: string
  team_members: { full_name: string } | null
}

export type NotificationSettings = {
  booking_confirmations: boolean
  cancellation_emails: boolean
  reminder_24h: boolean
  reminder_2h: boolean
  review_requests: boolean
  new_booking_alerts: boolean
  push_notifications: boolean
  sms_notifications: boolean
}

export type UsageStats = {
  services: number
  teamMembers: number
  customers: number
  bookings: number
}
