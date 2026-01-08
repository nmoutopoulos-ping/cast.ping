import { useState, useEffect, useMemo } from "react";
import { Plus, Save, Trash2, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const handleDeleteView = async (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
      <div className="flex items-end gap-0.5 overflow-x-auto pb-px">
        {/* Saved View Tabs */}
        {savedViews.map((view) => {
          const isActive = currentViewId === view.id;
          const viewIsModified = isActive && isModified;
          
          return (
            <div
              key={view.id}
              className={cn(
                "group relative flex items-center gap-1.5 px-4 py-2 text-sm cursor-pointer transition-all border-x border-t rounded-t-lg whitespace-nowrap",
                isActive
                  ? "bg-background border-border text-foreground font-medium mb-[-1px] shadow-sm"
                  : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
              onClick={() => !isActive && onViewLoad(view)}
            >
              {/* Modified indicator dot */}
              {viewIsModified && (
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 animate-pulse" />
              )}
              
              <span className="truncate max-w-[160px]">{view.name}</span>
              
              {/* Update button for modified active view */}
              {viewIsModified && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateView(view.id);
                  }}
                  className="ml-1 p-1 hover:bg-amber-500/20 rounded text-amber-600 transition-colors"
                  title="Save changes"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
              
              {/* Close/delete button */}
              <button
                onClick={(e) => handleDeleteView(view.id, e)}
                className={cn(
                  "p-1 rounded hover:bg-destructive/20 hover:text-destructive transition-opacity",
                  isActive ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-60"
                )}
                title="Delete view"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
        
        {/* Add new view button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSaveDialogOpen(true)}
          disabled={!savedQueryId || !userId}
          className="h-9 px-3 gap-1.5 ml-1 text-muted-foreground hover:text-foreground"
          title="Save current as new view"
        >
          <Plus className="w-4 h-4" />
          <span className="text-xs">New View</span>
        </Button>
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
