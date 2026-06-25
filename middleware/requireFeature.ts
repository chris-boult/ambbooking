import { hasFeature } from '../lib/features'

export class FeatureDisabledError extends Error {
  feature: string

  constructor(feature: string) {
    super(`Feature disabled: ${feature}`)
    this.name = 'FeatureDisabledError'
    this.feature = feature
  }
}

export async function requireFeature(
  supabase: any,
  businessId: string,
  feature: string
): Promise<boolean> {
  const ok = await hasFeature(supabase, businessId, feature)

  if (!ok) {
    throw new FeatureDisabledError(feature)
  }

  return true
}