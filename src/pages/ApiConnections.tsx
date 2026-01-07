import { useState } from "react";
import { 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Plus,
  MoreVertical,
  Plug,
  AlertCircle,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ConnectionStatus = "connected" | "error" | "pending";

interface ApiConnection {
  id: string;
  name: string;
  chain: string;
  queryId: string;
  status: ConnectionStatus;
  lastChecked: string;
}

interface ChainOption {
  value: string;
  label: string;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const CHAINS: ChainOption[] = [
  { value: "ethereum", label: "Ethereum Mainnet" },
  { value: "sepolia", label: "Sepolia" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "polygon", label: "Polygon" },
  { value: "optimism", label: "Optimism" },
  { value: "base", label: "Base" },
];

const DEFAULT_CONNECTIONS: ApiConnection[] = [
  {
    id: "1",
    name: "Sepolia Transactions",
    chain: "sepolia",
    queryId: "6459204",
    status: "connected",
    lastChecked: "2 min ago",
  },
  {
    id: "2",
    name: "Ethereum Mainnet",
    chain: "ethereum",
    queryId: "6470740",
    status: "connected",
    lastChecked: "Just now",
  },
  {
    id: "3",
    name: "PAXG Token (Ethereum)",
    chain: "ethereum",
    queryId: "6470837",
    status: "connected",
    lastChecked: "Just now",
  },
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getChainLabel(chainValue: string): string {
  return CHAINS.find((c) => c.value === chainValue)?.label || chainValue;
}

function getStatusIcon(status: ConnectionStatus, isLoading: boolean) {
  if (isLoading) {
    return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  }
  switch (status) {
    case "connected":
      return <CheckCircle className="w-4 h-4 text-success" />;
    case "error":
      return <XCircle className="w-4 h-4 text-destructive" />;
    case "pending":
      return <AlertCircle className="w-4 h-4 text-warning" />;
  }
}

function getStatusBadge(status: ConnectionStatus) {
  switch (status) {
    case "connected":
      return (
        <Badge variant="outline" className="text-success border-success/30 bg-success/10">
          Connected
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
          Error
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
          Pending
        </Badge>
      );
  }
}

// ─────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  colorClass: string;
}

function StatCard({ icon, value, label, colorClass }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ConnectionCardProps {
  connection: ApiConnection;
  isLoading: boolean;
  onTest: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

function ConnectionCard({ connection, isLoading, onTest, onEdit, onRemove }: ConnectionCardProps) {
  return (
    <Card className="hover:border-border/80 transition-colors">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getStatusIcon(connection.status, isLoading)}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{connection.name}</span>
                {getStatusBadge(connection.status)}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>{getChainLabel(connection.chain)}</span>
                <span>•</span>
                <span className="font-mono">Query #{connection.queryId}</span>
                <span>•</span>
                <span>Checked {connection.lastChecked}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onTest} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>View Logs</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={onRemove}>
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function ApiConnections() {
  const [connections, setConnections] = useState<ApiConnection[]>(DEFAULT_CONNECTIONS);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newConnection, setNewConnection] = useState({ name: "", chain: "", queryId: "" });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ApiConnection | null>(null);
  const [editName, setEditName] = useState("");

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────

  const testConnection = (id: string) => {
    setTestingConnection(id);
    setTimeout(() => {
      setConnections((prev) =>
        prev.map((conn) =>
          conn.id === id ? { ...conn, status: "connected" as const, lastChecked: "Just now" } : conn
        )
      );
      setTestingConnection(null);
    }, 1500);
  };

  const testAllConnections = () => {
    connections.forEach((conn, index) => {
      setTimeout(() => testConnection(conn.id), index * 500);
    });
  };

  const addConnection = () => {
    if (!newConnection.name || !newConnection.chain || !newConnection.queryId) return;

    const connection: ApiConnection = {
      id: String(Date.now()),
      name: newConnection.name,
      chain: newConnection.chain,
      queryId: newConnection.queryId,
      status: "pending",
      lastChecked: "Never",
    };

    setConnections((prev) => [...prev, connection]);
    setNewConnection({ name: "", chain: "", queryId: "" });
    setAddDialogOpen(false);
    toast.success(`Added connection "${connection.name}"`);

    // Test the new connection
    setTimeout(() => testConnection(connection.id), 500);
  };

  const openEditDialog = (connection: ApiConnection) => {
    setEditingConnection(connection);
    setEditName(connection.name);
    setEditDialogOpen(true);
  };

  const saveConnectionEdit = () => {
    if (!editingConnection || !editName.trim()) return;

    setConnections((prev) =>
      prev.map((conn) =>
        conn.id === editingConnection.id ? { ...conn, name: editName.trim() } : conn
      )
    );

    toast.success(`Updated connection name to "${editName.trim()}"`);
    setEditDialogOpen(false);
    setEditingConnection(null);
    setEditName("");
  };

  const removeConnection = (id: string) => {
    const conn = connections.find((c) => c.id === id);
    setConnections((prev) => prev.filter((c) => c.id !== id));
    if (conn) toast.success(`Removed "${conn.name}"`);
  };

  // ─────────────────────────────────────────────────────────────
  // Derived state
  // ─────────────────────────────────────────────────────────────

  const connectedCount = connections.filter((c) => c.status === "connected").length;
  const errorCount = connections.filter((c) => c.status === "error").length;

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-1">
          <h1>API Connections</h1>
          <p className="text-sm text-muted-foreground">Manage Dune API connections for different chains</p>
        </div>

        {/* Add Connection Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Connection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add API Connection</DialogTitle>
              <DialogDescription>Configure a new Dune API query for a specific chain</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Connection Name</Label>
                <Input
                  className="mt-1.5"
                  placeholder="e.g., Polygon Transactions"
                  value={newConnection.name}
                  onChange={(e) => setNewConnection((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Chain</Label>
                <Select
                  value={newConnection.chain}
                  onValueChange={(value) => setNewConnection((prev) => ({ ...prev, chain: value }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select a chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHAINS.map((chain) => (
                      <SelectItem key={chain.value} value={chain.value}>
                        {chain.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dune Query ID</Label>
                <Input
                  className="mt-1.5 font-mono"
                  placeholder="e.g., 4924193"
                  value={newConnection.queryId}
                  onChange={(e) => setNewConnection((prev) => ({ ...prev, queryId: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addConnection}>Add Connection</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<Plug className="w-5 h-5 text-primary" />}
          value={connections.length}
          label="Total APIs"
          colorClass="bg-primary/10"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-success" />}
          value={connectedCount}
          label="Connected"
          colorClass="bg-success/10"
        />
        <StatCard
          icon={<XCircle className="w-5 h-5 text-destructive" />}
          value={errorCount}
          label="Errors"
          colorClass="bg-destructive/10"
        />
      </div>

      {/* Global API Key */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Global API Key</CardTitle>
          <CardDescription>Your Dune Analytics API key used for all connections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? "text" : "password"}
                defaultValue="dune_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="font-mono pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <Button variant="outline" onClick={testAllConnections}>
              Test All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connections List */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Chain Connections</h2>

        {connections.map((connection) => (
          <ConnectionCard
            key={connection.id}
            connection={connection}
            isLoading={testingConnection === connection.id}
            onTest={() => testConnection(connection.id)}
            onEdit={() => openEditDialog(connection)}
            onRemove={() => removeConnection(connection.id)}
          />
        ))}

        {connections.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Plug className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No API connections configured</p>
              <Button variant="outline" className="mt-4" onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add your first connection
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Connection Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Connection</DialogTitle>
            <DialogDescription>Update the name for this API connection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Connection Name</Label>
              <Input
                id="edit-name"
                className="mt-1.5"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveConnectionEdit()}
              />
            </div>
            {editingConnection && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">Chain:</span> {getChainLabel(editingConnection.chain)}
                </p>
                <p>
                  <span className="font-medium">Query ID:</span>{" "}
                  <span className="font-mono">{editingConnection.queryId}</span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveConnectionEdit} disabled={!editName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}