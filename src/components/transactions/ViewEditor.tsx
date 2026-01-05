import { useState, useEffect, useMemo } from "react";
import { Building2, Tag, X, Columns, Save, ChevronDown, Trash2, Check, Filter, ArrowLeftRight, Flame, Sparkles, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Entity, DbTag, ActiveFilter, SavedView, FilterMode, TransactionRow, MethodType } from "@/types/transactions";

interface ColumnDef {
  key: string;
  label: string;
}

interface DateRange {
  start: Date | null;
  end: Date | null;
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
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [saving, setSaving] = useState(false);

  // Calculate method counts from rows
  const methodCounts = useMemo(() => {
    const counts = { transfer: 0, mint: 0, burn: 0 };
    rows.forEach((row) => {
      const method = row.method?.toLowerCase() || "";
      if (method.includes("transfer")) counts.transfer++;
      else if (method.includes("mint")) counts.mint++;
      else if (method.includes("burn")) counts.burn++;
    });
    return counts;
  }, [rows]);

  const isMethodActive = (method: MethodType) => methodFilters.includes(method);

  const toggleMethodFilter = (method: MethodType) => {
    if (isMethodActive(method)) {
      onMethodFiltersChange(methodFilters.filter((m) => m !== method));
    } else {
      onMethodFiltersChange([...methodFilters, method]);
    }
    setCurrentViewId(null);
  };

  const matchedEntities = entities.filter(
    (e) => e.wallet_address && transactionAddresses.has(e.wallet_address.toLowerCase())
  );
  const matchedTags = tags.filter(
    (t) => t.contract_address && transactionAddresses.has(t.contract_address.toLowerCase())
  );

  useEffect(() => {
    fetchSavedViews();
  }, [savedQueryId, userId]);

  const fetchSavedViews = async () => {
    const { data } = await (supabase
      .from("saved_views" as "tags")
      .select("*")
      .eq("saved_query_id" as "name", savedQueryId)
      .eq("user_id", userId)
      .order("name") as unknown as Promise<{ data: Array<{ id: string; name: string; hidden_columns: string[]; active_filters: unknown; filter_mode?: string; tag_filter_mode?: string; method_filters?: string[] }> | null }>);

    if (data) {
      setSavedViews(
        data.map((v) => ({
          id: v.id,
          name: v.name,
          hidden_columns: v.hidden_columns || [],
          active_filters: (v.active_filters as ActiveFilter[]) || [],
          filter_mode: (v.filter_mode as FilterMode) || "any",
          tag_filter_mode: (v.tag_filter_mode as FilterMode) || "any",
          method_filters: (v.method_filters as MethodType[]) || [],
        }))
      );
    }
  };

  const toggleColumn = (key: string) => {
    const next = new Set(hiddenColumns);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onHiddenColumnsChange(next);
    setCurrentViewId(null);
  };

  const isEntityActive = (entityId: string) =>
    activeFilters.some((f) => f.type === "entity" && f.id === entityId);

  const isTagActive = (tagId: string) =>
    activeFilters.some((f) => f.type === "tag" && f.id === tagId);

  const handleEntityClick = (entity: Entity) => {
    if (!entity.wallet_address) return;

    if (isEntityActive(entity.id)) {
      onActiveFiltersChange(activeFilters.filter((f) => !(f.type === "entity" && f.id === entity.id)));
    } else {
      onActiveFiltersChange([
        ...activeFilters,
        {
          type: "entity",
          id: entity.id,
          address: entity.wallet_address.toLowerCase(),
          color: entity.color,
        },
      ]);
    }
    setCurrentViewId(null);
  };

  const handleTagClick = (tag: DbTag) => {
    if (!tag.contract_address) return;

    if (isTagActive(tag.id)) {
      onActiveFiltersChange(activeFilters.filter((f) => !(f.type === "tag" && f.id === tag.id)));
    } else {
      onActiveFiltersChange([
        ...activeFilters,
        {
          type: "tag",
          id: tag.id,
          address: tag.contract_address.toLowerCase(),
          color: tag.color,
        },
      ]);
    }
    setCurrentViewId(null);
  };

  const loadView = (view: SavedView) => {
    onHiddenColumnsChange(new Set(view.hidden_columns));
    onActiveFiltersChange(view.active_filters);
    onFilterModeChange(view.filter_mode);
    onTagFilterModeChange(view.tag_filter_mode);
    onMethodFiltersChange((view.method_filters || []) as MethodType[]);
    setCurrentViewId(view.id);
    toast.success(`Loaded view: ${view.name}`);
  };

  const handleSaveView = async () => {
    if (!newViewName.trim()) return;
    setSaving(true);

    const { data, error } = await (supabase
      .from("saved_views" as "tags")
      .insert({
        saved_query_id: savedQueryId,
        user_id: userId,
        name: newViewName.trim(),
        hidden_columns: Array.from(hiddenColumns),
        active_filters: activeFilters,
        filter_mode: filterMode,
        tag_filter_mode: tagFilterMode,
        method_filters: methodFilters,
      } as unknown as { name: string; user_id: string })
      .select()
      .single() as unknown as Promise<{ data: { id: string; name: string; hidden_columns: string[]; active_filters: ActiveFilter[]; filter_mode: string; tag_filter_mode: string; method_filters: string[] } | null; error: Error | null }>);

    if (error) {
      toast.error("Failed to save view");
    } else if (data) {
      setSavedViews((prev) => [
        ...prev,
        {
          id: data.id,
          name: data.name,
          hidden_columns: data.hidden_columns || [],
          active_filters: data.active_filters || [],
          filter_mode: (data.filter_mode as FilterMode) || "any",
          tag_filter_mode: (data.tag_filter_mode as FilterMode) || "any",
          method_filters: (data.method_filters as MethodType[]) || [],
        },
      ]);
      setCurrentViewId(data.id);
      toast.success("View saved!");
    }

    setSaving(false);
    setSaveDialogOpen(false);
    setNewViewName("");
  };

  const handleUpdateView = async (viewId: string) => {
    const { error } = await (supabase
      .from("saved_views" as "tags")
      .update({
        hidden_columns: Array.from(hiddenColumns),
        active_filters: activeFilters,
        filter_mode: filterMode,
        tag_filter_mode: tagFilterMode,
        method_filters: methodFilters,
      } as unknown as { name: string })
      .eq("id", viewId) as unknown as Promise<{ error: Error | null }>);

    if (error) {
      toast.error("Failed to update view");
    } else {
      setSavedViews((prev) =>
        prev.map((v) =>
          v.id === viewId
            ? { ...v, hidden_columns: Array.from(hiddenColumns), active_filters: activeFilters, filter_mode: filterMode, tag_filter_mode: tagFilterMode, method_filters: methodFilters }
            : v
        )
      );
      setCurrentViewId(viewId);
      toast.success("View updated!");
    }
  };

  const handleDeleteView = async (viewId: string) => {
    const { error } = await (supabase
      .from("saved_views" as "tags")
      .delete()
      .eq("id", viewId) as unknown as Promise<{ error: Error | null }>);

    if (error) {
      toast.error("Failed to delete view");
    } else {
      setSavedViews((prev) => prev.filter((v) => v.id !== viewId));
      if (currentViewId === viewId) setCurrentViewId(null);
      toast.success("View deleted");
    }
  };

  const currentView = savedViews.find((v) => v.id === currentViewId);
  const hasMatchedActors = matchedEntities.length > 0 || matchedTags.length > 0;
  
  const activeEntityFilters = activeFilters.filter((f) => f.type === "entity");
  const activeTagFilters = activeFilters.filter((f) => f.type === "tag");
  const hasMultipleTags = activeTagFilters.length >= 2;

  const hasAnyMethodTransactions = methodCounts.transfer > 0 || methodCounts.mint > 0 || methodCounts.burn > 0;

  return (
    <div className="space-y-3">
      {/* Method filter tabs */}
      {hasAnyMethodTransactions && (
        <div className="flex items-center gap-2">
          {methodCounts.transfer > 0 && (
            <button
              onClick={() => toggleMethodFilter("transfer")}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                isMethodActive("transfer")
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground"
              )}
            >
              <ArrowLeftRight className="w-4 h-4" />
              Transfers
              <Badge variant={isMethodActive("transfer") ? "secondary" : "outline"} className="text-xs px-1.5 py-0">
                {methodCounts.transfer}
              </Badge>
              {isMethodActive("transfer") && <X className="w-3 h-3 ml-1" />}
            </button>
          )}
          {methodCounts.mint > 0 && (
            <button
              onClick={() => toggleMethodFilter("mint")}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                isMethodActive("mint")
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Mints
              <Badge variant={isMethodActive("mint") ? "secondary" : "outline"} className="text-xs px-1.5 py-0">
                {methodCounts.mint}
              </Badge>
              {isMethodActive("mint") && <X className="w-3 h-3 ml-1" />}
            </button>
          )}
          {methodCounts.burn > 0 && (
            <button
              onClick={() => toggleMethodFilter("burn")}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                isMethodActive("burn")
                  ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                  : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground"
              )}
            >
              <Flame className="w-4 h-4" />
              Burns
              <Badge variant={isMethodActive("burn") ? "secondary" : "outline"} className="text-xs px-1.5 py-0">
                {methodCounts.burn}
              </Badge>
              {isMethodActive("burn") && <X className="w-3 h-3 ml-1" />}
            </button>
          )}
        </div>
      )}

      {/* Main control bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/30 rounded-lg border border-border/50">
        {/* Left: Entity/Tag filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {matchedEntities.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-medium">Entities:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {matchedEntities.map((entity) => {
                  const isActive = isEntityActive(entity.id);
                  return (
                    <button
                      key={entity.id}
                      onClick={() => handleEntityClick(entity)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                        isActive ? "shadow-sm ring-2 ring-offset-1" : "hover:opacity-80"
                      )}
                      style={{
                        backgroundColor: isActive ? entity.color : `${entity.color}20`,
                        borderColor: entity.color,
                        color: isActive ? "#fff" : entity.color,
                      }}
                    >
                      {entity.name}
                      {isActive && <X className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {matchedEntities.length > 0 && matchedTags.length > 0 && (
            <div className="w-px h-6 bg-border/60" />
          )}

          {matchedTags.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Tag className="w-4 h-4" />
                <span className="text-xs font-medium">Tags:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {matchedTags.map((tag) => {
                  const isActive = isTagActive(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleTagClick(tag)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                        isActive ? "shadow-sm ring-2 ring-offset-1" : "hover:opacity-80"
                      )}
                      style={{
                        backgroundColor: isActive ? tag.color : `${tag.color}20`,
                        borderColor: tag.color,
                        color: isActive ? "#fff" : tag.color,
                      }}
                    >
                      {tag.name}
                      {isActive && <X className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!hasMatchedActors && (
            <span className="text-xs text-muted-foreground">No matching entities or tags found</span>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {filteredRowCount.toLocaleString()} of {totalRowCount.toLocaleString()}
              </span>
              <span className="text-muted-foreground/60">•</span>
              <span>{activeFilters.length} filter{activeFilters.length > 1 ? "s" : ""}</span>
            </div>
          )}

          {hasMultipleTags && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Tag Rules
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 uppercase">
                    {tagFilterMode}
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-3">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">When filtering by tags:</p>
                    <p className="text-[10px] text-muted-foreground/70">
                      {activeEntityFilters.length > 0 
                        ? "Entities must all match. Tags use the rule below:"
                        : "Apply the following rule to selected tags:"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                      <input
                        type="radio"
                        name="tagFilterMode"
                        checked={tagFilterMode === "any"}
                        onChange={() => onTagFilterModeChange("any")}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium">Any tag (OR)</span>
                        <p className="text-xs text-muted-foreground">Show if 1+ selected tags are present</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                      <input
                        type="radio"
                        name="tagFilterMode"
                        checked={tagFilterMode === "all"}
                        onChange={() => onTagFilterModeChange("all")}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium">All tags (AND)</span>
                        <p className="text-xs text-muted-foreground">Show only if all selected tags are present</p>
                      </div>
                    </label>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "gap-2",
                  (dateRange.start || dateRange.end) && "border-primary text-primary"
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                {dateRange.start || dateRange.end ? (
                  <span className="text-xs">
                    {dateRange.start ? format(dateRange.start, "MMM d") : "Start"} 
                    {" – "} 
                    {dateRange.end ? format(dateRange.end, "MMM d") : "End"}
                  </span>
                ) : (
                  "Date Range"
                )}
                {(dateRange.start || dateRange.end) && (
                  <X 
                    className="w-3 h-3 ml-1 hover:text-destructive" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDateRangeChange({ start: null, end: null });
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <div className="flex flex-col sm:flex-row">
                <div className="p-3 border-b sm:border-b-0 sm:border-r border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Start Date</p>
                  <Calendar
                    mode="single"
                    selected={dateRange.start || undefined}
                    onSelect={(date) => onDateRangeChange({ ...dateRange, start: date || null })}
                    initialFocus
                    className="p-0 pointer-events-auto"
                  />
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2 px-1">End Date</p>
                  <Calendar
                    mode="single"
                    selected={dateRange.end || undefined}
                    onSelect={(date) => onDateRangeChange({ ...dateRange, end: date || null })}
                    disabled={(date) => dateRange.start ? date < dateRange.start : false}
                    className="p-0 pointer-events-auto"
                  />
                </div>
              </div>
              {(dateRange.start || dateRange.end) && (
                <div className="border-t border-border p-2 flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onDateRangeChange({ start: null, end: null })}
                    className="text-xs"
                  >
                    Clear dates
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Columns className="w-4 h-4" />
                Columns
                {hiddenColumns.size > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {columns.length - hiddenColumns.size}/{columns.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2 max-h-80 overflow-y-auto">
              <div className="space-y-1">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={!hiddenColumns.has(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {currentView ? currentView.name : "Views"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {savedViews.length > 0 ? (
                <>
                  {savedViews.map((view) => (
                    <DropdownMenuItem
                      key={view.id}
                      className="flex items-center justify-between group"
                    >
                      <button
                        className="flex-1 text-left flex items-center gap-2"
                        onClick={() => loadView(view)}
                      >
                        {currentViewId === view.id && <Check className="w-3 h-3" />}
                        <span className={cn(currentViewId !== view.id && "ml-5")}>{view.name}</span>
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateView(view.id);
                          }}
                          className="p-1 hover:bg-muted rounded"
                          title="Update view with current settings"
                        >
                          <Save className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteView(view.id);
                          }}
                          className="p-1 hover:bg-muted rounded"
                          title="Delete view"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
                <Save className="w-4 h-4 mr-2" />
                Save current as new view
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Save View Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
            <DialogDescription>
              Save the current column visibility and filter settings as a named view.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="View name..."
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveView()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveView} disabled={!newViewName.trim() || saving}>
              {saving ? "Saving..." : "Save View"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
