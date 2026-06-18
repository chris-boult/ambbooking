import { supabase } from '@/lib/supabase'

export type PartnerProfile = {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  referral_code: string
  commission_type: string | null
  commission_value: number | null
  fixed_bounty: number | null
  lifetime_commission: boolean | null
  status: string | null
  created_at: string | null
}

export const money = (value: number | null | undefined) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(value || 0))

export const shortDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('en-GB') : '—'

export async function getCurrentPartner() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return { partner: null, user: null, error: userError?.message || 'Not logged in' }
  }

  const { data: link, error: linkError } = await supabase
    .from('partner_users')
    .select('partner_id')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (linkError || !link?.partner_id) {
    return { partner: null, user: userData.user, error: linkError?.message || 'No partner profile found' }
  }

  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('*')
    .eq('id', link.partner_id)
    .maybeSingle()

  return { partner: partner as PartnerProfile | null, user: userData.user, error: partnerError?.message || null }
}

export async function signOutPartner() {
  await supabase.auth.signOut()
  window.location.href = '/partner/login'
}
