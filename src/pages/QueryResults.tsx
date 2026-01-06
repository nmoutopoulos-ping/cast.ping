import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TransactionDataTable } from "@/components/transactions/TransactionDataTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Download, RefreshCw, Search, Bookmark, CheckCircle, Loader2, AlertCircle, Wifi } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import type { TransactionRow, DbTag } from "@/types/transactions";
import { DEFAULT_QUERY_ID } from "@/types/transactions";
import {
  mapDbTransactionToRow,
  saveTransactionsToDb,
} from "@/lib/transactionUtils";

type ApiStatus = "idle" | "connecting" | "fetching" | "processing" | "complete" | "error";

interface ApiStatusInfo {
  status: ApiStatus;
  message: string;
  startTime?: number;
}

// Timer hook for live elapsed time display
function useElapsedTimer(startTime: number | undefined, isActive: boolean) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    if (!isActive || !startTime) {
      setElapsed(0);
      return;
    }
    
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime, isActive]);
  
  return elapsed;
}

export default function QueryResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const savedQueryId = searchParams.get("id");
  const walletParam = searchParams.get("wallet");
  const { user } = useAuth();
  
  const [walletAddress, setWalletAddress] = useState(walletParam || "");
  const [searchedWallet, setSearchedWallet] = useState(walletParam || "");
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [tags, setTags] = useState<DbTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSavedToDb, setIsSavedToDb] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryName, setQueryName] = useState<string>("");
  const [duneQueryId, setDuneQueryId] = useState<string>("");
  const [apiStatus, setApiStatus] = useState<ApiStatusInfo>({ status: "idle", message: "" });

  const isTimerActive = ["connecting", "fetching", "processing"].includes(apiStatus.status);
  const elapsedSeconds = useElapsedTimer(apiStatus.startTime, isTimerActive);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

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

    // Status: Connecting
    setApiStatus({ status: "connecting", message: "Connecting to Dune API...", startTime });

    try {
      // Status: Fetching
      setApiStatus({ status: "fetching", message: `Fetching data for ${address.slice(0, 8)}...`, startTime });

      const { data, error: invokeError } = await supabase.functions.invoke("dune-query", {
        body: { queryId, parameters: { address: address.toLowerCase() } },
      });

      if (invokeError) {
        const errorMsg = `Edge Function Error: ${invokeError.message}`;
        setApiStatus({ status: "error", message: errorMsg });
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Check for Dune-specific errors
      if (data?.error) {
        const duneError = `Dune API Error: ${data.error}`;
        setApiStatus({ status: "error", message: duneError });
        setError(duneError);
        setLoading(false);
        return;
      }

      // Status: Processing
      setApiStatus({ status: "processing", message: "Processing transaction data...", startTime });

      if (data?.result?.rows) {
        const duneRows = data.result.rows as TransactionRow[];
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
    const trimmed = walletAddress.trim();
    if (!trimmed) {
      toast.error("Please enter a wallet address");
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      toast.error("Invalid Ethereum address format");
      return;
    }

    setSearchedWallet(trimmed);
    setSearchParams({ wallet: trimmed });
    await handleFetchFromDune(DEFAULT_QUERY_ID, trimmed);
  };

  const handleSaveToDatabase = async () => {
    if (!user || !savedQueryId || rows.length === 0) return;
    
    setSaving(true);
    const { count, error: saveError } = await saveTransactionsToDb(rows, savedQueryId, user.id);

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
      handleFetchFromDune(duneQueryId || DEFAULT_QUERY_ID, searchedWallet);
    }
  };

  // Save Search Dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [savingSearch, setSavingSearch] = useState(false);

  const handleSaveSearch = async () => {
    if (!user || !searchedWallet) {
      toast.error("Please search for a wallet first");
      return;
    }

    if (!saveName.trim()) {
      toast.error("Please enter a name for this search");
      return;
    }

    setSavingSearch(true);

    const { error } = await supabase.from("saved_queries").insert({
      name: saveName.trim(),
      description: saveDescription.trim() || null,
      dune_query_id: DEFAULT_QUERY_ID,
      wallet_address: searchedWallet,
      user_id: user.id,
    });

    if (error) {
      toast.error("Failed to save search: " + error.message);
    } else {
      toast.success("Search saved successfully!");
      setSaveDialogOpen(false);
      setSaveName("");
      setSaveDescription("");
    }
    setSavingSearch(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search Bar */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Search Data</h1>
        <p className="text-sm text-muted-foreground">
          Enter a wallet address to search for all transactions involving that address
        </p>
        <div className="flex gap-3 max-w-2xl">
          <Input
            placeholder="0x... (wallet or contract address)"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="font-mono"
          />
          <Button onClick={handleSearch} disabled={loading} className="gap-2">
            <Search className="w-4 h-4" />
            Search
          </Button>
        </div>
      </div>

      {/* API Status Indicator */}
      {apiStatus.status !== "idle" && (
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${
          apiStatus.status === "error" 
            ? "bg-destructive/10 border-destructive/50 text-destructive"
            : apiStatus.status === "complete"
            ? "bg-green-500/10 border-green-500/50 text-green-600"
            : "bg-primary/10 border-primary/50 text-primary"
        }`}>
          {apiStatus.status === "connecting" && (
            <>
              <Wifi className="w-5 h-5 animate-pulse" />
              <span className="font-medium flex-1">Connecting to Dune API...</span>
              <span className="font-mono text-sm tabular-nums">{formatTime(elapsedSeconds)}</span>
            </>
          )}
          {apiStatus.status === "fetching" && (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <div className="flex-1">
                <span className="font-medium">{apiStatus.message}</span>
                <p className="text-xs opacity-75 mt-0.5">This may take up to 2 minutes...</p>
              </div>
              <span className="font-mono text-lg tabular-nums font-semibold">{formatTime(elapsedSeconds)}</span>
            </>
          )}
          {apiStatus.status === "processing" && (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium flex-1">Processing transaction data...</span>
              <span className="font-mono text-sm tabular-nums">{formatTime(elapsedSeconds)}</span>
            </>
          )}
          {apiStatus.status === "complete" && (
            <>
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{apiStatus.message}</span>
            </>
          )}
          {apiStatus.status === "error" && (
            <>
              <AlertCircle className="w-5 h-5" />
              <div className="flex-1">
                <span className="font-medium">API Error</span>
                <p className="text-sm mt-1 opacity-90">{apiStatus.message}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Query Info */}
      {queryName && (
        <div className="text-sm text-muted-foreground">
          Saved Search: <span className="font-medium text-foreground">{queryName}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

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
              {!savedQueryId && searchedWallet && (
                <Button variant="outline" onClick={() => setSaveDialogOpen(true)} className="gap-2">
                  <Bookmark className="w-4 h-4" />
                  Save Search
                </Button>
              )}
              {savedQueryId && (
                isSavedToDb ? (
                  <Button variant="outline" disabled className="gap-2 text-green-600 border-green-600/50">
                    <CheckCircle className="w-4 h-4" />
                    Saved to Database
                  </Button>
                ) : (
                  <Button onClick={handleSaveToDatabase} disabled={saving} className="gap-2">
                    <Download className="w-4 h-4" />
                    {saving ? "Saving..." : "Save to Database"}
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
        <div className="text-center py-12 text-muted-foreground">
          Enter a wallet address above to search for transactions
        </div>
      )}

      {!loading && !error && rows.length === 0 && searchedWallet && (
        <div className="text-center py-12 text-muted-foreground">
          No transactions found for this address
        </div>
      )}

      {/* Save Search Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save this wallet search for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-name">Name *</Label>
              <Input
                id="save-name"
                placeholder="e.g., Main Wallet Transactions"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-description">Description</Label>
              <Textarea
                id="save-description"
                placeholder="Describe this search..."
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <Input value={searchedWallet} disabled className="font-mono text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label>Date Saved</Label>
              <Input value={saveDate} disabled className="text-muted-foreground" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSearch} disabled={savingSearch}>
              {savingSearch ? "Saving..." : "Save Search"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
