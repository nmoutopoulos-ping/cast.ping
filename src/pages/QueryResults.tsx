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
import { Download, RefreshCw, Search, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface QueryRow {
  tx_hash: string;
  block_number: number;
  block_time: string;
  eth_direction: string;
  from_address: string;
  to_address: string;
  nonce: number;
  transaction_index: number;
  value_eth: number;
  tx_fee_eth: number;
  gas_price: number;
  gas_used: number;
  success: boolean;
  token_contract: string;
  token_symbol: string;
  token_name: string;
  token_direction: string;
  token_from: string;
  token_to: string;
  token_amount_raw: string;
  token_amount: number;
}

const DEFAULT_QUERY_ID = "6459204";

export default function QueryResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const savedQueryId = searchParams.get("id");
  const walletParam = searchParams.get("wallet");
  const { user } = useAuth();
  
  const [walletAddress, setWalletAddress] = useState(walletParam || "");
  const [searchedWallet, setSearchedWallet] = useState(walletParam || "");
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryName, setQueryName] = useState<string>("");
  const [duneQueryId, setDuneQueryId] = useState<string>("");

  // Load saved query if id param is present
  useEffect(() => {
    if (savedQueryId && user) {
      loadSavedQuery();
    }
  }, [savedQueryId, user]);

  // Auto-search if wallet param is present
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

    // Check for cached transactions
    const { data: cachedTx } = await supabase
      .from("transactions")
      .select("*")
      .eq("saved_query_id", savedQueryId)
      .eq("user_id", user.id);

    if (cachedTx && cachedTx.length > 0) {
      setRows(cachedTx.map(tx => ({
        tx_hash: tx.tx_hash,
        block_number: Number(tx.block_number),
        block_time: tx.block_time || "",
        eth_direction: tx.direction || "",
        from_address: tx.from_address || "",
        to_address: tx.to_address || "",
        nonce: Number(tx.nonce),
        transaction_index: Number(tx.transaction_index),
        value_eth: Number(tx.value_eth),
        tx_fee_eth: Number(tx.tx_fee_eth),
        gas_price: Number(tx.gas_price),
        gas_used: Number(tx.gas_used),
        success: tx.success ?? true,
        token_contract: tx.token_contract || "",
        token_symbol: tx.token_symbol || "",
        token_name: tx.token_name || "",
        token_direction: "",
        token_from: "",
        token_to: "",
        token_amount_raw: tx.token_amount_raw || "",
        token_amount: Number(tx.token_amount),
      })));
      setLoading(false);
      return;
    }

    // Fetch from Dune if we have a wallet address
    if (queryData.wallet_address) {
      await fetchFromDune(queryData.dune_query_id, queryData.wallet_address);
    } else {
      setLoading(false);
    }
  };

  const fetchFromDune = async (queryId: string, address: string) => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase.functions.invoke("dune-query", {
      body: { queryId, parameters: { address: address.toLowerCase() } },
    });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    if (data?.result?.rows) {
      setRows(data.result.rows);
    } else if (data?.error) {
      setError(data.error);
    }

    setLoading(false);
  };

  const handleSearch = async () => {
    const trimmed = walletAddress.trim();
    if (!trimmed) {
      toast.error("Please enter a wallet address");
      return;
    }

    // Basic validation for Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      toast.error("Invalid Ethereum address format");
      return;
    }

    setSearchedWallet(trimmed);
    setSearchParams({ wallet: trimmed });
    await fetchFromDune(DEFAULT_QUERY_ID, trimmed);
  };

  const handleSaveToDatabase = async () => {
    if (!user || !savedQueryId || rows.length === 0) return;
    
    setSaving(true);
    
    await supabase
      .from("transactions")
      .delete()
      .eq("saved_query_id", savedQueryId)
      .eq("user_id", user.id);

    const txRecords = rows.map(row => ({
      saved_query_id: savedQueryId,
      user_id: user.id,
      tx_hash: row.tx_hash,
      block_number: row.block_number,
      block_time: row.block_time || null,
      direction: row.eth_direction,
      from_address: row.from_address,
      to_address: row.to_address,
      nonce: row.nonce,
      transaction_index: row.transaction_index,
      value_eth: row.value_eth,
      tx_fee_eth: row.tx_fee_eth,
      gas_price: row.gas_price,
      gas_used: row.gas_used,
      success: row.success,
      token_contract: row.token_contract || null,
      token_symbol: row.token_symbol || null,
      token_name: row.token_name || null,
      token_amount_raw: row.token_amount_raw || null,
      token_amount: row.token_amount || null,
    }));

    const { error: insertError } = await supabase
      .from("transactions")
      .insert(txRecords);

    if (insertError) {
      toast.error("Failed to save: " + insertError.message);
    } else {
      toast.success(`Saved ${rows.length} transactions to database!`);
    }
    
    setSaving(false);
  };

  const handleRefresh = () => {
    if (searchedWallet) {
      fetchFromDune(duneQueryId || DEFAULT_QUERY_ID, searchedWallet);
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
      {error && (
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
                <Button onClick={handleSaveToDatabase} disabled={saving} className="gap-2">
                  <Download className="w-4 h-4" />
                  {saving ? "Saving..." : "Save to Database"}
                </Button>
              )}
            </div>
          </div>

          <TransactionDataTable rows={rows} searchedWallet={searchedWallet} />
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
