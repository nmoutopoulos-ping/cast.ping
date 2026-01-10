import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TransactionDataTable } from "@/components/transactions/TransactionDataTable";
import { Download, RefreshCw, Search, CheckCircle, Wallet, Coins, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useEntitiesAndTags } from "@/hooks/useEntitiesAndTags";
import { useElapsedTimer } from "@/hooks/useElapsedTimer";
import type { TransactionRow, ApiStatusInfo } from "@/types/transactions";
import { CHAIN_CONFIGS, DEFAULT_CHAIN } from "@/types/transactions";
import {
  mapDbTransactionToRow,
  saveTransactionsToDb,
  fetchFromDune,
} from "@/lib/transactionUtils";
import { formatNumber } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiStatusIndicator } from "@/components/shared/ApiStatusIndicator";
import { TransactionSkeletons } from "@/components/shared/LoadingSkeletons";
import { StablecoinMarketBar } from "@/components/stablecoins/StablecoinMarketBar";

export default function QueryResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const savedQueryId = searchParams.get("id");
  const walletParam = searchParams.get("wallet");
  const { user } = useAuth();
  
  // Use the shared hook for tags
  const { tags } = useEntitiesAndTags(user?.id);
  
  const [walletAddress, setWalletAddress] = useState(walletParam || "");
  const [searchedWallet, setSearchedWallet] = useState(walletParam || "");
  const [selectedChain, setSelectedChain] = useState<string>(DEFAULT_CHAIN);
  const [searchType, setSearchType] = useState<"wallet" | "token">("wallet");
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSavedToDb, setIsSavedToDb] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryName, setQueryName] = useState<string>("");
  const [duneQueryId, setDuneQueryId] = useState<string>("");
  const [currentSavedQueryId, setCurrentSavedQueryId] = useState<string | null>(savedQueryId);
  const [apiStatus, setApiStatus] = useState<ApiStatusInfo>({ status: "idle", message: "" });
  
  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [pendingSaveData, setPendingSaveData] = useState<{ rows: TransactionRow[]; address: string; queryId: string } | null>(null);
  
  // Track if we've already processed a walletParam to prevent duplicate fetches
  const hasProcessedWalletParam = useRef(false);
  
  const currentChainConfig = CHAIN_CONFIGS[selectedChain];

  const isTimerActive = ["connecting", "fetching", "processing"].includes(apiStatus.status);
  const elapsedSeconds = useElapsedTimer(apiStatus.startTime, isTimerActive);

  useEffect(() => {
    if (savedQueryId && user) {
      loadSavedQuery();
    }
  }, [savedQueryId, user]);

  useEffect(() => {
    if (walletParam && !savedQueryId && !hasProcessedWalletParam.current) {
      hasProcessedWalletParam.current = true;
      // Just fetch, don't auto-save
      handleFetchFromDune(currentChainConfig.queryId, walletParam);
      setSearchedWallet(walletParam);
    }
  }, [walletParam, savedQueryId]);

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
        return { rows: [], error: duneError };
      }

      setApiStatus({ status: "processing", message: "Processing transaction data...", startTime });

      if (duneRows.length > 0) {
        setRows(duneRows);
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        setApiStatus({ 
          status: "complete", 
          message: `Found ${formatNumber(duneRows.length)} transactions in ${elapsed}s` 
        });
        return { rows: duneRows, error: null };
      } else {
        setRows([]);
        setApiStatus({ status: "complete", message: "No transactions found" });
        return { rows: [], error: null };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
      setApiStatus({ status: "error", message: errorMsg });
      setError(errorMsg);
      return { rows: [], error: errorMsg };
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
    setCurrentSavedQueryId(null);
    setIsSavedToDb(false);

    // Just fetch - don't auto-save
    await handleFetchFromDune(currentChainConfig.queryId, trimmed);
  };

  const handleOpenSaveDialog = () => {
    if (rows.length === 0) {
      toast.error("No transactions to save");
      return;
    }
    
    // Pre-fill with default name
    const defaultName = `${searchType === "wallet" ? "Wallet" : "Token"}: ${searchedWallet.slice(0, 8)}...${searchedWallet.slice(-6)}`;
    setSaveName(defaultName);
    setSaveDescription("");
    setPendingSaveData({
      rows,
      address: searchedWallet,
      queryId: currentChainConfig.queryId,
    });
    setShowSaveDialog(true);
  };

  const handleConfirmSave = async () => {
    if (!user || !pendingSaveData) return;

    const trimmedName = saveName.trim();
    if (!trimmedName) {
      toast.error("Please enter a name");
      return;
    }

    setSaving(true);

    // Save the query entry
    const { data: savedQuery, error: saveError } = await supabase
      .from("saved_queries")
      .insert({
        name: trimmedName,
        description: saveDescription.trim() || null,
        dune_query_id: pendingSaveData.queryId,
        wallet_address: pendingSaveData.address,
        search_type: searchType,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("Failed to save search:", saveError);
      toast.error("Failed to save search");
      setSaving(false);
      return;
    }

    // Save transactions to the query
    const { count, error: txError } = await saveTransactionsToDb(
      pendingSaveData.rows, 
      savedQuery.id, 
      user.id
    );

    if (txError) {
      toast.error("Failed to save transactions: " + txError);
    } else {
      setCurrentSavedQueryId(savedQuery.id);
      setQueryName(trimmedName);
      setIsSavedToDb(true);
      toast.success(`Saved "${trimmedName}" with ${count} transactions!`);
    }

    setSaving(false);
    setShowSaveDialog(false);
    setPendingSaveData(null);
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

      {/* Stablecoin Market Data */}
      <StablecoinMarketBar />

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
              <span className="text-sm text-muted-foreground">{formatNumber(rows.length)} transactions found</span>
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
              {currentSavedQueryId || savedQueryId ? (
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
              ) : (
                <Button onClick={handleOpenSaveDialog} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Search
                </Button>
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

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Give your search a name and optional description for easy reference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-name">Name</Label>
              <Input
                id="save-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="My Wallet Search"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-description">Description (optional)</Label>
              <Textarea
                id="save-description"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="Notes about this search..."
                rows={3}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{rows.length}</span> transactions will be saved
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
