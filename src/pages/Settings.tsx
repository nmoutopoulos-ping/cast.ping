import { useState } from "react";
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockSavedQueries } from "@/lib/mockData";

export default function Settings() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const testConnection = () => {
    setConnectionStatus("testing");
    setTimeout(() => {
      setConnectionStatus("success");
    }, 1500);
  };

  return (
    <div className="p-8 max-w-2xl animate-fade-in">
      <div className="space-y-1 mb-8">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Configure your Ping Wallet Explorer</p>
      </div>

      <div className="space-y-8">
        {/* Dune API Section */}
        <section className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div>
            <h2 className="text-lg font-medium">Dune API Configuration</h2>
            <p className="text-sm text-muted-foreground">Connect to Dune Analytics for blockchain data</p>
          </div>

          <div>
            <Label>API Key</Label>
            <div className="flex items-center gap-2 mt-1">
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
              <Button variant="outline" onClick={testConnection} disabled={connectionStatus === "testing"}>
                {connectionStatus === "testing" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Test Connection
              </Button>
            </div>
            {connectionStatus === "success" && (
              <p className="flex items-center gap-2 text-sm text-success mt-2">
                <CheckCircle className="w-4 h-4" />
                Connection successful
              </p>
            )}
            {connectionStatus === "error" && (
              <p className="flex items-center gap-2 text-sm text-destructive mt-2">
                <XCircle className="w-4 h-4" />
                Connection failed. Please check your API key.
              </p>
            )}
          </div>
        </section>

        {/* Defaults Section */}
        <section className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div>
            <h2 className="text-lg font-medium">Default Settings</h2>
            <p className="text-sm text-muted-foreground">Configure default behavior for new searches</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Default Chain</Label>
              <Select defaultValue="sepolia">
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sepolia">Sepolia</SelectItem>
                  <SelectItem value="mainnet">Ethereum Mainnet</SelectItem>
                  <SelectItem value="arbitrum">Arbitrum</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="optimism">Optimism</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Default Query</Label>
              <Select defaultValue={mockSavedQueries[0].id}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockSavedQueries.map((query) => (
                    <SelectItem key={query.id} value={query.id}>{query.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* User Profile Section */}
        <section className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div>
            <h2 className="text-lg font-medium">User Profile</h2>
            <p className="text-sm text-muted-foreground">Your account information</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input className="mt-1" defaultValue="Alex Chen" />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1" type="email" defaultValue="alex@pingwallet.io" />
            </div>
          </div>

          <div>
            <Label>Organization</Label>
            <Input className="mt-1" defaultValue="Ping Wallet Labs" />
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
