import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MarketSnapshot, MarketDataTable } from '@/types/transactions';

interface UseMarketDataOptions {
  /** Table to fetch from */
  table: MarketDataTable;
  /** If true, returns only the latest entry; otherwise returns latest per ticker */
  singleEntry?: boolean;
}

interface UseMarketDataResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
  isAuthenticated: boolean;
}

/**
 * Generic hook for fetching market snapshot data from any supported table.
 * Consolidates the logic previously duplicated in useStablecoinData and usePaxgData.
 */
export function useMarketData<T = MarketSnapshot[]>(
  options: UseMarketDataOptions
): UseMarketDataResult<T> {
  const { table, singleEntry = false } = options;
  const { session, loading: authLoading } = useAuth();
  const [data, setData] = useState<T>(singleEntry ? (null as T) : ([] as T));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAuthenticated = !!session?.access_token;

  const fetchData = useCallback(async () => {
    if (authLoading) return;

    if (!session?.access_token) {
      setLoading(false);
      setError('Authentication required to view market data');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // @ts-ignore - tables exist but types may not be regenerated yet
      let query = supabase
        .from(table)
        .select('*')
        .order('as_of_date', { ascending: false })
        .order('as_of_time', { ascending: false });

      if (singleEntry) {
        query = query.limit(1);
      }

      const { data: snapshots, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (singleEntry) {
        // Return single latest entry
        const latestData = snapshots && snapshots.length > 0 
          ? (snapshots[0] as T) 
          : (null as T);
        setData(latestData);
      } else {
        // Return latest entry per ticker (for stablecoins)
        const latestByTicker = new Map<string, MarketSnapshot>();
        for (const snapshot of snapshots || []) {
          if (!latestByTicker.has(snapshot.ticker)) {
            latestByTicker.set(snapshot.ticker, snapshot as MarketSnapshot);
          }
        }
        setData(Array.from(latestByTicker.values()) as T);
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to fetch ${table} data`);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, authLoading, table, singleEntry]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastUpdated, isAuthenticated };
}

/**
 * Convenience hook for stablecoin data (returns array of latest per ticker)
 */
export function useStablecoinData() {
  return useMarketData<MarketSnapshot[]>({ 
    table: 'stablecoin_snapshots', 
    singleEntry: false 
  });
}

/**
 * Convenience hook for PAXG data (returns single latest entry)
 */
export function usePaxgData() {
  return useMarketData<MarketSnapshot | null>({ 
    table: 'paxg_snapshots', 
    singleEntry: true 
  });
}
