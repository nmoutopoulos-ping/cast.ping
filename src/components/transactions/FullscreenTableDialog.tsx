import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Maximize2, Filter, Columns, Calendar, ChevronDown, Tag, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionDataTable, ALL_COLUMNS } from "./TransactionDataTable";
import { MethodFilters, DateRangeFilter, ColumnVisibility, TagRulesFilter, ViewsDropdown } from "./filters";
import type { 
  TransactionRow, 
  Entity, 
  DbTag, 
  ActiveFilter, 
  FilterMode, 
  MethodType, 
  SavedView 
} from "@/types/transactions";
import type { DateRange } from "@/lib/transactionUtils";
import { toast } from "sonner";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface FullscreenTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedQueryId: string;
  userId: string;
  queryName: string;
  rows: TransactionRow[];
  filteredRows: TransactionRow[];
  entities: Entity[];
  tags: DbTag[];
  transactionAddresses: Set<string>;
  highlightMap: Record<string, string>;
  addressLabels: { address: string; name: string; color: string; type: "entity" | "tag" }[];
  hiddenColumns: Set<string>;
  activeFilters: ActiveFilter[];
  filterMode: FilterMode;
  tagFilterMode: FilterMode;
  methodFilters: MethodType[];
  dateRange: DateRange;
  onHiddenColumnsChange: (columns: Set<string>) => void;
  onActiveFiltersChange: (filters: ActiveFilter[]) => void;
  onFilterModeChange: (mode: FilterMode) => void;
  onTagFilterModeChange: (mode: FilterMode) => void;
  onMethodFiltersChange: (methods: MethodType[]) => void;
  onDateRangeChange: (range: DateRange) => void;
  explorerBaseUrl?: string;
}

export function FullscreenTableDialog({
  open,
  onOpenChange,
  savedQueryId,
  userId,
  queryName,
  rows,
  filteredRows,
  entities,
  tags,
  transactionAddresses,
  highlightMap,
  addressLabels,
  hiddenColumns,
  activeFilters,
  filterMode,
  tagFilterMode,
  methodFilters,
  dateRange,
  onHiddenColumnsChange,
  onActiveFiltersChange,
  onFilterModeChange,
  onTagFilterModeChange,
  onMethodFiltersChange,
  onDateRangeChange,
  explorerBaseUrl,
}: FullscreenTableDialogProps) {
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const matchedEntities = entities.filter(
    (e) => e.wallet_address && transactionAddresses.has(e.wallet_address.toLowerCase())
  );
  const matchedTags = tags.filter(
    (t) => t.contract_address && transactionAddresses.has(t.contract_address.toLowerCase())
  );

  const isEntityActive = (id: string) => activeFilters.some((f) => f.type === "entity" && f.id === id);
  const isTagActive = (id: string) => activeFilters.some((f) => f.type === "tag" && f.id === id);

  const handleEntityClick = (entity: Entity) => {
    if (!entity.wallet_address) return;
    if (isEntityActive(entity.id)) {
      onActiveFiltersChange(activeFilters.filter((f) => !(f.type === "entity" && f.id === entity.id)));
    } else {
      onActiveFiltersChange([
        ...activeFilters,
        { type: "entity", id: entity.id, address: entity.wallet_address.toLowerCase(), color: entity.color },
      ]);
    }
  };

  const handleTagClick = (tag: DbTag) => {
    if (!tag.contract_address) return;
    if (isTagActive(tag.id)) {
      onActiveFiltersChange(activeFilters.filter((f) => !(f.type === "tag" && f.id === tag.id)));
    } else {
      onActiveFiltersChange([
        ...activeFilters,
        { type: "tag", id: tag.id, address: tag.contract_address.toLowerCase(), color: tag.color },
      ]);
    }
  };

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

  const columns = ALL_COLUMNS.map((c) => ({ key: c.key, label: c.label }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] p-0 gap-0 flex flex-col bg-background">
        <VisuallyHidden>
          <DialogTitle>Transaction Data - {queryName}</DialogTitle>
          <DialogDescription>Full screen view of transaction data with filters</DialogDescription>
        </VisuallyHidden>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">{queryName}</h2>
            <Badge variant="secondary" className="font-mono text-xs">
              {filteredRows.length} of {rows.length} transactions
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn("gap-2", showFilters && "bg-muted")}
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={cn("w-3 h-3 transition-transform", showFilters && "rotate-180")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Dynamic Filter Panel */}
        {showFilters && (
          <div className="px-6 py-4 border-b bg-muted/30 space-y-4 shrink-0">
            {/* Row 1: Entities and Tags as cards */}
            <div className="grid grid-cols-2 gap-6">
              {/* Entities Card */}
              <div className="bg-card rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  Entities
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {matchedEntities.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {matchedEntities.length > 0 ? (
                    matchedEntities.map((entity) => {
                      const isActive = isEntityActive(entity.id);
                      return (
                        <button
                          key={entity.id}
                          onClick={() => handleEntityClick(entity)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                            isActive ? "shadow-md ring-1 ring-black/10" : "hover:scale-105"
                          )}
                          style={{
                            backgroundColor: isActive ? entity.color : `${entity.color}20`,
                            color: isActive ? "#fff" : entity.color,
                          }}
                        >
                          {entity.name}
                          {isActive && <X className="w-3 h-3" />}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No matching entities</span>
                  )}
                </div>
              </div>

              {/* Tags Card */}
              <div className="bg-card rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  Tags
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {matchedTags.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {matchedTags.length > 0 ? (
                    matchedTags.map((tag) => {
                      const isActive = isTagActive(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => handleTagClick(tag)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                            isActive ? "shadow-md ring-1 ring-black/10" : "hover:scale-105"
                          )}
                          style={{
                            backgroundColor: isActive ? tag.color : `${tag.color}20`,
                            color: isActive ? "#fff" : tag.color,
                          }}
                        >
                          {tag.name}
                          {isActive && <X className="w-3 h-3" />}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No matching tags</span>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Method filters and controls */}
            <div className="flex items-center justify-between gap-4">
              <MethodFilters
                rows={rows}
                methodFilters={methodFilters}
                onMethodFiltersChange={onMethodFiltersChange}
              />

              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-destructive gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear All
                  </Button>
                )}

                <div className="w-px h-6 bg-border" />

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
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <TransactionDataTable
            rows={filteredRows}
            highlightMap={highlightMap}
            addressLabels={addressLabels}
            hiddenColumns={hiddenColumns}
            tags={tags}
            explorerBaseUrl={explorerBaseUrl}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Trigger button component
export function FullscreenTableTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="gap-2">
      <Maximize2 className="w-4 h-4" />
      Fullscreen
    </Button>
  );
}
