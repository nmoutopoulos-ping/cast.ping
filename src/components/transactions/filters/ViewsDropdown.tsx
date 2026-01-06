import { useState, useEffect, useMemo } from "react";
import { ChevronDown, Save, Trash2, Check, RefreshCw, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { ActiveFilter, SavedView, FilterMode, MethodType } from "@/types/transactions";

interface ViewsDropdownProps {
  savedQueryId: string;
  userId: string;
  hiddenColumns: Set<string>;
  activeFilters: ActiveFilter[];
  filterMode: FilterMode;
  tagFilterMode: FilterMode;
  methodFilters: MethodType[];
  currentViewId: string | null;
  onViewLoad: (view: SavedView) => void;
  onCurrentViewIdChange: (id: string | null) => void;
}

// Helper to check if current settings differ from saved view
function hasUnsavedChanges(
  currentView: SavedView | undefined,
  hiddenColumns: Set<string>,
  activeFilters: ActiveFilter[],
  filterMode: FilterMode,
  tagFilterMode: FilterMode,
  methodFilters: MethodType[]
): boolean {
  if (!currentView) return false;
  
  const savedHidden = new Set(currentView.hidden_columns);
  if (hiddenColumns.size !== savedHidden.size || ![...hiddenColumns].every(c => savedHidden.has(c))) {
    return true;
  }
  
  if (JSON.stringify(activeFilters) !== JSON.stringify(currentView.active_filters)) {
    return true;
  }
  
  if (filterMode !== currentView.filter_mode) return true;
  if (tagFilterMode !== currentView.tag_filter_mode) return true;
  
  const savedMethods = currentView.method_filters || [];
  if (methodFilters.length !== savedMethods.length || !methodFilters.every(m => savedMethods.includes(m))) {
    return true;
  }
  
  return false;
}

export function ViewsDropdown({
  savedQueryId,
  userId,
  hiddenColumns,
  activeFilters,
  filterMode,
  tagFilterMode,
  methodFilters,
  currentViewId,
  onViewLoad,
  onCurrentViewIdChange,
}: ViewsDropdownProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!savedQueryId || !userId) return;
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
      onCurrentViewIdChange(data.id);
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
      onCurrentViewIdChange(viewId);
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
      if (currentViewId === viewId) onCurrentViewIdChange(null);
      toast.success("View deleted");
    }
  };

  const currentView = savedViews.find((v) => v.id === currentViewId);
  
  const isModified = useMemo(() => 
    hasUnsavedChanges(currentView, hiddenColumns, activeFilters, filterMode, tagFilterMode, methodFilters),
    [currentView, hiddenColumns, activeFilters, filterMode, tagFilterMode, methodFilters]
  );

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Update View button - visible when in a view with unsaved changes */}
        {currentView && isModified && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUpdateView(currentView.id)}
            className="gap-1.5 text-amber-600 border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-700"
            title="Save changes to current view"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Update View
          </Button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={currentView ? "default" : "outline"} 
              size="sm" 
              disabled={!savedQueryId || !userId}
              className={cn(
                "gap-2",
                currentView && "bg-primary text-primary-foreground"
              )}
            >
              {currentView ? (
                <>
                  {isModified ? (
                    <Circle className="w-2 h-2 fill-amber-400 text-amber-400" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {currentView.name}
                  {isModified && <span className="text-[10px] opacity-70">(modified)</span>}
                </>
              ) : (
                "Views"
              )}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
            {currentView && (
              <>
                <DropdownMenuItem
                  onClick={() => onCurrentViewIdChange(null)}
                  className="text-muted-foreground"
                >
                  Clear current view
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {savedViews.length > 0 ? (
              <>
                {savedViews.map((view) => (
                  <DropdownMenuItem
                    key={view.id}
                    className="flex items-center justify-between group"
                  >
                    <button
                      className="flex-1 text-left flex items-center gap-2"
                      onClick={() => onViewLoad(view)}
                    >
                      {currentViewId === view.id && <Check className="w-3 h-3 text-primary" />}
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
    </>
  );
}
