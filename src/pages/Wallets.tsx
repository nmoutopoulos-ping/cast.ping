import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { WalletSearchBar } from "@/components/shared/WalletSearchBar";
import { WalletSummaryPanel } from "@/components/wallets/WalletSummaryPanel";
import { TransactionsTable } from "@/components/wallets/TransactionsTable";
import { TokenTransfersTable } from "@/components/wallets/TokenTransfersTable";
import { NotesPanel } from "@/components/wallets/NotesPanel";
import { TransactionFilters } from "@/components/wallets/TransactionFilters";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDuneQuery } from "@/hooks/useDuneQuery";
import type { WalletProfile } from "@/types/wallet";
import { Wallet, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Wallets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const addressParam = searchParams.get("address");
  const [currentAddress, setCurrentAddress] = useState(addressParam || "");
  
  const { 
    transactions, 
    tokenTransfers, 
    stats, 
    rawTransactions,
    isLoading, 
    error, 
    fetchData 
  } = useDuneQuery();

  // Create a wallet profile from the fetched data
  const walletProfile: WalletProfile | null = currentAddress ? {
    address: currentAddress,
    chain: "Sepolia",
    type: "Unknown",
    riskLevel: "Low",
    internalId: "",
    tags: [],
    notes: "",
    entityName: "",
    clientId: "",
    totalTxCount: stats?.totalTxCount || 0,
    firstSeen: stats?.firstSeen || new Date(),
    lastSeen: stats?.lastSeen || new Date(),
    totalInValue: stats?.totalInValue || 0,
    totalOutValue: stats?.totalOutValue || 0,
  } : null;

  const handleSearch = (address: string) => {
    setCurrentAddress(address);
    setSearchParams({ address });
  };

  // Fetch data when address changes
  useEffect(() => {
    if (currentAddress) {
      fetchData(currentAddress);
    }
  }, [currentAddress, fetchData]);

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
          {walletProfile && <WalletSummaryPanel wallet={walletProfile} />}

          {/* Center - Data Tables */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Fetching wallet data from Dune...</p>
                  <p className="text-xs text-muted-foreground mt-1">This may take 30-60 seconds</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                  <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
                  <p className="text-sm font-medium mb-2">Failed to fetch data</p>
                  <p className="text-xs text-muted-foreground mb-4">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fetchData(currentAddress)}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="transactions" className="flex-1 flex flex-col">
                <div className="border-b border-border px-6 py-3">
                  <TabsList>
                    <TabsTrigger value="transactions">
                      Transactions {transactions.length > 0 && `(${transactions.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="tokens">
                      Token Transfers {tokenTransfers.length > 0 && `(${tokenTransfers.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="raw">Raw Query Results</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="transactions" className="flex-1 flex flex-col m-0 overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/30">
                    <TransactionFilters />
                  </div>
                  <div className="flex-1 overflow-auto">
                    {transactions.length > 0 ? (
                      <TransactionsTable transactions={transactions} />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <EmptyState
                          icon={Wallet}
                          title="No transactions found"
                          description="This wallet has no transaction history or the query returned no results."
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="tokens" className="flex-1 m-0 overflow-auto">
                  {tokenTransfers.length > 0 ? (
                    <TokenTransfersTable transfers={tokenTransfers} />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <EmptyState
                        icon={Wallet}
                        title="No token transfers found"
                        description="This wallet has no token transfer history."
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="raw" className="flex-1 m-0 p-6">
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-auto h-full">
                    <pre>{JSON.stringify(rawTransactions, null, 2)}</pre>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* Right Panel - Notes */}
          {walletProfile && <NotesPanel wallet={walletProfile} />}
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
