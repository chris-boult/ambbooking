export async function hasFeature(
  supabase: any,
  businessId: string,
  feature: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('business_has_feature', {
    p_business_id: businessId,
    p_feature_key: feature,
  })

  if (error) throw error
  return !!data
}