'use client';
/* Traqi — platform data shared by every admin module.

   One collection read fills the whole console; modules read from here rather
   than each firing their own query. `refresh` re-reads on demand. */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { adminDb } from '@/lib/adminFirebase';
import { loadPlatform } from '@/lib/adminData';
import { BusinessSummary, PlatformMetrics, C } from '@/lib/adminTypes';

type PlatformCtx = {
  rows: BusinessSummary[];
  metrics: PlatformMetrics | null;
  unsubs: Set<string>;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  patchRow: (id: string, patch: Partial<BusinessSummary>) => void;
};

const Ctx = createContext<PlatformCtx | null>(null);
export const usePlatform = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePlatform must be used inside <PlatformProvider>');
  return c;
};

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<BusinessSummary[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [unsubs, setUnsubs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { rows: r, metrics: m } = await loadPlatform();
      setRows(r);
      setMetrics(m);
      const us = await getDocs(collection(adminDb, C.unsubs)).catch(() => null);
      setUnsubs(new Set((us?.docs || []).map(d => String((d.data() as any).email || d.id).toLowerCase())));
    } catch (e: any) {
      setError(e?.code === 'permission-denied'
        ? 'Firestore refused the read. Publish the admin security rules (see firestore.rules) and try again.'
        : 'Could not load platform data. Check your connection and try again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const patchRow = useCallback((id: string, patch: Partial<BusinessSummary>) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const value = useMemo<PlatformCtx>(
    () => ({ rows, metrics, unsubs, loading, error, refresh, patchRow }),
    [rows, metrics, unsubs, loading, error, refresh, patchRow]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
