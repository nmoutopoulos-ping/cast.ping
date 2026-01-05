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
}

// Constants
export const DEFAULT_QUERY_ID = "6459204";
export const ETHERSCAN_BASE = "https://sepolia.etherscan.io";
export const PAGE_SIZE_OPTIONS = [25, 50] as const;
export const DEFAULT_PAGE_SIZE = 25;
