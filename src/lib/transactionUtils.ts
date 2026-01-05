import { supabase } from "@/integrations/supabase/client";
import type { 
  TransactionRow, 
  Entity, 
  DbTag, 
  ActiveFilter, 
  AddressLabelInfo,
  FilterMode 
} from "@/types/transactions";

/**
 * Database transaction record shape (from Supabase)
 */
interface DbTransaction {
  tx_hash: string;
  method: string | null;
  block_number: number | null;
  block_time: string | null;
  from_address: string | null;
  to_address: string | null;
  direction: string | null;
  token_direction: string | null;
  token_from: string | null;
  token_to: string | null;
  token_amount_raw: string | null;
  token_amount: number | null;
  token_symbol: string | null;
  token_name: string | null;
  token_contract: string | null;
  value_eth: number | null;
  tx_fee_eth: number | null;
  gas_price: number | null;
  gas_used: number | null;
  success: boolean | null;
}

/**
 * Maps a database transaction record to the TransactionRow format used in tables
 */
export function mapDbTransactionToRow(tx: DbTransaction): TransactionRow {
  return {
    transaction_hash: tx.tx_hash,
    method: tx.method || "",
    block: Number(tx.block_number) || 0,
    timestamp: tx.block_time || "",
    from_address: tx.from_address || "",
    interacted_with: tx.to_address || "",
    eth_direction: tx.direction || "",
    token_direction: tx.token_direction || "",
    token_from: tx.token_from || "",
    token_to: tx.token_to || "",
    token_amount_raw: tx.token_amount_raw || "",
    token_amount: Number(tx.token_amount) || 0,
    token_symbol: tx.token_symbol || "",
    token_name: tx.token_name || "",
    token_contract: tx.token_contract || "",
    value_eth: Number(tx.value_eth) || 0,
    txn_fee_eth: Number(tx.tx_fee_eth) || 0,
    gas_price_gwei: Number(tx.gas_price) / 1e9 || 0,
    gas_price_wei: Number(tx.gas_price) || 0,
    gas_used: Number(tx.gas_used) || 0,
    status: tx.success ? "success" : "failed",
  };
}

/**
 * Maps a TransactionRow to database insert format
 */
export function mapRowToDbTransaction(
  row: TransactionRow,
  savedQueryId: string,
  userId: string
) {
  return {
    saved_query_id: savedQueryId,
    user_id: userId,
    tx_hash: row.transaction_hash,
    block_number: row.block,
    block_time: row.timestamp || null,
    direction: row.eth_direction,
    from_address: row.from_address,
    to_address: row.interacted_with,
    nonce: null,
    transaction_index: null,
    value_eth: row.value_eth,
    tx_fee_eth: row.txn_fee_eth,
    gas_price: row.gas_price_wei,
    gas_used: row.gas_used,
    success: row.status === "success" || row.status === "Success",
    token_contract: row.token_contract || null,
    token_symbol: row.token_symbol || null,
    token_name: row.token_name || null,
    token_amount_raw: row.token_amount_raw || null,
    token_amount: row.token_amount || null,
    method: row.method || null,
    token_direction: row.token_direction || null,
    token_from: row.token_from || null,
    token_to: row.token_to || null,
  };
}

/**
 * Checks if cached transactions need backfill (missing enrichment fields)
 */
export function needsBackfill(transactions: DbTransaction[]): boolean {
  return transactions.some(
    (tx) => !tx.method || !tx.token_direction || !tx.token_from || !tx.token_to
  );
}

/**
 * Extracts all unique addresses from transaction rows
 */
export function extractAddressesFromRows(rows: TransactionRow[]): Set<string> {
  const addresses = new Set<string>();
  rows.forEach((row) => {
    if (row.from_address) addresses.add(row.from_address.toLowerCase());
    if (row.interacted_with) addresses.add(row.interacted_with.toLowerCase());
    if (row.token_contract) addresses.add(row.token_contract.toLowerCase());
    if (row.token_from) addresses.add(row.token_from.toLowerCase());
    if (row.token_to) addresses.add(row.token_to.toLowerCase());
  });
  return addresses;
}

/**
 * Builds a highlight map from active filters (address -> color)
 */
export function buildHighlightMap(activeFilters: ActiveFilter[]): Record<string, string> {
  const map: Record<string, string> = {};
  activeFilters.forEach((filter) => {
    map[filter.address] = filter.color;
  });
  return map;
}

/**
 * Builds address labels from entities and tags
 */
export function buildAddressLabels(
  entities: Entity[],
  tags: DbTag[]
): AddressLabelInfo[] {
  const labels: AddressLabelInfo[] = [];
  
  entities.forEach((e) => {
    if (e.wallet_address) {
      labels.push({
        address: e.wallet_address.toLowerCase(),
        name: e.name,
        color: e.color,
        type: "entity",
      });
    }
  });
  
  tags.forEach((t) => {
    if (t.contract_address) {
      labels.push({
        address: t.contract_address.toLowerCase(),
        name: t.name,
        color: t.color,
        type: "tag",
      });
    }
  });
  
  return labels;
}

/**
 * Filters rows based on active filters with separate entity/tag logic.
 * - Entities are always matched with AND (all selected entities must be present)
 * - Tags use the tagFilterMode (any/all) to combine
 * - When both entities and tags are selected: entity match AND tag match
 */
export function filterRowsByActiveFilters(
  rows: TransactionRow[],
  activeFilters: ActiveFilter[],
  filterMode: FilterMode,
  tagFilterMode: FilterMode = "any"
): TransactionRow[] {
  if (activeFilters.length === 0) return rows;

  const entityFilters = activeFilters.filter((f) => f.type === "entity");
  const tagFilters = activeFilters.filter((f) => f.type === "tag");

  return rows.filter((row) => {
    const rowAddresses = new Set<string>();
    if (row.from_address) rowAddresses.add(row.from_address.toLowerCase());
    if (row.interacted_with) rowAddresses.add(row.interacted_with.toLowerCase());
    if (row.token_contract) rowAddresses.add(row.token_contract.toLowerCase());
    if (row.token_from) rowAddresses.add(row.token_from.toLowerCase());
    if (row.token_to) rowAddresses.add(row.token_to.toLowerCase());

    // Check entities: ALL selected entities must match
    const entityMatch = entityFilters.length === 0 || 
      entityFilters.every((f) => rowAddresses.has(f.address));

    // Check tags based on tagFilterMode
    let tagMatch = true;
    if (tagFilters.length > 0) {
      if (tagFilterMode === "all") {
        tagMatch = tagFilters.every((f) => rowAddresses.has(f.address));
      } else {
        tagMatch = tagFilters.some((f) => rowAddresses.has(f.address));
      }
    }

    // Both must match when both are selected
    return entityMatch && tagMatch;
  });
}

/**
 * Fetches data from Dune via edge function
 */
export async function fetchFromDune(
  queryId: string,
  address: string
): Promise<{ rows: TransactionRow[]; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("dune-query", {
    body: { queryId, parameters: { address: address.toLowerCase() } },
  });

  if (error) {
    return { rows: [], error: error.message };
  }

  if (data?.result?.rows) {
    return { rows: data.result.rows as TransactionRow[], error: null };
  }
  
  if (data?.error) {
    return { rows: [], error: data.error };
  }

  return { rows: [], error: null };
}

/**
 * Saves transactions to database with upsert
 */
export async function saveTransactionsToDb(
  rows: TransactionRow[],
  savedQueryId: string,
  userId: string
): Promise<{ count: number; error: string | null }> {
  const txRecords = rows.map((row) => mapRowToDbTransaction(row, savedQueryId, userId));

  const { error, data } = await supabase
    .from("transactions")
    .upsert(txRecords, {
      onConflict: "saved_query_id,tx_hash",
      ignoreDuplicates: false,
    })
    .select();

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: data?.length || rows.length, error: null };
}

/**
 * Fetches entities and tags for the current user
 */
export async function fetchEntitiesAndTags(): Promise<{
  entities: Entity[];
  tags: DbTag[];
}> {
  const [entitiesRes, tagsRes] = await Promise.all([
    supabase.from("entities").select("id, name, wallet_address, color"),
    supabase
      .from("tags")
      .select("id, name, color, contract_address, decimals, token_symbol, token_name"),
  ]);

  return {
    entities: (entitiesRes.data as Entity[]) || [],
    tags: (tagsRes.data as DbTag[]) || [],
  };
}

/**
 * Formats ETH value with full precision, removing trailing zeros
 */
export function formatEthValue(value: number | string | null | undefined): string {
  if (value == null || value === "") return "-";
  if (typeof value === "string") return value;
  if (!Number.isFinite(value)) return "-";
  if (value === 0) return "0";
  const fixed = value.toFixed(18);
  return fixed.replace(/\.?0+$/, "");
}
