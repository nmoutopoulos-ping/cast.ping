import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransactionDataTable, ALL_COLUMNS } from "@/components/transactions/TransactionDataTable";
import { TransactionBreakdownChart } from "@/components/transactions/TransactionBreakdownChart";
import { FullscreenTableDialog } from "@/components/transactions/FullscreenTableDialog";
import { ViewEditor } from "@/components/transactions/ViewEditor";
import { ApiStatusIndicator, type ApiStatus } from "@/components/shared/ApiStatusIndicator";
import { TransactionSkeletons } from "@/components/shared/LoadingSkeletons";
import { useAuth } from "@/hooks/useAuth";
import { useElapsedTimer } from "@/hooks/useElapsedTimer";
import { toast } from "sonner";
import type {
  TransactionRow,
  Entity,
  DbTag,
  ActiveFilter,
  FilterMode,
  MethodType,
  ApiStatusInfo,
} from "@/types/transactions";
import { getExplorerBaseUrl } from "@/types/transactions";
import {
  applyAllFilters,
  fetchEntitiesAndTags,
  buildAddressLabels,
  extractAddressesFromRows,
  mapDuneRowToTransactionRow,
  type DateRange,
} from "@/lib/transactionUtils";
import { formatNumber } from "@/lib/utils";

// Use a subset of columns relevant for sandbox datasets
const SANDBOX_COLUMNS = ALL_COLUMNS
  .filter(col => ["timestamp", "method", "from_address", "interacted_with", "token_amount", "token_symbol", "value_eth", "txn_fee_eth", "block", "transaction_hash"].includes(col.key))
  .map(col => ({ key: col.key, label: col.label }));

export default function SandboxViewer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const address = searchParams.get("address") || "";
  const queryId = searchParams.get("queryId") || "";
  const name = searchParams.get("name") || "Sandbox Dataset";
  
  // Determine explorer URL based on query ID
  const explorerBaseUrl = getExplorerBaseUrl(undefined, queryId);

  // Data state
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [tags, setTags] = useState<DbTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatusInfo>({ status: "idle", message: "" });

  // Saved query ID (metadata only) so Views work without persisting the dataset rows.
  const [savedQueryId, setSavedQueryId] = useState<string>("");

  // View state
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("any");
  const [tagFilterMode, setTagFilterMode] = useState<FilterMode>("any");
  const [methodFilters, setMethodFilters] = useState<MethodType[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const isTimerActive = ["connecting", "fetching", "processing"].includes(apiStatus.status);
  const elapsedSeconds = useElapsedTimer(apiStatus.startTime, isTimerActive);

  // Fetch entities and tags on mount
  useEffect(() => {
    if (user) {
      fetchEntitiesAndTags().then(({ entities: e, tags: t }) => {
        setEntities(e);
        setTags(t);
      });
    }
  }, [user]);

  // Ensure a saved query exists (metadata only) so saved views work for this sandbox dataset.
  // Sandbox entries use user_id = null so they don't appear in user's saved data list.
  useEffect(() => {
    const ensureSavedQuery = async () => {
      if (!queryId) return;

      // Look for existing sandbox entry (user_id is null for sandbox datasets)
      const { data: existing, error: selectError } = await supabase
        .from("saved_queries")
        .select("id")
        .is("user_id", null)
        .eq("dune_query_id", queryId)
        .eq("wallet_address", address)
        .limit(1);

      if (selectError) return;

      const existingId = existing?.[0]?.id;
      if (existingId) {
        setSavedQueryId(existingId);
        return;
      }

      // Create sandbox entry without user_id so it stays separate from user saves
      const { data: created, error: insertError } = await supabase
        .from("saved_queries")
        .insert({
          user_id: null, // Sandbox datasets have no owner
          name,
          description: "Sandbox dataset",
          dune_query_id: queryId,
          wallet_address: address,
          search_type: "token",
        })
        .select("id")
        .single();

      if (!insertError && created?.id) {
        setSavedQueryId(created.id);
      }
    };

    ensureSavedQuery();
  }, [queryId, address, name]);

  // Fetch cached results on mount
  useEffect(() => {
    if (queryId) {
      fetchCachedResults();
    }
  }, [queryId]);


  const fetchCachedResults = async () => {
    setLoading(true);
    setError(null);
    const startTime = Date.now();

    setApiStatus({ status: "connecting", message: "Connecting to Dune API...", startTime });

    try {
      setApiStatus({ status: "fetching", message: `Fetching cached results...`, startTime });

      const { data, error: invokeError } = await supabase.functions.invoke("dune-query", {
        body: { queryId, mode: "results", parameters: { limit: 10000 } },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setApiStatus({ status: "processing", message: "Processing transaction data...", startTime });

      const rawRows = data?.result?.rows || [];
      const mappedRows = rawRows.map(mapDuneRowToTransactionRow);

      setRows(mappedRows);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      setApiStatus({
        status: "complete",
        message: `Loaded ${formatNumber(mappedRows.length)} transactions in ${elapsed}s`,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch data";
      setError(errorMsg);
      setApiStatus({ status: "error", message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // Apply all filters to rows
  const filteredRows = useMemo(() => {
    return applyAllFilters(rows, {
      activeFilters,
      filterMode,
      tagFilterMode,
      methodFilters,
      dateRange,
    });
  }, [rows, activeFilters, filterMode, tagFilterMode, methodFilters, dateRange]);

  // Extract addresses for entity/tag matching
  const transactionAddresses = useMemo(() => extractAddressesFromRows(rows), [rows]);
  const addressLabels = useMemo(() => buildAddressLabels(entities, tags), [entities, tags]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/queries")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-muted-foreground" />
            <div>
              <h1 className="text-xl font-semibold">{name}</h1>
              <p className="text-sm text-muted-foreground">
                Sandbox dataset • Read-only exploration
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchCachedResults} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setFullscreenOpen(true)}>
            Fullscreen
          </Button>
        </div>
      </div>

      {/* Metadata badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="px-3 py-2 bg-muted/40 rounded-md border border-border/40">
          <span className="text-xs text-muted-foreground mr-2">Contract</span>
          <span className="font-mono text-sm">
            {address.slice(0, 10)}...{address.slice(-8)}
          </span>
        </div>
        <div className="px-3 py-2 bg-muted/40 rounded-md border border-border/40">
          <span className="text-xs text-muted-foreground mr-2">Query ID</span>
          <span className="font-mono text-sm">{queryId}</span>
        </div>
        <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 bg-amber-500/5">
          Token Dataset
        </Badge>
        {rows.length > 0 && (
          <Badge variant="secondary" className="gap-1">
            {formatNumber(rows.length)} transactions
          </Badge>
        )}
      </div>

      {/* API Status */}
      <ApiStatusIndicator
        status={apiStatus.status}
        message={apiStatus.message}
        elapsedSeconds={elapsedSeconds}
      />

      {/* Loading State */}
      {loading && <TransactionSkeletons />}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          Error: {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && rows.length > 0 && (
        <>
          {/* Chart */}
          <TransactionBreakdownChart rows={filteredRows} entities={entities} tags={tags} />

          {/* View Editor - local only, no persistence */}
          <ViewEditor
            savedQueryId="sandbox" // Placeholder - views won't persist
            userId={user?.id || ""}
            entities={entities}
            tags={tags}
            rows={rows}
            transactionAddresses={transactionAddresses}
            columns={SANDBOX_COLUMNS}
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

          {/* Data Table */}
          <TransactionDataTable
            rows={filteredRows}
            tags={tags}
            hiddenColumns={hiddenColumns}
            addressLabels={addressLabels}
            explorerBaseUrl={explorerBaseUrl}
          />

          {/* Fullscreen Dialog */}
          <FullscreenTableDialog
            open={fullscreenOpen}
            onOpenChange={setFullscreenOpen}
            savedQueryId="sandbox"
            userId={user?.id || ""}
            queryName={name}
            rows={rows}
            filteredRows={filteredRows}
            entities={entities}
            tags={tags}
            transactionAddresses={transactionAddresses}
            highlightMap={{}}
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
            explorerBaseUrl={explorerBaseUrl}
          />
        </>
      )}

      {/* Empty State */}
      {!loading && !error && rows.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-description">No transactions found for this dataset</p>
          <Button variant="outline" onClick={fetchCachedResults} className="gap-2 mt-4">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
