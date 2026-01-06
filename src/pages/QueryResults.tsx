import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TransactionDataTable } from "@/components/transactions/TransactionDataTable";
import { Download, RefreshCw, Search, CheckCircle, Wallet, Coins } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useElapsedTimer } from "@/hooks/useElapsedTimer";
import type { TransactionRow, DbTag, ApiStatusInfo } from "@/types/transactions";
import { CHAIN_CONFIGS, DEFAULT_CHAIN } from "@/types/transactions";
import {
  mapDbTransactionToRow,
  saveTransactionsToDb,
  fetchFromDune,
} from "@/lib/transactionUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiStatusIndicator } from "@/components/shared/ApiStatusIndicator";
import { TransactionSkeletons } from "@/components/shared/LoadingSkeletons";

export default function QueryResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const savedQueryId = searchParams.get("id");
  const walletParam = searchParams.get("wallet");
  const { user } = useAuth();
  
  const [walletAddress, setWalletAddress] = useState(walletParam || "");
  const [searchedWallet, setSearchedWallet] = useState(walletParam || "");
  const [selectedChain, setSelectedChain] = useState<string>(DEFAULT_CHAIN);
  const [searchType, setSearchType] = useState<"wallet" | "token">("wallet");
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [tags, setTags] = useState<DbTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSavedToDb, setIsSavedToDb] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryName, setQueryName] = useState<string>("");
  const [duneQueryId, setDuneQueryId] = useState<string>("");
  const [currentSavedQueryId, setCurrentSavedQueryId] = useState<string | null>(savedQueryId);
  const [apiStatus, setApiStatus] = useState<ApiStatusInfo>({ status: "idle", message: "" });
  
  const currentChainConfig = CHAIN_CONFIGS[selectedChain];

  const isTimerActive = ["connecting", "fetching", "processing"].includes(apiStatus.status);
  const elapsedSeconds = useElapsedTimer(apiStatus.startTime, isTimerActive);

  useEffect(() => {
    if (user) {
      fetchTags();
    }
  }, [user]);

  useEffect(() => {
    if (savedQueryId && user) {
      loadSavedQuery();
    }
  }, [savedQueryId, user]);

  const fetchTags = async () => {
    const { data } = await supabase.from("tags").select("*");
    if (data) setTags(data);
  };

  useEffect(() => {
    if (walletParam && !savedQueryId) {
      handleSearch();
    }
  }, [walletParam]);

  const loadSavedQuery = async () => {
    if (!savedQueryId || !user) return;
    
    setLoading(true);
    setError(null);

    const { data: queryData, error: queryError } = await supabase
      .from("saved_queries")
      .select("*")
      .eq("id", savedQueryId)
      .maybeSingle();

    if (queryError || !queryData) {
      setError("Query not found");
      setLoading(false);
      return;
    }

    setQueryName(queryData.name);
    setDuneQueryId(queryData.dune_query_id);
    if (queryData.wallet_address) {
      setWalletAddress(queryData.wallet_address);
      setSearchedWallet(queryData.wallet_address);
    }

    const { data: cachedTx } = await supabase
      .from("transactions")
      .select("*")
      .eq("saved_query_id", savedQueryId)
      .eq("user_id", user.id);

    if (cachedTx && cachedTx.length > 0) {
      const mapped = cachedTx.map(mapDbTransactionToRow);
      setRows(mapped);

      const isComplete = cachedTx.every((tx) => !!tx.method);
      setIsSavedToDb(isComplete);

      if (isComplete) {
        setLoading(false);
        return;
      }
    }
    
    setIsSavedToDb(false);

    if (queryData.wallet_address) {
      await handleFetchFromDune(queryData.dune_query_id, queryData.wallet_address);
    } else {
      setLoading(false);
    }
  };

  const handleFetchFromDune = async (queryId: string, address: string) => {
    setLoading(true);
    setError(null);
    const startTime = Date.now();

    setApiStatus({ status: "connecting", message: "Connecting to Dune API...", startTime });

    try {
      setApiStatus({ status: "fetching", message: `Fetching data for ${address.slice(0, 8)}...`, startTime });

      const { rows: duneRows, error: duneError } = await fetchFromDune(queryId, address);

      if (duneError) {
        const errorMsg = `Dune API Error: ${duneError}`;
        setApiStatus({ status: "error", message: errorMsg });
        setError(errorMsg);
        setLoading(false);
        return;
      }

      setApiStatus({ status: "processing", message: "Processing transaction data...", startTime });

      if (duneRows.length > 0) {
        setRows(duneRows);
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        setApiStatus({ 
          status: "complete", 
          message: `Found ${duneRows.length} transactions in ${elapsed}s` 
        });
      } else {
        setRows([]);
        setApiStatus({ status: "complete", message: "No transactions found" });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
      setApiStatus({ status: "error", message: errorMsg });
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!user) {
      toast.error("Please sign in to search");
      return;
    }

    const trimmed = walletAddress.trim();
    if (!trimmed) {
      toast.error("Please enter an address");
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      toast.error("Invalid Ethereum address format");
      return;
    }

    setSearchedWallet(trimmed);
    setSearchParams({ wallet: trimmed, chain: selectedChain, type: searchType });

    // Auto-save search to database
    const { data: savedQuery, error: saveError } = await supabase
      .from("saved_queries")
      .insert({
        name: `${searchType === "wallet" ? "Wallet" : "Token"}: ${trimmed.slice(0, 8)}...${trimmed.slice(-6)}`,
        dune_query_id: currentChainConfig.queryId,
        wallet_address: trimmed,
        search_type: searchType,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("Failed to save search:", saveError);
      toast.error("Failed to save search");
      return;
    }

    setCurrentSavedQueryId(savedQuery.id);
    toast.success("Search saved!");
    
    await handleFetchFromDune(currentChainConfig.queryId, trimmed);
  };

  const handleSaveToDatabase = async () => {
    const queryId = currentSavedQueryId || savedQueryId;
    if (!user || !queryId || rows.length === 0) return;
    
    setSaving(true);
    const { count, error: saveError } = await saveTransactionsToDb(rows, queryId, user.id);

    if (saveError) {
      toast.error("Failed to save: " + saveError);
    } else {
      setIsSavedToDb(true);
      toast.success(`Saved ${count} transactions to database!`);
    }
    
    setSaving(false);
  };

  const handleRefresh = () => {
    if (searchedWallet) {
      handleFetchFromDune(duneQueryId || currentChainConfig.queryId, searchedWallet);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Search Bar */}
      <div className="space-y-3">
        <div className="space-y-1">
          <h1>Search</h1>
          <p className="text-sm text-muted-foreground">
            Enter an address to search for transactions
          </p>
        </div>
        <div className="flex gap-3 max-w-3xl">
          <Select value={searchType} onValueChange={(v) => setSearchType(v as "wallet" | "token")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wallet">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Wallet
                </div>
              </SelectItem>
              <SelectItem value="token">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Token
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedChain} onValueChange={setSelectedChain}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(CHAIN_CONFIGS).map((chain) => (
                <SelectItem key={chain.id} value={chain.id}>
                  <div className="flex items-center gap-2">
                    <span>{chain.name}</span>
                    {chain.isTestnet && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
                        Testnet
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder={searchType === "wallet" ? "0x... wallet address" : "0x... token contract"}
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="font-mono flex-1"
          />
          <Button onClick={handleSearch} disabled={loading} className="gap-2 px-5">
            <Search className="w-4 h-4" />
            Search
          </Button>
        </div>
      </div>

      {/* API Status Indicator */}
      <ApiStatusIndicator
        status={apiStatus.status}
        message={apiStatus.message}
        elapsedSeconds={elapsedSeconds}
      />

      {/* Query Info */}
      {queryName && (
        <div className="text-sm text-muted-foreground">
          Saved Search: <span className="font-medium text-foreground">{queryName}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && <TransactionSkeletons />}

      {/* Error State */}
      {error && apiStatus.status !== "error" && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          Error: {error}
        </div>
      )}

      {/* Results */}
      {!loading && !error && rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{rows.length} transactions found</span>
              {searchedWallet && (
                <Badge variant="outline" className="font-mono text-xs">
                  {searchedWallet.slice(0, 10)}...{searchedWallet.slice(-8)}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleRefresh} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              {(currentSavedQueryId || savedQueryId) && (
                isSavedToDb ? (
                  <Button variant="outline" disabled className="gap-2 text-green-600 border-green-600/50">
                    <CheckCircle className="w-4 h-4" />
                    Saved to Database
                  </Button>
                ) : (
                  <Button onClick={handleSaveToDatabase} disabled={saving} className="gap-2">
                    <Download className="w-4 h-4" />
                    {saving ? "Saving..." : "Save Transactions"}
                  </Button>
                )
              )}
            </div>
          </div>

          <TransactionDataTable rows={rows} tags={tags} />
        </>
      )}

      {/* Empty State */}
      {!loading && !error && rows.length === 0 && !searchedWallet && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="empty-state-description">Enter an address above to search for transactions</p>
        </div>
      )}

      {!loading && !error && rows.length === 0 && searchedWallet && (
        <div className="empty-state">
          <p className="empty-state-description">No transactions found for this address</p>
        </div>
      )}
    </div>
  );
}
