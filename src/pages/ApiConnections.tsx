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
  AlertCircle
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

interface ApiConnection {
  id: string;
  name: string;
  chain: string;
  queryId: string;
  status: "connected" | "error" | "pending";
  lastChecked: string;
}

const CHAINS = [
  { value: "ethereum", label: "Ethereum Mainnet" },
  { value: "sepolia", label: "Sepolia" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "polygon", label: "Polygon" },
  { value: "optimism", label: "Optimism" },
  { value: "base", label: "Base" },
];

const mockConnections: ApiConnection[] = [
  {
    id: "1",
    name: "Sepolia Transactions",
    chain: "sepolia",
    queryId: "4924193",
    status: "connected",
    lastChecked: "2 min ago",
  },
  {
    id: "2",
    name: "Ethereum Mainnet",
    chain: "ethereum",
    queryId: "4924200",
    status: "connected",
    lastChecked: "5 min ago",
  },
  {
    id: "3",
    name: "Arbitrum Transfers",
    chain: "arbitrum",
    queryId: "4924210",
    status: "error",
    lastChecked: "10 min ago",
  },
];

export default function ApiConnections() {
  const [connections, setConnections] = useState<ApiConnection[]>(mockConnections);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newConnection, setNewConnection] = useState({
    name: "",
    chain: "",
    queryId: "",
  });

  const testConnection = (id: string) => {
    setTestingConnection(id);
    setTimeout(() => {
      setConnections(prev => 
        prev.map(conn => 
          conn.id === id 
            ? { ...conn, status: "connected" as const, lastChecked: "Just now" }
            : conn
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
    
    setConnections(prev => [...prev, connection]);
    setNewConnection({ name: "", chain: "", queryId: "" });
    setAddDialogOpen(false);
    
    // Test the new connection
    setTimeout(() => testConnection(connection.id), 500);
  };

  const removeConnection = (id: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== id));
  };

  const getStatusIcon = (status: ApiConnection["status"], isLoading: boolean) => {
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
  };

  const getStatusBadge = (status: ApiConnection["status"]) => {
    switch (status) {
      case "connected":
        return <Badge variant="outline" className="text-success border-success/30 bg-success/10">Connected</Badge>;
      case "error":
        return <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">Error</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">Pending</Badge>;
    }
  };

  const connectedCount = connections.filter(c => c.status === "connected").length;
  const errorCount = connections.filter(c => c.status === "error").length;

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">API Connections</h1>
          <p className="text-muted-foreground">Manage Dune API connections for different chains</p>
        </div>
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
              <DialogDescription>
                Configure a new Dune API query for a specific chain
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Connection Name</Label>
                <Input 
                  className="mt-1.5"
                  placeholder="e.g., Polygon Transactions"
                  value={newConnection.name}
                  onChange={(e) => setNewConnection(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Chain</Label>
                <Select 
                  value={newConnection.chain}
                  onValueChange={(value) => setNewConnection(prev => ({ ...prev, chain: value }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select a chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHAINS.map(chain => (
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
                  onChange={(e) => setNewConnection(prev => ({ ...prev, queryId: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={addConnection}>Add Connection</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plug className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{connections.length}</p>
                <p className="text-sm text-muted-foreground">Total APIs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{connectedCount}</p>
                <p className="text-sm text-muted-foreground">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{errorCount}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Chain Connections</h2>
        </div>
        
        {connections.map((connection) => {
          const isLoading = testingConnection === connection.id;
          const chainLabel = CHAINS.find(c => c.value === connection.chain)?.label || connection.chain;
          
          return (
            <Card key={connection.id} className="hover:border-border/80 transition-colors">
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
                        <span>{chainLabel}</span>
                        <span>•</span>
                        <span className="font-mono">Query #{connection.queryId}</span>
                        <span>•</span>
                        <span>Checked {connection.lastChecked}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => testConnection(connection.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Test"
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>View Logs</DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => removeConnection(connection.id)}
                        >
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

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
    </div>
  );
}
