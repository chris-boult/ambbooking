import { createClient } from '@supabase/supabase-js'
import { sendBusinessPush } from '@/lib/push/sendBusinessPush'
import { DEFAULT_NOTIFICATION_LINK } from './constants'
import type { CreateNotificationInput } from './types'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables.')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

async function getBusinessOwnerUserId(businessId: string) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('user_id')
    .eq('id', businessId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  return data?.user_id || null
}

async function getNotificationPreference({
  businessId,
  userId,
  type,
}: {
  businessId: string
  userId: string
  type: string
}) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .select('*')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .eq('notification_type', type)
    .maybeSingle()

  if (error) throw new Error(error.message)

  return data
}

export async function createNotification(input: CreateNotificationInput) {
  const supabaseAdmin = getSupabaseAdmin()

  const userId = input.userId || (await getBusinessOwnerUserId(input.businessId))

  if (!userId) {
    throw new Error('No notification recipient found.')
  }

  const preference = await getNotificationPreference({
    businessId: input.businessId,
    userId,
    type: input.type,
  })

  const link = input.link || DEFAULT_NOTIFICATION_LINK

  const { data: notification, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      business_id: input.businessId,
      user_id: userId,
      type: input.type,
      priority: input.priority || 'info',
      title: input.title,
      message: input.message,
      link,
      icon: input.icon || null,
      colour: input.colour || null,
      metadata: input.metadata || {},
      is_read: false,
      is_archived: false,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const pushAllowed = input.sendPush !== false && preference?.push_enabled !== false

  if (pushAllowed) {
    try {
      await sendBusinessPush({
        businessId: input.businessId,
        title: input.title,
        body: input.message,
        url: link,
      })
    } catch (error) {
      console.error('Notification push delivery failed:', error)
    }
  }

  return notification
}
