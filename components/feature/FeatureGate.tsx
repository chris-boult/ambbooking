import { ReactNode } from 'react';

export default function FeatureGate({
  enabled,
  children,
  fallback,
}:{
  enabled:boolean;
  children:ReactNode;
  fallback?:ReactNode;
}){
  return enabled ? <>{children}</> : <>{fallback ?? null}</>;
}
