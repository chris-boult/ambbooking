import { SupabaseClient } from '@supabase/supabase-js'

export async function getLoyaltyAccount(
  supabase: SupabaseClient,
  customerId: string
) {
  const { data, error } = await supabase
    .from('customer_loyalty_accounts')
    .select('*')
    .eq('customer_id', customerId)
    .single()

  if (error) throw error

  return data
}

export async function awardPoints(
  supabase: SupabaseClient,
  customerId: string,
  businessId: string,
  points: number,
  notes?: string,
  bookingId?: string
) {
  const account = await getLoyaltyAccount(supabase, customerId)

  await supabase
    .from('customer_loyalty_accounts')
    .update({
      current_points: account.current_points + points,
      lifetime_earned: account.lifetime_earned + points,
    })
    .eq('customer_id', customerId)

  await supabase.from('loyalty_transactions').insert({
    business_id: businessId,
    customer_id: customerId,
    booking_id: bookingId ?? null,
    transaction_type: 'award',
    points,
    notes: notes ?? null,
  })
}

export async function redeemPoints(
  supabase: SupabaseClient,
  customerId: string,
  businessId: string,
  rewardId: string,
  points: number
) {
  const account = await getLoyaltyAccount(supabase, customerId)

  if (account.current_points < points) {
    throw new Error('Not enough loyalty points.')
  }

  await supabase
    .from('customer_loyalty_accounts')
    .update({
      current_points: account.current_points - points,
      lifetime_redeemed: account.lifetime_redeemed + points,
    })
    .eq('customer_id', customerId)

  await supabase.from('loyalty_transactions').insert({
    business_id: businessId,
    customer_id: customerId,
    reward_id: rewardId,
    transaction_type: 'redeem',
    points: -points,
  })

  await supabase.from('customer_reward_redemptions').insert({
    business_id: businessId,
    customer_id: customerId,
    reward_id: rewardId,
    points_used: points,
  })
}

export async function reversePoints(
  supabase: SupabaseClient,
  customerId: string,
  businessId: string,
  points: number,
  bookingId?: string
) {
  const account = await getLoyaltyAccount(supabase, customerId)

  await supabase
    .from('customer_loyalty_accounts')
    .update({
      current_points: Math.max(0, account.current_points - points),
    })
    .eq('customer_id', customerId)

  await supabase.from('loyalty_transactions').insert({
    business_id: businessId,
    customer_id: customerId,
    booking_id: bookingId ?? null,
    transaction_type: 'reverse',
    points: -points,
  })
}

export async function getBalance(
  supabase: SupabaseClient,
  customerId: string
) {
  return getLoyaltyAccount(supabase, customerId)
}