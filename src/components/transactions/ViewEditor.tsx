import { useState, useEffect } from "react";
import { Building2, Tag, X, Columns, Save, ChevronDown, Trash2, Check, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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

interface Entity {
  id: string;
  name: string;
  wallet_address: string | null;
  color: string;
}

interface DbTag {
  id: string;
  name: string;
  color: string;
  contract_address: string | null;
}

interface ActiveFilter {
  type: "entity" | "tag";
  id: string;
  address: string;
  color: string;
}

interface SavedView {
  id: string;
  name: string;
  hidden_columns: string[];
  active_filters: ActiveFilter[];
  filter_mode: FilterMode;
}

interface ColumnDef {
  key: string;
  label: string;
}

type FilterMode = "any" | "all";

interface ViewEditorProps {
  savedQueryId: string;
  userId: string;
  entities: Entity[];
  tags: DbTag[];
  transactionAddresses: Set<string>;
  columns: ColumnDef[];
  hiddenColumns: Set<string>;
  activeFilters: ActiveFilter[];
  filterMode: FilterMode;
  onHiddenColumnsChange: (columns: Set<string>) => void;
  onActiveFiltersChange: (filters: ActiveFilter[]) => void;
  onFilterModeChange: (mode: FilterMode) => void;
}

export function ViewEditor({
  savedQueryId,
  userId,
  entities,
  tags,
  transactionAddresses,
  columns,
  hiddenColumns,
  activeFilters,
  filterMode,
  onHiddenColumnsChange,
  onActiveFiltersChange,
  onFilterModeChange,
}: ViewEditorProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [saving, setSaving] = useState(false);

  // Find matched entities/tags in transaction data
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
    // Use type assertion as saved_views table was just created
    const { data } = await (supabase
      .from("saved_views" as "tags")
      .select("*")
      .eq("saved_query_id" as "name", savedQueryId)
      .eq("user_id", userId)
      .order("name") as unknown as Promise<{ data: Array<{ id: string; name: string; hidden_columns: string[]; active_filters: unknown; filter_mode?: string }> | null }>);

    if (data) {
      setSavedViews(
        data.map((v) => ({
          id: v.id,
          name: v.name,
          hidden_columns: v.hidden_columns || [],
          active_filters: (v.active_filters as ActiveFilter[]) || [],
          filter_mode: (v.filter_mode as FilterMode) || "any",
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
    setCurrentViewId(null); // Mark as modified
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
    setCurrentViewId(view.id);
    toast.success(`Loaded view: ${view.name}`);
  };

  const handleSaveView = async () => {
    if (!newViewName.trim()) return;
    setSaving(true);

    // Use type assertion as saved_views table was just created
    const { data, error } = await (supabase
      .from("saved_views" as "tags")
      .insert({
        saved_query_id: savedQueryId,
        user_id: userId,
        name: newViewName.trim(),
        hidden_columns: Array.from(hiddenColumns),
        active_filters: activeFilters,
        filter_mode: filterMode,
      } as unknown as { name: string; user_id: string })
      .select()
      .single() as unknown as Promise<{ data: { id: string; name: string; hidden_columns: string[]; active_filters: ActiveFilter[]; filter_mode: string } | null; error: Error | null }>);

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
      } as unknown as { name: string })
      .eq("id", viewId) as unknown as Promise<{ error: Error | null }>);

    if (error) {
      toast.error("Failed to update view");
    } else {
      setSavedViews((prev) =>
        prev.map((v) =>
          v.id === viewId
            ? { ...v, hidden_columns: Array.from(hiddenColumns), active_filters: activeFilters, filter_mode: filterMode }
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

  return (
    <div className="space-y-3">
      {/* Main control bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/30 rounded-lg border border-border/50">
        {/* Left: Entity/Tag filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Entities */}
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

          {/* Separator */}
          {matchedEntities.length > 0 && matchedTags.length > 0 && (
            <div className="w-px h-6 bg-border/60" />
          )}

          {/* Tags */}
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

          {/* Empty state */}
          {!hasMatchedActors && (
            <span className="text-xs text-muted-foreground">No matching entities or tags found</span>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Active filter count */}
          {activeFilters.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {activeFilters.length} filter{activeFilters.length > 1 ? "s" : ""}
            </span>
          )}

          {/* Rules toggle - only show when 2+ filters are active */}
          {activeFilters.length >= 2 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Rules
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 uppercase">
                    {filterMode}
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Show transactions where:</p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                      <input
                        type="radio"
                        name="filterMode"
                        checked={filterMode === "any"}
                        onChange={() => onFilterModeChange("any")}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium">Any match</span>
                        <p className="text-xs text-muted-foreground">1+ selected entities/tags are present</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                      <input
                        type="radio"
                        name="filterMode"
                        checked={filterMode === "all"}
                        onChange={() => onFilterModeChange("all")}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium">All match</span>
                        <p className="text-xs text-muted-foreground">All selected entities/tags are present</p>
                      </div>
                    </label>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Column visibility */}
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

          {/* Views dropdown */}
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
              ) : (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  No saved views yet
                </div>
              )}
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
              Save the current column visibility and active filters as a reusable view.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="View name (e.g., Token Analysis)"
              autoFocus
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
