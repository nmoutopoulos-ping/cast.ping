import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface StablecoinSnapshot {
  captured_at: string;
  as_of_date: string;
  as_of_time: string;
  coingecko_id: string;
  ticker: string;
  price_usd: number;
  market_cap_usd: number | null;
  inserted_at: string;
}

interface UseStablecoinDataResult {
  data: StablecoinSnapshot[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
  isAuthenticated: boolean;
}

export function useStablecoinData(): UseStablecoinDataResult {
  const { session, loading: authLoading } = useAuth();
  const [data, setData] = useState<StablecoinSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAuthenticated = !!session?.access_token;

  const fetchData = useCallback(async () => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Require authentication
    if (!session?.access_token) {
      setLoading(false);
      setError('Authentication required to view market data');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query from app's own database (stablecoin_snapshots table)
      const { data: snapshots, error: fetchError } = await supabase
        .from('stablecoin_snapshots')
        .select('*')
        .order('as_of_date', { ascending: false })
        .order('as_of_time', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Get only the latest entry for each ticker
      const latestByTicker = new Map<string, StablecoinSnapshot>();
      for (const snapshot of snapshots || []) {
        if (!latestByTicker.has(snapshot.ticker)) {
          latestByTicker.set(snapshot.ticker, snapshot as StablecoinSnapshot);
        }
      }

      const latestData = Array.from(latestByTicker.values());
      setData(latestData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stablecoin data');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, authLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastUpdated, isAuthenticated };
}
