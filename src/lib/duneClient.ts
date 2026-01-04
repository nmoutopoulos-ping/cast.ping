import { supabase } from "@/integrations/supabase/client";
import type { Transaction, TokenTransfer, Direction } from "@/types/wallet";

// Default Dune query IDs - these can be customized in saved queries
export const DEFAULT_QUERIES = {
  TRANSACTIONS: "6459204", // Sepolia transactions query
  TOKEN_TRANSFERS: "6459204", // Using same query for now
};

export interface DuneQueryResult {
  success: boolean;
  execution_id?: string;
  result?: {
    rows: Record<string, unknown>[];
    metadata: {
      column_names: string[];
      column_types: string[];
      row_count: number;
    };
  };
  error?: string;
}

export interface WalletStats {
  totalTxCount: number;
  firstSeen: Date | null;
  lastSeen: Date | null;
  totalInValue: number;
  totalOutValue: number;
}

export async function executeQuery(
  queryId: string,
  parameters: Record<string, unknown> = {}
): Promise<DuneQueryResult> {
  const { data, error } = await supabase.functions.invoke('dune-query', {
    body: { queryId, parameters },
  });

  if (error) {
    console.error('Dune query error:', error);
    return { success: false, error: error.message };
  }

  return data as DuneQueryResult;
}

export async function fetchWalletTransactions(
  address: string,
  queryId: string = DEFAULT_QUERIES.TRANSACTIONS
): Promise<{ transactions: Transaction[]; stats: WalletStats; raw: Record<string, unknown>[] }> {
  const result = await executeQuery(queryId, { address: address.toLowerCase() });

  if (!result.success || !result.result?.rows) {
    console.error('Failed to fetch transactions:', result.error);
    return {
      transactions: [],
      stats: {
        totalTxCount: 0,
        firstSeen: null,
        lastSeen: null,
        totalInValue: 0,
        totalOutValue: 0,
      },
      raw: [],
    };
  }

  const rows = result.result.rows;
  const addressLower = address.toLowerCase();

  // Transform Dune rows to our Transaction type
  const transactions: Transaction[] = rows.map((row: Record<string, unknown>) => {
    const from = String(row.from || row.from_address || '').toLowerCase();
    const to = String(row.to || row.to_address || '').toLowerCase();
    
    let direction: Direction = 'SELF';
    if (from === addressLower && to !== addressLower) {
      direction = 'OUT';
    } else if (to === addressLower && from !== addressLower) {
      direction = 'IN';
    }

    // Parse value - Dune typically returns in wei, convert to ETH
    let value = 0;
    const rawValue = row.value || row.eth_value;
    if (rawValue !== undefined && rawValue !== null) {
      try {
        const valueWei = BigInt(String(rawValue));
        value = Number(valueWei) / 1e18;
      } catch {
        value = Number(rawValue) || 0;
      }
    }
    // Parse fee
    const gasUsed = Number(row.gas_used || row.gas || 0);
    const gasPrice = Number(row.gas_price || 0);
    const fee = (gasUsed * gasPrice) / 1e18;
    const timestampValue = row.block_time || row.timestamp || row.time;
    const timestamp = timestampValue ? new Date(String(timestampValue)) : new Date();
    
    return {
      hash: String(row.hash || row.tx_hash || row.transaction_hash || ''),
      block: Number(row.block_number || row.block || 0),
      timestamp,
      direction,
      from: String(row.from || row.from_address || ''),
      to: String(row.to || row.to_address || ''),
      value,
      fee,
    };
  });

  // Calculate stats
  const inTransactions = transactions.filter(tx => tx.direction === 'IN');
  const outTransactions = transactions.filter(tx => tx.direction === 'OUT');

  const stats: WalletStats = {
    totalTxCount: transactions.length,
    firstSeen: transactions.length > 0 
      ? new Date(Math.min(...transactions.map(tx => tx.timestamp.getTime())))
      : null,
    lastSeen: transactions.length > 0 
      ? new Date(Math.max(...transactions.map(tx => tx.timestamp.getTime())))
      : null,
    totalInValue: inTransactions.reduce((sum, tx) => sum + tx.value, 0),
    totalOutValue: outTransactions.reduce((sum, tx) => sum + tx.value, 0),
  };

  return { transactions, stats, raw: rows };
}

export async function fetchTokenTransfers(
  address: string,
  queryId: string = DEFAULT_QUERIES.TOKEN_TRANSFERS
): Promise<{ transfers: TokenTransfer[]; raw: Record<string, unknown>[] }> {
  const result = await executeQuery(queryId, { address: address.toLowerCase() });

  if (!result.success || !result.result?.rows) {
    console.error('Failed to fetch token transfers:', result.error);
    return { transfers: [], raw: [] };
  }

  const rows = result.result.rows;
  const addressLower = address.toLowerCase();

  const transfers: TokenTransfer[] = rows.map((row: Record<string, unknown>) => {
    const from = String(row.from || row.from_address || '').toLowerCase();
    const to = String(row.to || row.to_address || '').toLowerCase();
    
    let direction: Direction = 'SELF';
    if (from === addressLower && to !== addressLower) {
      direction = 'OUT';
    } else if (to === addressLower && from !== addressLower) {
      direction = 'IN';
    }

    // Parse amount based on token decimals
    const decimals = Number(row.decimals || 18);
    let amount = 0;
    const rawAmountValue = row.value || row.amount;
    if (rawAmountValue !== undefined && rawAmountValue !== null) {
      try {
        const rawAmount = BigInt(String(rawAmountValue));
        amount = Number(rawAmount) / Math.pow(10, decimals);
      } catch {
        amount = Number(rawAmountValue) || 0;
      }
    }

    const timestampValue = row.block_time || row.timestamp || row.time;
    const timestamp = timestampValue ? new Date(String(timestampValue)) : new Date();

    return {
      hash: String(row.tx_hash || row.hash || row.transaction_hash || ''),
      block: Number(row.block_number || row.block || 0),
      timestamp,
      direction,
      tokenSymbol: String(row.symbol || row.token_symbol || 'UNKNOWN'),
      from: String(row.from || row.from_address || ''),
      to: String(row.to || row.to_address || ''),
      amount,
    };
  });

  return { transfers, raw: rows };
}

export async function testDuneConnection(): Promise<{ success: boolean; error?: string }> {
  // Test with a simple query that should return quickly
  const result = await executeQuery('4993802', { address: '0x0000000000000000000000000000000000000000' });
  
  if (result.error?.includes('API key not configured')) {
    return { success: false, error: 'API key not configured' };
  }
  
  // Even if no results, connection is successful if no error
  return { success: !result.error, error: result.error };
}
