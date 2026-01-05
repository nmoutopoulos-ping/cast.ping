import { useEffect, useState } from "react";
import { Plus, ExternalLink, Trash2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

interface SavedQuery {
  id: string;
  name: string;
  description: string | null;
  dune_query_id: string;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

interface TransactionCount {
  saved_query_id: string;
  count: number;
}

export default function SavedQueries() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [txCounts, setTxCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [queryToDelete, setQueryToDelete] = useState<SavedQuery | null>(null);
  const [newQueryName, setNewQueryName] = useState("");
  const [newQueryDescription, setNewQueryDescription] = useState("");
  const [newQueryDuneId, setNewQueryDuneId] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchQueries = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_queries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load queries: " + error.message);
    } else {
      setQueries(data || []);
      
      // Fetch transaction counts for each query
      if (data && data.length > 0) {
        const queryIds = data.map(q => q.id);
        const counts: Record<string, number> = {};
        
        for (const qId of queryIds) {
          const { count } = await supabase
            .from("transactions")
            .select("*", { count: "exact", head: true })
            .eq("saved_query_id", qId)
            .eq("user_id", user.id);
          counts[qId] = count || 0;
        }
        setTxCounts(counts);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchQueries();
    }
  }, [user]);

  const handleCreateQuery = async () => {
    if (!newQueryName.trim() || !newQueryDuneId.trim() || !user) {
      toast.error("Please fill in required fields");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("saved_queries").insert({
      name: newQueryName.trim(),
      description: newQueryDescription.trim() || null,
      dune_query_id: newQueryDuneId.trim(),
      user_id: user.id,
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
      fetchQueries();
    }
  };

  const handleOpenQuery = (query: SavedQuery) => {
    navigate(`/queries/${query.id}`);
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Saved Searches</h1>
          <p className="text-muted-foreground">Manage your saved wallet searches</p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/wallets")}>
          <Plus className="w-4 h-4" />
          New Search
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : queries.length === 0 ? (
        <EmptyState
          title="No saved searches yet"
          description="Save a search to quickly access wallet transaction data."
          action={{
            label: "Create Your First Search",
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
                <th>Wallet Address</th>
                <th>Network</th>
                <th>Total Txns</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {queries.map((query) => (
                <tr
                  key={query.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleOpenQuery(query)}
                >
                  <td className="font-medium">{query.name}</td>
                  <td className="text-muted-foreground max-w-xs truncate">
                    {query.description || "-"}
                  </td>
                  <td>
                    {query.wallet_address ? (
                      <span className="font-mono text-sm">
                        {query.wallet_address.slice(0, 8)}...{query.wallet_address.slice(-6)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td>
                    <Badge variant="outline" className="font-mono text-xs">
                      Ethereum
                    </Badge>
                  </td>
                  <td>
                    <Badge variant="secondary" className="gap-1">
                      <Database className="w-3 h-3" />
                      {txCounts[query.id] || 0}
                    </Badge>
                  </td>
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

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Saved Search</DialogTitle>
            <DialogDescription>
              Save a search configuration to quickly access wallet data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Search Name *</Label>
              <Input
                id="create-name"
                placeholder="e.g., My Wallet History"
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
                placeholder="Describe what this search is for..."
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
              {saving ? "Creating..." : "Create Search"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Search</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{queryToDelete?.name}"? This will also delete all saved transactions. This action cannot be undone.
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
