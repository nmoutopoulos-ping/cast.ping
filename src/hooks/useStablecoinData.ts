import { useState, useEffect, useCallback } from 'react';
import { externalSupabase, type StablecoinSnapshot } from '@/lib/externalSupabase';

interface UseStablecoinDataResult {
  data: StablecoinSnapshot[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useStablecoinData(): UseStablecoinDataResult {
  const [data, setData] = useState<StablecoinSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get the latest snapshot for each ticker (most recent as_of_date)
      const { data: snapshots, error: fetchError } = await externalSupabase
        .from('stablecoin_market_snapshot')
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
          latestByTicker.set(snapshot.ticker, snapshot);
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastUpdated };
}
