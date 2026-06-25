import { hasFeature } from '../lib/features';

export async function requireFeature(supabase:any,businessId:string,feature:string){
  const ok = await hasFeature(supabase,businessId,feature);
  if(!ok){
    throw new Error('Feature disabled');
  }
}
