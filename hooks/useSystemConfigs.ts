'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchSystemConfigs, invalidateSystemConfigsCache } from '@/lib/utils/systemConfigs';

export function useSystemConfigs() {
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await fetchSystemConfigs(true);
    setConfigs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSystemConfigs().then(data => {
      setConfigs(data);
      setLoading(false);
    });
  }, []);

  const updateConfig = async (key: string, value: any) => {
    try {
      const res = await fetch('/api/app-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update config');
      }
      invalidateSystemConfigsCache();
      setConfigs(prev => ({ ...prev, [key]: value }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    configs,
    loading,
    refresh,
    updateConfig,
    isEnabled: (key: string) => !!configs[key],
  };
}
