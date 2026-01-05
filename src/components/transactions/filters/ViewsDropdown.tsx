import { useState, useEffect } from "react";
import { ChevronDown, Save, Trash2, Check } from "lucide-react";
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

  return (
    <>
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
                    onClick={() => onViewLoad(view)}
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
