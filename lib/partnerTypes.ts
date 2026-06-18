export type PartnerStatus = 'active' | 'suspended' | 'pending'

export type CommissionType = 'percentage' | 'fixed' | 'hybrid'

export type Partner = {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  referral_code: string
  commission_type: CommissionType | string | null
  commission_value: number | null
  fixed_bounty: number | null
  lifetime_commission: boolean | null
  status: PartnerStatus | string | null
  total_referrals: number | null
  total_active_businesses: number | null
  total_mrr: number | null
  total_commission_earned: number | null
  total_commission_paid: number | null
  created_at: string | null
  updated_at: string | null
}

export type PartnerReferral = {
  id: string
  partner_id: string
  business_id: string | null
  referral_code: string | null
  referral_source: string | null
  referral_url: string | null
  subscription_value: number | null
  monthly_recurring_revenue: number | null
  status: string | null
  signup_date: string | null
  created_at: string | null
}

export type PartnerCommission = {
  id: string
  partner_id: string
  referral_id: string | null
  business_id: string | null
  commission_type: string | null
  commission_month: string | null
  amount: number | null
  status: string | null
  notes: string | null
  created_at: string | null
}

export type PartnerPayout = {
  id: string
  partner_id: string
  payout_amount: number | null
  payout_date: string | null
  notes: string | null
  status: string | null
  created_at: string | null
}