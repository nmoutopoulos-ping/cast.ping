import { useState } from "react";
import { toast } from "sonner";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MethodFilters,
  EntityTagFilters,
  DateRangeFilter,
  ColumnVisibility,
  TagRulesFilter,
  ViewsDropdown,
} from "./filters";
import type { Entity, DbTag, ActiveFilter, SavedView, FilterMode, TransactionRow, MethodType } from "@/types/transactions";
import type { DateRange } from "@/lib/transactionUtils";

interface ColumnDef {
  key: string;
  label: string;
}

interface ViewEditorProps {
  savedQueryId: string;
  userId: string;
  entities: Entity[];
  tags: DbTag[];
  rows: TransactionRow[];
  transactionAddresses: Set<string>;
  columns: ColumnDef[];
  hiddenColumns: Set<string>;
  activeFilters: ActiveFilter[];
  filterMode: FilterMode;
  tagFilterMode: FilterMode;
  methodFilters: MethodType[];
  dateRange: DateRange;
  totalRowCount: number;
  filteredRowCount: number;
  onHiddenColumnsChange: (columns: Set<string>) => void;
  onActiveFiltersChange: (filters: ActiveFilter[]) => void;
  onFilterModeChange: (mode: FilterMode) => void;
  onTagFilterModeChange: (mode: FilterMode) => void;
  onMethodFiltersChange: (methods: MethodType[]) => void;
  onDateRangeChange: (range: DateRange) => void;
}

export function ViewEditor({
  savedQueryId,
  userId,
  entities,
  tags,
  rows,
  transactionAddresses,
  columns,
  hiddenColumns,
  activeFilters,
  filterMode,
  tagFilterMode,
  methodFilters,
  dateRange,
  totalRowCount,
  filteredRowCount,
  onHiddenColumnsChange,
  onActiveFiltersChange,
  onFilterModeChange,
  onTagFilterModeChange,
  onMethodFiltersChange,
  onDateRangeChange,
}: ViewEditorProps) {
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);

  const handleViewLoad = (view: SavedView) => {
    onHiddenColumnsChange(new Set(view.hidden_columns));
    onActiveFiltersChange(view.active_filters);
    onFilterModeChange(view.filter_mode);
    onTagFilterModeChange(view.tag_filter_mode);
    onMethodFiltersChange((view.method_filters || []) as MethodType[]);
    setCurrentViewId(view.id);
    toast.success(`Loaded view: ${view.name}`);
  };

  const hasActiveFilters = activeFilters.length > 0 || methodFilters.length > 0 || dateRange.start || dateRange.end;

  const clearAllFilters = () => {
    onActiveFiltersChange([]);
    onMethodFiltersChange([]);
    onDateRangeChange({ start: null, end: null });
  };

  return (
    <div className="space-y-3">
      {/* Primary toolbar row */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: Method filters */}
        <div className="flex items-center gap-2">
          <MethodFilters
            rows={rows}
            methodFilters={methodFilters}
            onMethodFiltersChange={onMethodFiltersChange}
          />
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          <TagRulesFilter
            activeFilters={activeFilters}
            tagFilterMode={tagFilterMode}
            onTagFilterModeChange={onTagFilterModeChange}
          />

          <div className="w-px h-6 bg-border" />

          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />

          <ColumnVisibility
            columns={columns}
            hiddenColumns={hiddenColumns}
            onHiddenColumnsChange={onHiddenColumnsChange}
          />

          <div className="w-px h-6 bg-border" />

          <ViewsDropdown
            savedQueryId={savedQueryId}
            userId={userId}
            hiddenColumns={hiddenColumns}
            activeFilters={activeFilters}
            filterMode={filterMode}
            tagFilterMode={tagFilterMode}
            methodFilters={methodFilters}
            currentViewId={currentViewId}
            onViewLoad={handleViewLoad}
            onCurrentViewIdChange={setCurrentViewId}
          />
        </div>
      </div>

      {/* Secondary row: Entity/Tag filters + filter status */}
      <div className="flex items-center justify-between gap-4 py-2 px-3 bg-muted/30 rounded-lg border border-border/40">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-xs font-medium uppercase tracking-wide">Filters</span>
          </div>
          
          <div className="w-px h-5 bg-border/60" />
          
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <EntityTagFilters
              entities={entities}
              tags={tags}
              transactionAddresses={transactionAddresses}
              activeFilters={activeFilters}
              onActiveFiltersChange={onActiveFiltersChange}
            />
          </div>
        </div>

        {/* Filter status */}
        <div className="flex items-center gap-3 shrink-0">
          {hasActiveFilters && (
            <>
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">
                  {filteredRowCount.toLocaleString()}
                </span>
                <span className="mx-1">of</span>
                <span className="tabular-nums">{totalRowCount.toLocaleString()}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
