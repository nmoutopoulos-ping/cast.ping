import { supabase } from "@/integrations/supabase/client";
import { normalizeAddress } from "@/lib/utils";
import type {
  TransactionRow,
  Entity,
  DbTag,
  ActiveFilter,
  AddressLabelInfo,
  FilterMode,
  MethodType,
  DateRange,
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
 * Checks if cached transactions need backfill (missing core fields)
 * Only checks for truly required fields - method and block_time
 * Token fields can be legitimately empty for ETH-only transactions
 */
export function needsBackfill(transactions: DbTransaction[]): boolean {
  // If we have transactions and they have core fields, no backfill needed
  if (transactions.length === 0) return false;
  
  // Check if ANY transaction is missing core fields (method should always exist from Dune)
  return transactions.every(tx => !tx.method && !tx.block_time);
}

/**
 * Extracts all unique addresses from transaction rows
 */
export function extractAddressesFromRows(rows: TransactionRow[]): Set<string> {
  const addresses = new Set<string>();
  rows.forEach((row) => {
    if (row.from_address) addresses.add(normalizeAddress(row.from_address));
    if (row.interacted_with) addresses.add(normalizeAddress(row.interacted_with));
    if (row.token_contract) addresses.add(normalizeAddress(row.token_contract));
    if (row.token_from) addresses.add(normalizeAddress(row.token_from));
    if (row.token_to) addresses.add(normalizeAddress(row.token_to));
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
        address: normalizeAddress(e.wallet_address),
        name: e.name,
        color: e.color,
        type: "entity",
      });
    }
  });
  
  tags.forEach((t) => {
    if (t.contract_address) {
      labels.push({
        address: normalizeAddress(t.contract_address),
        name: t.name,
        color: t.color,
        type: "tag",
      });
    }
  });
  
  return labels;
}

// Re-export DateRange from types for backwards compatibility
export type { DateRange } from "@/types/transactions";



/**
 * Extracts all addresses from a single transaction row (normalized lowercase)
 */
function getRowAddresses(row: TransactionRow): Set<string> {
  const addresses = new Set<string>();
  if (row.from_address) addresses.add(normalizeAddress(row.from_address));
  if (row.interacted_with) addresses.add(normalizeAddress(row.interacted_with));
  if (row.token_contract) addresses.add(normalizeAddress(row.token_contract));
  if (row.token_from) addresses.add(normalizeAddress(row.token_from));
  if (row.token_to) addresses.add(normalizeAddress(row.token_to));
  return addresses;
}

/**
 * Checks if a method string matches a given method type
 */
function methodMatches(method: string, filterType: MethodType): boolean {
  const lowerMethod = method.toLowerCase();
  switch (filterType) {
    case "native": return lowerMethod.includes("native");
    case "transfer": return lowerMethod.includes("transfer");
    case "mint": return lowerMethod.includes("mint");
    case "burn": return lowerMethod.includes("burn");
    default: return false;
  }
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
    const rowAddresses = getRowAddresses(row);

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
 * Filters rows by method types
 */
export function filterRowsByMethod(
  rows: TransactionRow[],
  methodFilters: MethodType[]
): TransactionRow[] {
  if (methodFilters.length === 0) return rows;
  
  return rows.filter((row) => {
    const method = row.method || "";
    return methodFilters.some((filter) => methodMatches(method, filter));
  });
}

/**
 * Filters rows by date range (inclusive, end date includes full day)
 */
export function filterRowsByDateRange(
  rows: TransactionRow[],
  dateRange: DateRange
): TransactionRow[] {
  if (!dateRange.start && !dateRange.end) return rows;
  
  return rows.filter((row) => {
    if (!row.timestamp) return false;
    const rowDate = new Date(row.timestamp);
    
    if (dateRange.start && rowDate < dateRange.start) return false;
    
    if (dateRange.end) {
      const endOfDay = new Date(dateRange.end);
      endOfDay.setHours(23, 59, 59, 999);
      if (rowDate > endOfDay) return false;
    }
    
    return true;
  });
}

/**
 * Applies all filters in sequence: entity/tag filters, method filters, and date range
 */
export function applyAllFilters(
  rows: TransactionRow[],
  options: {
    activeFilters: ActiveFilter[];
    filterMode: FilterMode;
    tagFilterMode: FilterMode;
    methodFilters: MethodType[];
    dateRange: DateRange;
  }
): TransactionRow[] {
  let result = filterRowsByActiveFilters(
    rows,
    options.activeFilters,
    options.filterMode,
    options.tagFilterMode
  );
  
  result = filterRowsByMethod(result, options.methodFilters);
  result = filterRowsByDateRange(result, options.dateRange);
  
  return result;
}

/**
 * Maps a raw Dune row to TransactionRow format.
 * Handles both snake_case keys and Title Case keys (e.g., "Tx Hash", "Interacted With").
 * Dune result keys sometimes come back as Title Case with spaces, so we normalize and check multiple candidates.
 */
export function mapDuneRowToTransactionRow(row: Record<string, unknown>): TransactionRow {
  // Build a normalized key index for flexible matching
  const keyIndex = Object.keys(row).reduce<Record<string, string>>((acc, key) => {
    const normalized = key.toLowerCase().replace(/[\s_]+/g, " ").trim();
    acc[normalized] = key;
    return acc;
  }, {});

  const pick = (candidates: string[]): unknown => {
    for (const candidate of candidates) {
      const direct = row[candidate];
      if (direct !== undefined && direct !== null && direct !== "") return direct;

      const normalized = candidate.toLowerCase().replace(/[\s_]+/g, " ").trim();
      const mappedKey = keyIndex[normalized];
      if (!mappedKey) continue;

      const mappedVal = row[mappedKey];
      if (mappedVal !== undefined && mappedVal !== null && mappedVal !== "") return mappedVal;
    }
    return undefined;
  };

  const asString = (v: unknown) => (v == null ? "" : String(v));
  const asNumber = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const gasPriceWeiRaw = pick(["gas_price_wei", "gas_price", "Gas Price (Wei)"]);
  const gasPriceWei = asNumber(gasPriceWeiRaw);
  const gasPriceGweiRaw = pick(["gas_price_gwei", "Gas Price (Gwei)"]);
  const gasPriceGwei = gasPriceGweiRaw != null ? asNumber(gasPriceGweiRaw) : gasPriceWei ? gasPriceWei / 1e9 : 0;

  const rawStatus = pick(["status", "Status", "success", "Success"]);
  const status =
    typeof rawStatus === "boolean"
      ? rawStatus
        ? "success"
        : "failed"
      : asString(rawStatus) || "success";

  return {
    transaction_hash: asString(pick(["tx_hash", "transaction_hash", "hash", "Tx Hash", "TX HASH"])),
    method: asString(pick(["method", "Method"])),
    block: asNumber(pick(["block_number", "block", "Block"])),
    timestamp: asString(pick(["block_time", "timestamp", "time", "Timestamp"])),
    from_address: asString(pick(["from_address", "from", "From"])),
    interacted_with: asString(pick(["to_address", "to", "interacted_with", "Interacted With", "To"])),
    eth_direction: asString(pick(["eth_direction", "direction", "ETH Dir", "Eth Dir"])),
    token_direction: asString(pick(["token_direction", "Token Dir"])),
    token_from: asString(pick(["token_from", "Token From"])),
    token_to: asString(pick(["token_to", "Token To"])),
    token_amount_raw: asString(pick(["token_amount_raw", "token_amt_raw", "Token Amt Raw", "Token Amount Raw"]) ?? ""),
    token_amount: asNumber(pick(["token_amount", "token_amount_decimal", "Token Amount"])),
    token_symbol: asString(pick(["token_symbol", "symbol", "Token"])),
    token_name: asString(pick(["token_name", "Token Name"])),
    token_contract: asString(pick(["token_contract", "contract_address", "Token Contract"])),
    value_eth: asNumber(pick(["value_eth", "value", "Value ETH"])),
    txn_fee_eth: asNumber(pick(["txn_fee_eth", "tx_fee_eth", "Tx Fee ETH", "Txn Fee ETH"])),
    gas_price_gwei: gasPriceGwei,
    gas_price_wei: gasPriceWei,
    gas_used: asNumber(pick(["gas_used", "Gas Used"])),
    status,
  };
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
    // Map raw Dune rows to our TransactionRow format
    const mappedRows = (data.result.rows as Record<string, unknown>[]).map(mapDuneRowToTransactionRow);
    return { rows: mappedRows, error: null };
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

/**
 * Extracts view state from a SavedView for loading into UI state
 */
export function extractViewState(view: {
  hidden_columns: string[];
  active_filters: ActiveFilter[];
  filter_mode: FilterMode;
  tag_filter_mode: FilterMode;
  method_filters: string[];
}) {
  return {
    hiddenColumns: new Set(view.hidden_columns),
    activeFilters: view.active_filters,
    filterMode: view.filter_mode,
    tagFilterMode: view.tag_filter_mode,
    methodFilters: (view.method_filters || []) as MethodType[],
  };
}
