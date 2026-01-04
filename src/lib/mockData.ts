import { 
  WalletProfile, 
  Transaction, 
  TokenTransfer, 
  SavedQuery, 
  Entity, 
  Tag,
  ActivityLogEntry,
  Document
} from "@/types/wallet";

export const mockTags: Tag[] = [
  { id: "1", name: "Customer A", color: "#10B981" },
  { id: "2", name: "Ping Treasury", color: "#3B82F6" },
  { id: "3", name: "Frontrunner", color: "#F59E0B" },
  { id: "4", name: "Test Wallet", color: "#8B5CF6" },
  { id: "5", name: "Whale", color: "#EC4899" },
  { id: "6", name: "DeFi Power User", color: "#06B6D4" },
];

export const mockWalletProfile: WalletProfile = {
  address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0aB23",
  chain: "Sepolia",
  type: "EOA",
  riskLevel: "Low",
  internalId: "PING-001",
  tags: [mockTags[0], mockTags[1]],
  notes: "Primary trading wallet for Customer A. High volume during US market hours.",
  entityName: "Acme Corporation",
  clientId: "CLIENT-2024-001",
  totalTxCount: 1247,
  firstSeen: new Date("2023-06-15"),
  lastSeen: new Date("2024-01-03"),
  totalInValue: 156.78,
  totalOutValue: 142.35,
};

export const mockTransactions: Transaction[] = [
  {
    hash: "0x1234...5678",
    block: 4521890,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    direction: "IN",
    from: "0xabcd...efgh",
    to: "0x742d...0aB23",
    value: 2.5,
    fee: 0.0021,
  },
  {
    hash: "0x2345...6789",
    block: 4521885,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    direction: "OUT",
    from: "0x742d...0aB23",
    to: "0xdef0...1234",
    value: 1.2,
    fee: 0.0018,
  },
  {
    hash: "0x3456...7890",
    block: 4521850,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    direction: "SELF",
    from: "0x742d...0aB23",
    to: "0x742d...0aB23",
    value: 0,
    fee: 0.0015,
  },
  {
    hash: "0x4567...8901",
    block: 4521800,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    direction: "IN",
    from: "0x5678...9abc",
    to: "0x742d...0aB23",
    value: 5.75,
    fee: 0.0025,
  },
  {
    hash: "0x5678...9012",
    block: 4521750,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
    direction: "OUT",
    from: "0x742d...0aB23",
    to: "0x6789...bcde",
    value: 0.85,
    fee: 0.0012,
  },
];

export const mockTokenTransfers: TokenTransfer[] = [
  {
    hash: "0xaaaa...1111",
    block: 4521888,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    direction: "IN",
    tokenSymbol: "USDC",
    from: "0x1111...2222",
    to: "0x742d...0aB23",
    amount: 5000,
  },
  {
    hash: "0xbbbb...2222",
    block: 4521875,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    direction: "OUT",
    tokenSymbol: "WETH",
    from: "0x742d...0aB23",
    to: "0x3333...4444",
    amount: 1.5,
  },
  {
    hash: "0xcccc...3333",
    block: 4521820,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36),
    direction: "IN",
    tokenSymbol: "DAI",
    from: "0x5555...6666",
    to: "0x742d...0aB23",
    amount: 2500,
  },
];

export const mockSavedQueries: SavedQuery[] = [
  {
    id: "1",
    name: "Sepolia: Etherscan-style Transactions",
    description: "Standard transaction history with value and gas details",
    duneQueryId: "3847291",
    lastRun: new Date(Date.now() - 1000 * 60 * 30),
    walletsUsed7d: 45,
    parameterSchema: { address: "string" },
  },
  {
    id: "2",
    name: "ERC-20 Token Transfers",
    description: "All ERC-20 token transfer events for a wallet",
    duneQueryId: "3847292",
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 2),
    walletsUsed7d: 32,
    parameterSchema: { address: "string" },
  },
  {
    id: "3",
    name: "NFT Activity Summary",
    description: "NFT mints, transfers, and sales for a wallet",
    duneQueryId: "3847293",
    lastRun: null,
    walletsUsed7d: 12,
    parameterSchema: { address: "string" },
  },
  {
    id: "4",
    name: "DEX Swap History",
    description: "Uniswap/Sushiswap trades with pricing data",
    duneQueryId: "3847294",
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24),
    walletsUsed7d: 28,
    parameterSchema: { address: "string" },
  },
];

export const mockEntities: Entity[] = [
  {
    id: "1",
    name: "Acme Corporation",
    walletCount: 5,
    tags: [mockTags[0], mockTags[5]],
    notes: "Major institutional client. Monthly reporting required.",
    wallets: ["0x742d...0aB23", "0xabcd...efgh", "0x1234...5678", "0x9876...5432", "0xfedc...ba98"],
  },
  {
    id: "2",
    name: "Ping Internal",
    walletCount: 3,
    tags: [mockTags[1]],
    notes: "Internal treasury and operational wallets",
    wallets: ["0x1111...2222", "0x3333...4444", "0x5555...6666"],
  },
  {
    id: "3",
    name: "Suspected Bot Cluster",
    walletCount: 12,
    tags: [mockTags[2], mockTags[4]],
    notes: "Flagged for investigation. Possible frontrunning activity.",
    wallets: ["0xaaaa...bbbb"],
  },
];

export const mockActivityLog: ActivityLogEntry[] = [
  { id: "1", action: "Tag 'Customer A' added", timestamp: new Date(Date.now() - 1000 * 60 * 5) },
  { id: "2", action: "Wallet type set to 'EOA'", timestamp: new Date(Date.now() - 1000 * 60 * 30) },
  { id: "3", action: "Note updated", timestamp: new Date(Date.now() - 1000 * 60 * 60) },
  { id: "4", action: "Risk level set to 'Low'", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
];

export const mockDocuments: Document[] = [
  { id: "1", name: "KYC_Documentation.pdf", size: 2457600, uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
  { id: "2", name: "Transaction_Report_Q4.xlsx", size: 156700, uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) },
];

export const mockRecentSearches = [
  { address: "0x742d...0aB23", lastQuery: new Date(Date.now() - 1000 * 60 * 30), tagCount: 2, lastDirection: "IN" as const },
  { address: "0xabcd...efgh", lastQuery: new Date(Date.now() - 1000 * 60 * 60 * 2), tagCount: 1, lastDirection: "OUT" as const },
  { address: "0x1234...5678", lastQuery: new Date(Date.now() - 1000 * 60 * 60 * 5), tagCount: 3, lastDirection: "SELF" as const },
  { address: "0x9876...5432", lastQuery: new Date(Date.now() - 1000 * 60 * 60 * 24), tagCount: 0, lastDirection: "IN" as const },
];

export const mockChartData = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - 1000 * 60 * 60 * 24 * (29 - i)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  transactions: Math.floor(Math.random() * 50) + 10,
}));
