import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TransactionDataTable, ALL_COLUMNS } from "@/components/transactions/TransactionDataTable";
import { TransactionBreakdownChart } from "@/components/transactions/TransactionBreakdownChart";
import { ViewEditor } from "@/components/transactions/ViewEditor";
import { FullscreenTableDialog } from "@/components/transactions/FullscreenTableDialog";
import { ArrowLeft, RefreshCw, Download, CheckCircle, Database, Calendar, FileText, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useEntitiesAndTags } from "@/hooks/useEntitiesAndTags";
import { useElapsedTimer } from "@/hooks/useElapsedTimer";
import { format } from "date-fns";
import type { 
  TransactionRow, 
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
  type DateRange,
} from "@/lib/transactionUtils";
import { formatNumber } from "@/lib/utils";
import { ApiStatusIndicator } from "@/components/shared/ApiStatusIndicator";
import { TransactionSkeletons } from "@/components/shared/LoadingSkeletons";

export default function SavedSearchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Use the shared hook for entities and tags
  const { entities, tags } = useEntitiesAndTags(user?.id);
  
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
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-5">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/queries")}
          className="gap-2 -ml-2 text-muted-foreground hover:text-foreground h-9"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Saved Data
        </Button>

        {savedQuery && (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight">{savedQuery.name}</h1>
            {savedQuery.description && (
              <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                {savedQuery.description}
              </p>
            )}

            {/* Metadata badges */}
            <div className="flex flex-wrap items-center gap-2.5">
              {savedQuery.wallet_address && (
                <div className="group inline-flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-md border border-border/40">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Wallet</span>
                  <a
                    href={`${ETHERSCAN_BASE}/address/${savedQuery.wallet_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground/80 hover:text-primary transition-colors"
                  >
                    {savedQuery.wallet_address}
                    <ExternalLink className="w-3 h-3 opacity-40" />
                  </a>
                  <button
                    onClick={handleCopyAddress}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
                  >
                    {addressCopied ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                </div>
              )}
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-md border border-border/40">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs">
                  Created {format(new Date(savedQuery.created_at), "MMMM do, yyyy")}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-md border border-border/40">
                <Database className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium tabular-nums">{formatNumber(rows.length)}</span>
                <span className="text-xs text-muted-foreground">transactions</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs h-8 px-3 border-border/50">
                Ethereum
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Loading State with Timer */}
      {loading && (
        <div className="space-y-4">
          <ApiStatusIndicator
            status={fetchingFromDune ? "fetching" : "connecting"}
            message={fetchingFromDune ? "Fetching from Dune API..." : "Loading saved data..."}
            elapsedSeconds={elapsedSeconds}
          />
          <TransactionSkeletons />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
          Error: {error}
        </div>
      )}

      {/* Results */}
      {!loading && !error && rows.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-1.5 pb-2 border-b border-border/40">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2.5 text-xs gap-1.5"
              onClick={() => setFullscreenOpen(true)}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Fullscreen
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Update
            </Button>
            {isSavedToDb ? (
              <Button 
                variant="ghost" 
                size="sm" 
                disabled 
                className="h-7 px-2.5 text-xs gap-1.5 text-green-600"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Saved
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSaveToDatabase} 
                disabled={saving} 
                className="h-7 px-2.5 text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save"}
              </Button>
            )}
          </div>

          {/* Chart */}
          <TransactionBreakdownChart
            rows={rows}
            entities={entities}
            tags={tags}
          />

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
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm mb-4">No transactions found for this search</p>
          <Button variant="outline" onClick={handleRefresh} className="gap-2 h-9">
            <RefreshCw className="w-4 h-4" />
            Fetch from Dune
          </Button>
        </div>
      )}
    </div>
  );
}
