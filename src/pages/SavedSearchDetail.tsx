import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TransactionDataTable, ALL_COLUMNS } from "@/components/transactions/TransactionDataTable";
import { ViewEditor } from "@/components/transactions/ViewEditor";
import { ArrowLeft, RefreshCw, Download, CheckCircle, Database, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import type { 
  TransactionRow, 
  Entity, 
  DbTag, 
  ActiveFilter, 
  SavedQueryInfo,
  FilterMode 
} from "@/types/transactions";
import { DEFAULT_QUERY_ID } from "@/types/transactions";
import {
  mapDbTransactionToRow,
  needsBackfill,
  extractAddressesFromRows,
  buildHighlightMap,
  buildAddressLabels,
  filterRowsByActiveFilters,
  fetchFromDune,
  saveTransactionsToDb,
  fetchEntitiesAndTags,
} from "@/lib/transactionUtils";

export default function SavedSearchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [savedQuery, setSavedQuery] = useState<SavedQueryInfo | null>(null);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSavedToDb, setIsSavedToDb] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [entities, setEntities] = useState<Entity[]>([]);
  const [tags, setTags] = useState<DbTag[]>([]);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<FilterMode>("any");
  const [tagFilterMode, setTagFilterMode] = useState<FilterMode>("any");

  useEffect(() => {
    if (user) {
      fetchEntitiesAndTags().then(({ entities, tags }) => {
        setEntities(entities);
        setTags(tags);
      });
    }
  }, [user]);

  const transactionAddresses = useMemo(() => extractAddressesFromRows(rows), [rows]);
  const highlightMap = useMemo(() => buildHighlightMap(activeFilters), [activeFilters]);
  const filteredRows = useMemo(
    () => filterRowsByActiveFilters(rows, activeFilters, filterMode, tagFilterMode),
    [rows, activeFilters, filterMode, tagFilterMode]
  );
  const addressLabels = useMemo(
    () => buildAddressLabels(entities, tags),
    [entities, tags]
  );

  useEffect(() => {
    if (id && user) {
      loadSavedSearch();
    }
  }, [id, user]);
  
  const loadSavedSearch = async () => {
    if (!id || !user) return;
    
    setLoading(true);
    setError(null);

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

    const { data: cachedTx } = await supabase
      .from("transactions")
      .select("*")
      .eq("saved_query_id", id)
      .eq("user_id", user.id);

    if (cachedTx && cachedTx.length > 0) {
      const mapped = cachedTx.map(mapDbTransactionToRow);
      setRows(mapped);

      const requiresBackfill = needsBackfill(cachedTx);
      setIsSavedToDb(!requiresBackfill);

      if (!requiresBackfill) {
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

    const { rows: duneRows, error: duneError } = await fetchFromDune(queryId, address);

    if (duneError) {
      setError(duneError);
      setLoading(false);
      return;
    }

    setRows(duneRows);

    if (user && id && duneRows.length > 0) {
      const { count } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("saved_query_id", id)
        .eq("user_id", user.id);
      
      setIsSavedToDb(count !== null && count >= duneRows.length);
    } else {
      setIsSavedToDb(false);
    }

    setLoading(false);
  };

  const handleRefresh = () => {
    if (savedQuery?.wallet_address) {
      handleFetchFromDune(savedQuery.dune_query_id || DEFAULT_QUERY_ID, savedQuery.wallet_address);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!user || !id || rows.length === 0) return;
    
    setSaving(true);
    const { count, error: saveError } = await saveTransactionsToDb(rows, id, user.id);

    if (saveError) {
      toast.error("Failed to save: " + saveError);
    } else {
      setIsSavedToDb(true);
      toast.success(`Saved ${count} transactions to database!`);
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

          {user && id && (
            <ViewEditor
              savedQueryId={id}
              userId={user.id}
              entities={entities}
              tags={tags}
              transactionAddresses={transactionAddresses}
              columns={ALL_COLUMNS.map(c => ({ key: c.key, label: c.label }))}
              hiddenColumns={hiddenColumns}
              activeFilters={activeFilters}
              filterMode={filterMode}
              tagFilterMode={tagFilterMode}
              totalRowCount={rows.length}
              filteredRowCount={filteredRows.length}
              onHiddenColumnsChange={setHiddenColumns}
              onActiveFiltersChange={setActiveFilters}
              onFilterModeChange={setFilterMode}
              onTagFilterModeChange={setTagFilterMode}
            />
          )}

          <TransactionDataTable 
            rows={filteredRows} 
            highlightMap={highlightMap}
            addressLabels={addressLabels}
            hiddenColumns={hiddenColumns}
            tags={tags}
          />
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
