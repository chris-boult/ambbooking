import { useEffect, useState } from 'react';

export function useFeature(check: () => Promise<boolean>) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    check().then(v => {
      setEnabled(v);
      setLoading(false);
    });
  }, [check]);

  return { enabled, loading };
}
