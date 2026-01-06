// Shared transaction types used across the application

/**
 * Row structure returned from Dune queries and displayed in tables
 */
export interface TransactionRow {
  transaction_hash: string;
  method: string;
  block: number;
  timestamp: string;
  from_address: string;
  interacted_with: string;
  eth_direction: string;
  token_direction: string;
  token_from: string;
  token_to: string;
  token_amount_raw: string;
  token_amount: number;
  token_symbol: string;
  token_name: string;
  token_contract: string;
  value_eth: number;
  txn_fee_eth: number;
  gas_price_gwei: number;
  gas_price_wei: number;
  gas_used: number;
  status: string;
}

/**
 * Entity from database with wallet address
 */
export interface Entity {
  id: string;
  name: string;
  wallet_address: string | null;
  color: string;
  notes?: string | null;
}

/**
 * Tag from database with contract address
 */
export interface DbTag {
  id: string;
  name: string;
  color: string;
  contract_address: string | null;
  decimals: number | null;
  token_symbol: string | null;
  token_name: string | null;
}

/**
 * Active filter applied to transaction views
 */
export interface ActiveFilter {
  type: "entity" | "tag";
  id: string;
  address: string;
  color: string;
}

/**
 * Filter mode for combining active filters
 */
export type FilterMode = "any" | "all";

/**
 * Entity/Tag info for address labeling
 */
export interface AddressLabelInfo {
  address: string;
  name: string;
  color: string;
  type: "entity" | "tag";
}

/**
 * Saved query metadata
 */
export interface SavedQueryInfo {
  id: string;
  name: string;
  description: string | null;
  dune_query_id: string;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Saved view configuration
 */
export interface SavedView {
  id: string;
  name: string;
  hidden_columns: string[];
  active_filters: ActiveFilter[];
  filter_mode: FilterMode;
  tag_filter_mode: FilterMode;
  method_filters: string[];
  date_range?: DateRange;
}

/**
 * Date range for filtering transactions
 */
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/**
 * API status for tracking Dune query progress
 */
export type ApiStatus = "idle" | "connecting" | "fetching" | "processing" | "complete" | "error";

export interface ApiStatusInfo {
  status: ApiStatus;
  message: string;
  startTime?: number;
}

/**
 * Known method types for quick filter tabs
 */
export type MethodType = "native" | "transfer" | "mint" | "burn";

/**
 * Supported chains with their Dune query configurations
 */
export interface ChainConfig {
  id: string;
  name: string;
  queryId: string;
  explorerBaseUrl: string;
  isTestnet: boolean;
}

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  sepolia: {
    id: "sepolia",
    name: "Sepolia",
    queryId: "6459204",
    explorerBaseUrl: "https://sepolia.etherscan.io",
    isTestnet: true,
  },
  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    queryId: "6470740",
    explorerBaseUrl: "https://etherscan.io",
    isTestnet: false,
  },
};

// Map query IDs to chains for automatic detection
export const QUERY_ID_TO_CHAIN: Record<string, string> = {
  "6459204": "sepolia",
  "6470740": "ethereum",
  "6470837": "ethereum", // PAXG Token dataset
};

// Helper to get explorer URL from chain or query ID
export function getExplorerBaseUrl(chainId?: string, queryId?: string): string {
  if (chainId && CHAIN_CONFIGS[chainId]) {
    return CHAIN_CONFIGS[chainId].explorerBaseUrl;
  }
  if (queryId && QUERY_ID_TO_CHAIN[queryId]) {
    const chain = QUERY_ID_TO_CHAIN[queryId];
    return CHAIN_CONFIGS[chain].explorerBaseUrl;
  }
  return CHAIN_CONFIGS.sepolia.explorerBaseUrl; // fallback
}

// Constants
export const DEFAULT_CHAIN = "sepolia";
export const DEFAULT_QUERY_ID = CHAIN_CONFIGS.sepolia.queryId;
export const ETHERSCAN_BASE = CHAIN_CONFIGS.sepolia.explorerBaseUrl;
export const PAGE_SIZE_OPTIONS = [25, 50] as const;
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Color presets for entities and tags (30 colors across RGBV gradient)
 */
export const COLOR_PRESETS = [
  // Reds
  "#DC2626", "#EF4444", "#F87171",
  // Oranges
  "#EA580C", "#F97316", "#FB923C",
  // Yellows
  "#CA8A04", "#EAB308", "#FACC15",
  // Yellow-Greens
  "#65A30D", "#84CC16", "#A3E635",
  // Greens
  "#16A34A", "#22C55E", "#4ADE80",
  // Teals
  "#0D9488", "#14B8A6", "#2DD4BF",
  // Cyans
  "#0891B2", "#06B6D4", "#22D3EE",
  // Blues
  "#2563EB", "#3B82F6", "#60A5FA",
  // Purples
  "#7C3AED", "#8B5CF6", "#A78BFA",
  // Pinks/Magentas
  "#DB2777", "#EC4899", "#F472B6",
] as const;