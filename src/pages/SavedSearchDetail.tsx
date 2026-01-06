import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TransactionDataTable, ALL_COLUMNS } from "@/components/transactions/TransactionDataTable";
import { ViewEditor } from "@/components/transactions/ViewEditor";
import { FullscreenTableDialog, FullscreenTableTrigger } from "@/components/transactions/FullscreenTableDialog";
import { ArrowLeft, RefreshCw, Download, CheckCircle, Database, Calendar, FileText, ExternalLink, Copy, Check, Loader2, Wifi } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useElapsedTimer, formatElapsedTime } from "@/hooks/useElapsedTimer";
import { format } from "date-fns";
import type { 
  TransactionRow, 
  Entity, 
  DbTag, 
  ActiveFilter, 
  SavedQueryInfo,
  FilterMode,
  MethodType 
} from "@/types/transactions";
import { DEFAULT_QUERY_ID, ETHERSCAN_BASE } from "@/types/transactions";
import {
  mapDbTransactionToRow,
  needsBackfill,
  extractAddressesFromRows,
  buildHighlightMap,
  buildAddressLabels,
  applyAllFilters,
  fetchFromDune,
  saveTransactionsToDb,
  fetchEntitiesAndTags,
  type DateRange,
} from "@/lib/transactionUtils";

export default function SavedSearchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [savedQuery, setSavedQuery] = useState<SavedQueryInfo | null>(null);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingFromDune, setFetchingFromDune] = useState(false);
  const [fetchStartTime, setFetchStartTime] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [isSavedToDb, setIsSavedToDb] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  
  const [entities, setEntities] = useState<Entity[]>([]);
  const [tags, setTags] = useState<DbTag[]>([]);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<FilterMode>("any");
  const [tagFilterMode, setTagFilterMode] = useState<FilterMode>("any");
  const [methodFilters, setMethodFilters] = useState<MethodType[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });

  const elapsedSeconds = useElapsedTimer(fetchStartTime, fetchingFromDune);

  const handleCopyAddress = async () => {
    if (savedQuery?.wallet_address) {
      await navigator.clipboard.writeText(savedQuery.wallet_address);
      setAddressCopied(true);
      toast.success("Address copied");
      setTimeout(() => setAddressCopied(false), 1500);
    }
  };

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
  const filteredRows = useMemo(() => applyAllFilters(rows, {
    activeFilters,
    filterMode,
    tagFilterMode,
    methodFilters,
    dateRange,
  }), [rows, activeFilters, filterMode, tagFilterMode, methodFilters, dateRange]);
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
    setFetchingFromDune(true);
    setFetchStartTime(Date.now());
    setError(null);

    const { rows: duneRows, error: duneError } = await fetchFromDune(queryId, address);

    setFetchingFromDune(false);
    setFetchStartTime(undefined);

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
          Back to Saved Data
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

            <div className="flex flex-wrap items-center gap-3">
              {savedQuery.wallet_address && (
                <div className="group flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Wallet:</span>
                  <a
                    href={`${ETHERSCAN_BASE}/address/${savedQuery.wallet_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-sm text-foreground/80 hover:text-primary transition-colors"
                  >
                    {savedQuery.wallet_address}
                    <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                  </a>
                  <button
                    onClick={handleCopyAddress}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                  >
                    {addressCopied ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Created {format(new Date(savedQuery.created_at), "MMMM do, yyyy")}
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

      {/* Loading State with Timer */}
      {loading && (
        <div className="space-y-4">
          {fetchingFromDune && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
              <Loader2 className="w-5 h-5 animate-spin" />
              <div className="flex-1">
                <span className="font-medium">Fetching from Dune API...</span>
                <p className="text-xs opacity-75 mt-0.5">This may take up to 2 minutes</p>
              </div>
              <span className="font-mono text-lg tabular-nums font-semibold">{formatElapsedTime(elapsedSeconds)}</span>
            </div>
          )}
          {!fetchingFromDune && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
              <Wifi className="w-5 h-5 animate-pulse text-muted-foreground" />
              <span className="font-medium text-muted-foreground">Loading saved data...</span>
            </div>
          )}
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
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
            <FullscreenTableTrigger onClick={() => setFullscreenOpen(true)} />
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

          <FullscreenTableDialog
            open={fullscreenOpen}
            onOpenChange={setFullscreenOpen}
            savedQueryId={id}
            userId={user.id}
            queryName={savedQuery?.name || "Transactions"}
            rows={rows}
            filteredRows={filteredRows}
            entities={entities}
            tags={tags}
            transactionAddresses={transactionAddresses}
            highlightMap={highlightMap}
            addressLabels={addressLabels}
            hiddenColumns={hiddenColumns}
            activeFilters={activeFilters}
            filterMode={filterMode}
            tagFilterMode={tagFilterMode}
            methodFilters={methodFilters}
            dateRange={dateRange}
            onHiddenColumnsChange={setHiddenColumns}
            onActiveFiltersChange={setActiveFilters}
            onFilterModeChange={setFilterMode}
            onTagFilterModeChange={setTagFilterMode}
            onMethodFiltersChange={setMethodFilters}
            onDateRangeChange={setDateRange}
          />

          {user && id && (
            <ViewEditor
              savedQueryId={id}
              userId={user.id}
              entities={entities}
              tags={tags}
              rows={rows}
              transactionAddresses={transactionAddresses}
              columns={ALL_COLUMNS.map(c => ({ key: c.key, label: c.label }))}
              hiddenColumns={hiddenColumns}
              activeFilters={activeFilters}
              filterMode={filterMode}
              tagFilterMode={tagFilterMode}
              methodFilters={methodFilters}
              dateRange={dateRange}
              totalRowCount={rows.length}
              filteredRowCount={filteredRows.length}
              onHiddenColumnsChange={setHiddenColumns}
              onActiveFiltersChange={setActiveFilters}
              onFilterModeChange={setFilterMode}
              onTagFilterModeChange={setTagFilterMode}
              onMethodFiltersChange={setMethodFilters}
              onDateRangeChange={setDateRange}
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
