import { useState } from "react";
import { Plus, Palette, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TagBadge } from "@/components/shared/TagBadge";
import { AddressDisplay } from "@/components/shared/AddressDisplay";
import { mockEntities, mockTags } from "@/lib/mockData";
import type { Entity } from "@/types/wallet";

export default function Entities() {
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Entities & Tags</h1>
        <p className="text-muted-foreground">Group wallets and manage classification tags</p>
      </div>

      <Tabs defaultValue="entities">
        <TabsList>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>

        {/* Entities Tab */}
        <TabsContent value="entities" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Entity
            </Button>
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entity Name</th>
                  <th>Wallets</th>
                  <th>Tags</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {mockEntities.map((entity) => (
                  <tr 
                    key={entity.id} 
                    className="cursor-pointer"
                    onClick={() => setSelectedEntity(entity)}
                  >
                    <td className="font-medium">{entity.name}</td>
                    <td>{entity.walletCount}</td>
                    <td>
                      <div className="flex gap-1">
                        {entity.tags.slice(0, 2).map((tag) => (
                          <TagBadge key={tag.id} tag={tag} />
                        ))}
                        {entity.tags.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{entity.tags.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="text-muted-foreground max-w-xs truncate">{entity.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Tag
            </Button>
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Color</th>
                  <th>Wallets</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockTags.map((tag) => (
                  <tr key={tag.id}>
                    <td>
                      <TagBadge tag={tag} />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-5 h-5 rounded border border-border"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-mono text-sm text-muted-foreground">{tag.color}</span>
                      </div>
                    </td>
                    <td>{Math.floor(Math.random() * 50) + 1}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="w-8 h-8">
                          <Palette className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Entity Detail Dialog */}
      <Dialog open={!!selectedEntity} onOpenChange={() => setSelectedEntity(null)}>
        <DialogContent className="max-w-2xl">
          {selectedEntity && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEntity.name}</DialogTitle>
                <DialogDescription>{selectedEntity.notes}</DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-6">
                <div>
                  <p className="section-header">Associated Wallets</p>
                  <div className="space-y-2">
                    {selectedEntity.wallets.map((wallet, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <AddressDisplay address={wallet} />
                        <span className="text-xs text-muted-foreground">EOA</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="section-header">Tags</p>
                  <div className="flex gap-2">
                    {selectedEntity.tags.map((tag) => (
                      <TagBadge key={tag.id} tag={tag} />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <p className="text-2xl font-semibold">156.78</p>
                    <p className="text-sm text-muted-foreground">Total IN (ETH)</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <p className="text-2xl font-semibold">142.35</p>
                    <p className="text-sm text-muted-foreground">Total OUT (ETH)</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <p className="text-2xl font-semibold">3,847</p>
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
