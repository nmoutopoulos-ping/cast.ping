import { useState } from "react";
import { toast } from "sonner";
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

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/30 rounded-lg border border-border/50">
      {/* Left: Method filters + Entity/Tag filters */}
      <div className="flex flex-wrap items-center gap-3 flex-1">
        <MethodFilters
          rows={rows}
          methodFilters={methodFilters}
          onMethodFiltersChange={onMethodFiltersChange}
        />

        <EntityTagFilters
          entities={entities}
          tags={tags}
          transactionAddresses={transactionAddresses}
          activeFilters={activeFilters}
          onActiveFiltersChange={onActiveFiltersChange}
        />
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {filteredRowCount.toLocaleString()} of {totalRowCount.toLocaleString()}
            </span>
          </div>
        )}

        <TagRulesFilter
          activeFilters={activeFilters}
          tagFilterMode={tagFilterMode}
          onTagFilterModeChange={onTagFilterModeChange}
        />

        <DateRangeFilter
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
        />

        <ColumnVisibility
          columns={columns}
          hiddenColumns={hiddenColumns}
          onHiddenColumnsChange={onHiddenColumnsChange}
        />

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
  );
}
