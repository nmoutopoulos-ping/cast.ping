import { useEffect, useState, useRef } from "react";
import { Trash2, Database, Wallet, Coins, FlaskConical, Pencil, Upload, FileUp } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Sandbox datasets for exploration
interface SandboxDataset {
  id: string;
  name: string;
  description: string;
  type: "token" | "wallet";
  address: string;
  network: string;
  duneQueryId: string;
}

const SANDBOX_DATASETS: SandboxDataset[] = [
  {
    id: "paxg-ethereum",
    name: "PAXG Token",
    description: "Paxos Gold - Physical gold backed token",
    type: "token",
    address: "0x45804880De22913dAFE09f4980848ECE6EcbAf78",
    network: "Ethereum",
    duneQueryId: "6470837",
  },
];

// Helper to get search type from query
const getSearchType = (query: SavedQuery): "wallet" | "token" => {
  return (query as SavedQuery & { search_type?: string }).search_type === "token" ? "token" : "wallet";
};

export default function SavedQueries() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [txCounts, setTxCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [queryToDelete, setQueryToDelete] = useState<SavedQuery | null>(null);
  const [queryToEdit, setQueryToEdit] = useState<SavedQuery | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  
  // CSV Upload form state
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadAddress, setUploadAddress] = useState("");
  const [uploadType, setUploadType] = useState<"wallet" | "token">("wallet");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleEditQuery = async () => {
    if (!queryToEdit || !editName.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("saved_queries")
      .update({
        name: editName.trim(),
        description: editDescription.trim() || null,
      })
      .eq("id", queryToEdit.id);

    if (error) {
      toast.error("Failed to update: " + error.message);
    } else {
      toast.success("Updated successfully!");
      setEditDialogOpen(false);
      setQueryToEdit(null);
      fetchQueries();
    }
    setSaving(false);
  };

  const openEditDialog = (query: SavedQuery, e: React.MouseEvent) => {
    e.stopPropagation();
    setQueryToEdit(query);
    setEditName(query.name);
    setEditDescription(query.description || "");
    setEditDialogOpen(true);
  };

  const handleOpenQuery = (query: SavedQuery) => {
    navigate(`/queries/${query.id}`);
  };

  const handleOpenSandbox = (dataset: SandboxDataset) => {
    // Navigate to sandbox viewer with pre-filled parameters
    navigate(`/sandbox?address=${dataset.address}&queryId=${dataset.duneQueryId}&name=${encodeURIComponent(dataset.name)}`);
  };

  const TypeBadge = ({ type }: { type: "wallet" | "token" }) => (
    <Badge 
      variant="outline" 
      className={`gap-1.5 text-xs font-medium ${
        type === "wallet" 
          ? "border-blue-500/25 text-blue-600 bg-blue-500/5" 
          : "border-amber-500/25 text-amber-600 bg-amber-500/5"
      }`}
    >
      {type === "wallet" ? (
        <Wallet className="w-3 h-3" />
      ) : (
        <Coins className="w-3 h-3" />
      )}
      {type === "wallet" ? "Wallet" : "Token"}
    </Badge>
  );

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1>Saved Data</h1>
          <p className="text-sm text-muted-foreground">Manage your saved wallet and token data</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <Upload className="w-4 h-4" />
          Upload CSV
        </Button>
      </div>

      {/* Saved Data Content */}
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
                <th>Type</th>
                <th>Description</th>
                <th>Address</th>
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
                  <td>
                    <TypeBadge type={getSearchType(query)} />
                  </td>
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
                  <td className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => openEditDialog(query, e)}
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </Button>
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

      {/* Sandbox Data Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2>Sandbox Data</h2>
            <p className="text-sm text-muted-foreground">Explore pre-configured datasets</p>
          </div>
        </div>
        
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
                <th>Contract Address</th>
                <th>Network</th>
              </tr>
            </thead>
            <tbody>
              {SANDBOX_DATASETS.map((dataset) => (
                <tr
                  key={dataset.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleOpenSandbox(dataset)}
                >
                  <td className="font-medium">{dataset.name}</td>
                  <td>
                    <TypeBadge type={dataset.type} />
                  </td>
                  <td className="text-muted-foreground max-w-xs truncate">
                    {dataset.description}
                  </td>
                  <td>
                    <span className="font-mono text-sm">
                      {dataset.address.slice(0, 8)}...{dataset.address.slice(-6)}
                    </span>
                  </td>
                  <td>
                    <Badge variant="outline" className="font-mono text-xs">
                      {dataset.network}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Upload Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setUploadName("");
          setUploadDescription("");
          setUploadAddress("");
          setUploadType("wallet");
          setUploadFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload CSV Data</DialogTitle>
            <DialogDescription>
              Import transaction data from a CSV file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="upload-name">Name *</Label>
              <Input
                id="upload-name"
                placeholder="e.g., My Wallet Transactions"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-description">Description</Label>
              <Textarea
                id="upload-description"
                placeholder="Describe this dataset..."
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-address">Wallet / Token Address *</Label>
              <Input
                id="upload-address"
                placeholder="0x..."
                value={uploadAddress}
                onChange={(e) => setUploadAddress(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Type *</Label>
              <Select value={uploadType} onValueChange={(val) => setUploadType(val as "wallet" | "token")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wallet">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Wallet
                    </div>
                  </SelectItem>
                  <SelectItem value="token">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      Token
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CSV File *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <FileUp className="w-5 h-5 text-primary" />
                    <span className="font-medium">{uploadFile.name}</span>
                    <span className="text-muted-foreground">
                      ({(uploadFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to select a CSV file
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!uploadName.trim() || !uploadAddress.trim() || !uploadFile) {
                  toast.error("Please fill in all required fields");
                  return;
                }
                toast.success("CSV upload flow ready - next step: process file");
                setCreateDialogOpen(false);
              }} 
              disabled={!uploadName.trim() || !uploadAddress.trim() || !uploadFile}
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Saved Data</DialogTitle>
            <DialogDescription>
              Update the name and description for this saved search.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe what this search is for..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditQuery} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
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