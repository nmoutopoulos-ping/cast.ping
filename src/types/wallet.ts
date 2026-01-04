export type WalletType = 
  | "Unknown" 
  | "EOA" 
  | "Exchange" 
  | "Smart Contract" 
  | "LP Pool" 
  | "MEV / Bot" 
  | "Bridge" 
  | "Internal / House Wallet";

export type RiskLevel = "Low" | "Medium" | "High";

export type Direction = "IN" | "OUT" | "SELF";

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface WalletProfile {
  address: string;
  chain: string;
  type: WalletType;
  riskLevel: RiskLevel;
  internalId: string;
  tags: Tag[];
  notes: string;
  entityName: string;
  clientId: string;
  totalTxCount: number;
  firstSeen: Date;
  lastSeen: Date;
  totalInValue: number;
  totalOutValue: number;
}

export interface Transaction {
  hash: string;
  block: number;
  timestamp: Date;
  direction: Direction;
  from: string;
  to: string;
  value: number;
  fee: number;
}

export interface TokenTransfer {
  hash: string;
  block: number;
  timestamp: Date;
  direction: Direction;
  tokenSymbol: string;
  from: string;
  to: string;
  amount: number;
}

export interface SavedQuery {
  id: string;
  name: string;
  description: string;
  duneQueryId: string;
  lastRun: Date | null;
  walletsUsed7d: number;
  parameterSchema: Record<string, unknown>;
}

export interface Entity {
  id: string;
  name: string;
  walletCount: number;
  tags: Tag[];
  notes: string;
  wallets: string[];
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  timestamp: Date;
}

export interface Document {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
}
