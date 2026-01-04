import { useEffect, useState } from "react";
import { Plus, Play, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/shared/EmptyState";

interface SavedQuery {
  id: string;
  name: string;
  description: string | null;
  dune_query_id: string;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

export default function SavedQueries() {
  const navigate = useNavigate();
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);
  const [testAddress, setTestAddress] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [queryToDelete, setQueryToDelete] = useState<SavedQuery | null>(null);
  const [newQueryName, setNewQueryName] = useState("");
  const [newQueryDescription, setNewQueryDescription] = useState("");
  const [newQueryDuneId, setNewQueryDuneId] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchQueries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_queries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load queries: " + error.message);
    } else {
      setQueries(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  const handleCreateQuery = async () => {
    if (!newQueryName.trim() || !newQueryDuneId.trim()) {
      toast.error("Please fill in required fields");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("saved_queries").insert({
      name: newQueryName.trim(),
      description: newQueryDescription.trim() || null,
      dune_query_id: newQueryDuneId.trim(),
    });

    if (error) {
      toast.error("Failed to create query: " + error.message);
    } else {
      toast.success("Query created successfully!");
      setCreateDialogOpen(false);
      setNewQueryName("");
      setNewQueryDescription("");
      setNewQueryDuneId("");
      fetchQueries();
    }
    setSaving(false);
  };

  const handleDeleteQuery = async () => {
    if (!queryToDelete) return;

    const { error } = await supabase
      .from("saved_queries")
      .delete()
      .eq("id", queryToDelete.id);

    if (error) {
      toast.error("Failed to delete query: " + error.message);
    } else {
      toast.success("Query deleted successfully!");
      setDeleteDialogOpen(false);
      setQueryToDelete(null);
      setSelectedQuery(null);
      fetchQueries();
    }
  };

  const handleRunQuery = (queryId: string) => {
    navigate(`/results?queryId=${queryId}`);
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Saved Queries</h1>
          <p className="text-muted-foreground">Manage your reusable Dune queries</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          New Saved Query
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : queries.length === 0 ? (
        <EmptyState
          title="No saved queries yet"
          description="Save a query from the Results page or create one here to get started."
          action={{
            label: "Create Your First Query",
            onClick: () => setCreateDialogOpen(true),
          }}
        />
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Dune Query ID</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {queries.map((query) => (
                <tr
                  key={query.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedQuery(query)}
                >
                  <td className="font-medium">{query.name}</td>
                  <td className="text-muted-foreground max-w-xs truncate">
                    {query.description || "-"}
                  </td>
                  <td className="font-mono text-sm">{query.dune_query_id}</td>
                  <td className="text-muted-foreground">
                    {formatDistanceToNow(new Date(query.created_at), { addSuffix: true })}
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQueryToDelete(query);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Side Drawer */}
      <Sheet open={!!selectedQuery} onOpenChange={() => setSelectedQuery(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          {selectedQuery && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedQuery.name}</SheetTitle>
                <SheetDescription>{selectedQuery.description || "No description"}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <Label>Query Name</Label>
                  <Input className="mt-1" defaultValue={selectedQuery.name} readOnly />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea className="mt-1" defaultValue={selectedQuery.description || ""} readOnly />
                </div>

                <div>
                  <Label>Dune Query ID</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input defaultValue={selectedQuery.dune_query_id} className="font-mono" readOnly />
                    <Button variant="outline" size="icon" asChild>
                      <a
                        href={`https://dune.com/queries/${selectedQuery.dune_query_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <Label>Test with Wallet</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      placeholder="Paste address..."
                      value={testAddress}
                      onChange={(e) => setTestAddress(e.target.value)}
                      className="font-mono"
                    />
                    <Button
                      onClick={() => handleRunQuery(selectedQuery.dune_query_id)}
                      className="gap-2 shrink-0"
                    >
                      <Play className="w-4 h-4" />
                      Run
                    </Button>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      setQueryToDelete(selectedQuery);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Query
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Saved Query</DialogTitle>
            <DialogDescription>
              Create a new saved query to quickly access Dune data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Query Name *</Label>
              <Input
                id="create-name"
                placeholder="e.g., Sepolia Transaction History"
                value={newQueryName}
                onChange={(e) => setNewQueryName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-dune-id">Dune Query ID *</Label>
              <Input
                id="create-dune-id"
                placeholder="e.g., 6459204"
                value={newQueryDuneId}
                onChange={(e) => setNewQueryDuneId(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                placeholder="Describe what this query does..."
                value={newQueryDescription}
                onChange={(e) => setNewQueryDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateQuery} disabled={saving}>
              {saving ? "Creating..." : "Create Query"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Query</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{queryToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuery} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
