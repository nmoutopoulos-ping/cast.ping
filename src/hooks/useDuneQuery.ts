import { useState, useCallback } from 'react';
import { 
  fetchWalletTransactions, 
  fetchTokenTransfers, 
  WalletStats 
} from '@/lib/duneClient';
import type { Transaction, TokenTransfer } from '@/types/wallet';

interface UseDuneQueryResult {
  transactions: Transaction[];
  tokenTransfers: TokenTransfer[];
  stats: WalletStats | null;
  rawTransactions: Record<string, unknown>[];
  rawTokenTransfers: Record<string, unknown>[];
  isLoading: boolean;
  error: string | null;
  fetchData: (address: string) => Promise<void>;
}

export function useDuneQuery(): UseDuneQueryResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tokenTransfers, setTokenTransfers] = useState<TokenTransfer[]>([]);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [rawTransactions, setRawTransactions] = useState<Record<string, unknown>[]>([]);
  const [rawTokenTransfers, setRawTokenTransfers] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (address: string) => {
    if (!address) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Fetch transactions and token transfers in parallel
      const [txResult, tokenResult] = await Promise.all([
        fetchWalletTransactions(address),
        fetchTokenTransfers(address),
      ]);

      setTransactions(txResult.transactions);
      setStats(txResult.stats);
      setRawTransactions(txResult.raw);
      
      setTokenTransfers(tokenResult.transfers);
      setRawTokenTransfers(tokenResult.raw);

    } catch (err) {
      console.error('Error fetching Dune data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    transactions,
    tokenTransfers,
    stats,
    rawTransactions,
    rawTokenTransfers,
    isLoading,
    error,
    fetchData,
  };
}
