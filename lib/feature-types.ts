export type FeatureKey = string;

export interface FeatureState {
  enabled: boolean;
  limit?: number | null;
  remaining?: number | null;
  reason?: string;
}
