import { useState } from "react";
import { Plus, Play, ExternalLink } from "lucide-react";
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
import { mockSavedQueries } from "@/lib/mockData";
import { formatDistanceToNow } from "date-fns";
import type { SavedQuery } from "@/types/wallet";

export default function SavedQueries() {
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);
  const [testAddress, setTestAddress] = useState("");

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Saved Queries</h1>
          <p className="text-muted-foreground">Manage your reusable Dune queries</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Saved Query
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Dune Query ID</th>
              <th>Last Run</th>
              <th>Usage (7d)</th>
            </tr>
          </thead>
          <tbody>
            {mockSavedQueries.map((query) => (
              <tr 
                key={query.id} 
                className="cursor-pointer"
                onClick={() => setSelectedQuery(query)}
              >
                <td className="font-medium">{query.name}</td>
                <td className="text-muted-foreground max-w-xs truncate">{query.description}</td>
                <td className="font-mono text-sm">{query.duneQueryId}</td>
                <td className="text-muted-foreground">
                  {query.lastRun 
                    ? formatDistanceToNow(query.lastRun, { addSuffix: true })
                    : "Never"
                  }
                </td>
                <td>{query.walletsUsed7d} wallets</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Side Drawer */}
      <Sheet open={!!selectedQuery} onOpenChange={() => setSelectedQuery(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          {selectedQuery && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedQuery.name}</SheetTitle>
                <SheetDescription>{selectedQuery.description}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <Label>Query Name</Label>
                  <Input className="mt-1" defaultValue={selectedQuery.name} />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea className="mt-1" defaultValue={selectedQuery.description} />
                </div>

                <div>
                  <Label>Dune Query ID</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input defaultValue={selectedQuery.duneQueryId} className="font-mono" />
                    <Button variant="outline" size="icon" asChild>
                      <a 
                        href={`https://dune.com/queries/${selectedQuery.duneQueryId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Parameter Schema</Label>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-sm font-mono overflow-auto">
                    {JSON.stringify(selectedQuery.parameterSchema, null, 2)}
                  </pre>
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
                    <Button disabled={!testAddress} className="gap-2 shrink-0">
                      <Play className="w-4 h-4" />
                      Run
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
