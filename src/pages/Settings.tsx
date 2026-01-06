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
  return (
    <div className="p-8 max-w-2xl animate-fade-in">
      <div className="space-y-1 mb-8">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Configure your Ping Wallet Explorer</p>
      </div>

      <div className="space-y-8">

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
