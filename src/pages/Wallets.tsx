import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { WalletSearchBar } from "@/components/shared/WalletSearchBar";
import { WalletSummaryPanel } from "@/components/wallets/WalletSummaryPanel";
import { TransactionsTable } from "@/components/wallets/TransactionsTable";
import { TokenTransfersTable } from "@/components/wallets/TokenTransfersTable";
import { NotesPanel } from "@/components/wallets/NotesPanel";
import { TransactionFilters } from "@/components/wallets/TransactionFilters";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockWalletProfile, mockTransactions, mockTokenTransfers } from "@/lib/mockData";
import { Wallet } from "lucide-react";

export default function Wallets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const addressParam = searchParams.get("address");
  const [currentAddress, setCurrentAddress] = useState(addressParam || "");

  const handleSearch = (address: string) => {
    setCurrentAddress(address);
    setSearchParams({ address });
  };

  const hasWallet = !!currentAddress;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <h1 className="text-xl font-semibold mb-4">Wallet Explorer</h1>
        <WalletSearchBar onSearch={handleSearch} />
      </div>

      {/* Content */}
      {hasWallet ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Summary */}
          <WalletSummaryPanel wallet={mockWalletProfile} />

          {/* Center - Data Tables */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs defaultValue="transactions" className="flex-1 flex flex-col">
              <div className="border-b border-border px-6 py-3">
                <TabsList>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="tokens">Token Transfers</TabsTrigger>
                  <TabsTrigger value="raw">Raw Query Results</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="transactions" className="flex-1 flex flex-col m-0 overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                  <TransactionFilters />
                </div>
                <div className="flex-1 overflow-auto">
                  <TransactionsTable transactions={mockTransactions} />
                </div>
              </TabsContent>

              <TabsContent value="tokens" className="flex-1 m-0 overflow-auto">
                <TokenTransfersTable transfers={mockTokenTransfers} />
              </TabsContent>

              <TabsContent value="raw" className="flex-1 m-0 p-6">
                <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-auto h-full">
                  <pre>{JSON.stringify(mockTransactions, null, 2)}</pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Notes */}
          <NotesPanel wallet={mockWalletProfile} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={Wallet}
            title="Paste an address to begin"
            description="Enter a wallet address or ENS name in the search bar above to explore on-chain activity and build a profile."
          />
        </div>
      )}
    </div>
  );
}
