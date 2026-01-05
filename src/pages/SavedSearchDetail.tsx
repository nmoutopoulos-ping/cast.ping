import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TransactionDataTable } from "@/components/transactions/TransactionDataTable";
import { ArrowLeft, RefreshCw, Download, CheckCircle, Database, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface QueryRow {
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

interface SavedQuery {
  id: string;
  name: string;
  description: string | null;
  dune_query_id: string;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_QUERY_ID = "6459204";

export default function SavedSearchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [savedQuery, setSavedQuery] = useState<SavedQuery | null>(null);
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSavedToDb, setIsSavedToDb] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && user) {
      loadSavedSearch();
    }
  }, [id, user]);

  const loadSavedSearch = async () => {
    if (!id || !user) return;
    
    setLoading(true);
    setError(null);

    // Load saved query metadata
    const { data: queryData, error: queryError } = await supabase
      .from("saved_queries")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (queryError || !queryData) {
      setError("Saved search not found");
      setLoading(false);
      return;
    }

    setSavedQuery(queryData);

    // Check for cached transactions
    const { data: cachedTx } = await supabase
      .from("transactions")
      .select("*")
      .eq("saved_query_id", id)
      .eq("user_id", user.id);

    if (cachedTx && cachedTx.length > 0) {
      const mapped = cachedTx.map((tx) => ({
        transaction_hash: tx.tx_hash,
        method: tx.method || "",
        block: Number(tx.block_number),
        timestamp: tx.block_time || "",
        from_address: tx.from_address || "",
        interacted_with: tx.to_address || "",
        eth_direction: tx.direction || "",
        token_direction: tx.token_direction || "",
        token_from: tx.token_from || "",
        token_to: tx.token_to || "",
        token_amount_raw: tx.token_amount_raw || "",
        token_amount: Number(tx.token_amount),
        token_symbol: tx.token_symbol || "",
        token_name: tx.token_name || "",
        token_contract: tx.token_contract || "",
        value_eth: Number(tx.value_eth),
        txn_fee_eth: Number(tx.tx_fee_eth),
        gas_price_gwei: Number(tx.gas_price) / 1e9,
        gas_price_wei: Number(tx.gas_price),
        gas_used: Number(tx.gas_used),
        status: tx.success ? "success" : "failed",
      }));

      setRows(mapped);
      setIsSavedToDb(true);
      setLoading(false);
      return;
    }

    setIsSavedToDb(false);

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
      setIsSavedToDb(false);
    } else if (data?.error) {
      setError(data.error);
    }

    setLoading(false);
  };

  const handleRefresh = () => {
    if (savedQuery?.wallet_address) {
      fetchFromDune(savedQuery.dune_query_id || DEFAULT_QUERY_ID, savedQuery.wallet_address);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!user || !id || rows.length === 0) return;
    
    setSaving(true);

    const txRecords = rows.map(row => ({
      saved_query_id: id,
      user_id: user.id,
      tx_hash: row.transaction_hash,
      block_number: row.block,
      block_time: row.timestamp || null,
      direction: row.eth_direction,
      from_address: row.from_address,
      to_address: row.interacted_with,
      nonce: null,
      transaction_index: null,
      value_eth: row.value_eth,
      tx_fee_eth: row.txn_fee_eth,
      gas_price: row.gas_price_wei,
      gas_used: row.gas_used,
      success: row.status === "success" || row.status === "Success",
      token_contract: row.token_contract || null,
      token_symbol: row.token_symbol || null,
      token_name: row.token_name || null,
      token_amount_raw: row.token_amount_raw || null,
      token_amount: row.token_amount || null,
      method: row.method || null,
      token_direction: row.token_direction || null,
      token_from: row.token_from || null,
      token_to: row.token_to || null,
    }));

    const { error: upsertError, data } = await supabase
      .from("transactions")
      .upsert(txRecords, { 
        onConflict: "saved_query_id,tx_hash",
        ignoreDuplicates: false 
      })
      .select();

    if (upsertError) {
      toast.error("Failed to save: " + upsertError.message);
    } else {
      setIsSavedToDb(true);
      toast.success(`Saved ${data?.length || rows.length} transactions to database!`);
    }
    
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/queries")}
          className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Saved Searches
        </Button>

        {savedQuery && (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold">{savedQuery.name}</h1>
                {savedQuery.description && (
                  <p className="text-muted-foreground mt-1">{savedQuery.description}</p>
                )}
              </div>
            </div>

            {/* Metadata cards */}
            <div className="flex flex-wrap gap-4">
              {savedQuery.wallet_address && (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Wallet:</span>
                  <code className="font-mono text-sm">
                    {savedQuery.wallet_address.slice(0, 10)}...{savedQuery.wallet_address.slice(-8)}
                  </code>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Created {format(new Date(savedQuery.created_at), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{rows.length} transactions</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs h-9 px-3">
                Ethereum
              </Badge>
            </div>
          </div>
        )}
      </div>

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
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh from Dune
            </Button>
            {isSavedToDb ? (
              <Button variant="outline" disabled className="gap-2 text-green-600 border-green-600/50">
                <CheckCircle className="w-4 h-4" />
                Saved to Database
              </Button>
            ) : (
              <Button onClick={handleSaveToDatabase} disabled={saving} className="gap-2">
                <Download className="w-4 h-4" />
                {saving ? "Saving..." : "Save to Database"}
              </Button>
            )}
          </div>

          <TransactionDataTable rows={rows} searchedWallet={savedQuery?.wallet_address || ""} />
        </>
      )}

      {/* Empty State */}
      {!loading && !error && rows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No transactions found for this search</p>
          <Button variant="outline" onClick={handleRefresh} className="mt-4 gap-2">
            <RefreshCw className="w-4 h-4" />
            Fetch from Dune
          </Button>
        </div>
      )}
    </div>
  );
}
