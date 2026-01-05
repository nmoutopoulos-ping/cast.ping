import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TagBadge } from "@/components/shared/TagBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DbTag {
  id: string;
  name: string;
  color: string;
  contract_address: string | null;
}

interface DbEntity {
  id: string;
  name: string;
  notes: string | null;
}

interface DbEntityWallet {
  id: string;
  entity_id: string;
  wallet_address: string;
}

export default function Entities() {
  const { user } = useAuth();
  const [tags, setTags] = useState<DbTag[]>([]);
  const [entities, setEntities] = useState<DbEntity[]>([]);
  const [entityWallets, setEntityWallets] = useState<Record<string, DbEntityWallet[]>>({});
  const [loading, setLoading] = useState(true);

  // Tag dialog state
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<DbTag | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#3B82F6");
  const [tagContractAddress, setTagContractAddress] = useState("");
  const [savingTag, setSavingTag] = useState(false);

  // Entity dialog state
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<DbEntity | null>(null);
  const [entityName, setEntityName] = useState("");
  const [entityNotes, setEntityNotes] = useState("");
  const [entityWalletAddresses, setEntityWalletAddresses] = useState<string[]>([]);
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [savingEntity, setSavingEntity] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [tagsRes, entitiesRes, walletsRes] = await Promise.all([
      supabase.from("tags").select("*").order("name"),
      supabase.from("entities").select("*").order("name"),
      supabase.from("entity_wallets").select("*"),
    ]);

    if (tagsRes.data) setTags(tagsRes.data);
    if (entitiesRes.data) setEntities(entitiesRes.data);
    
    // Group wallets by entity_id
    if (walletsRes.data) {
      const grouped: Record<string, DbEntityWallet[]> = {};
      walletsRes.data.forEach((w) => {
        if (!grouped[w.entity_id]) grouped[w.entity_id] = [];
        grouped[w.entity_id].push(w);
      });
      setEntityWallets(grouped);
    }
    setLoading(false);
  };

  // Tag handlers
  const openNewTagDialog = () => {
    setEditingTag(null);
    setTagName("");
    setTagColor("#3B82F6");
    setTagContractAddress("");
    setTagDialogOpen(true);
  };

  const openEditTagDialog = (tag: DbTag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setTagContractAddress(tag.contract_address || "");
    setTagDialogOpen(true);
  };

  const saveTag = async () => {
    if (!user || !tagName.trim()) return;
    setSavingTag(true);

    const tagData = {
      name: tagName.trim(),
      color: tagColor,
      contract_address: tagContractAddress.trim() || null,
      user_id: user.id,
    };

    if (editingTag) {
      const { error } = await supabase
        .from("tags")
        .update(tagData)
        .eq("id", editingTag.id);

      if (error) {
        toast.error("Failed to update tag");
      } else {
        toast.success("Tag updated");
        fetchData();
      }
    } else {
      const { error } = await supabase.from("tags").insert(tagData);

      if (error) {
        toast.error("Failed to create tag");
      } else {
        toast.success("Tag created");
        fetchData();
      }
    }

    setSavingTag(false);
    setTagDialogOpen(false);
  };

  const deleteTag = async (tagId: string) => {
    const { error } = await supabase.from("tags").delete().eq("id", tagId);
    if (error) {
      toast.error("Failed to delete tag");
    } else {
      toast.success("Tag deleted");
      fetchData();
    }
  };

  // Entity handlers
  const openNewEntityDialog = () => {
    setEditingEntity(null);
    setEntityName("");
    setEntityNotes("");
    setEntityWalletAddresses([]);
    setNewWalletAddress("");
    setEntityDialogOpen(true);
  };

  const openEditEntityDialog = (entity: DbEntity) => {
    setEditingEntity(entity);
    setEntityName(entity.name);
    setEntityNotes(entity.notes || "");
    const wallets = entityWallets[entity.id] || [];
    setEntityWalletAddresses(wallets.map((w) => w.wallet_address));
    setNewWalletAddress("");
    setEntityDialogOpen(true);
  };

  const addWalletAddress = () => {
    const addr = newWalletAddress.trim();
    if (addr && !entityWalletAddresses.includes(addr)) {
      setEntityWalletAddresses([...entityWalletAddresses, addr]);
      setNewWalletAddress("");
    }
  };

  const removeWalletAddress = (addr: string) => {
    setEntityWalletAddresses(entityWalletAddresses.filter((a) => a !== addr));
  };

  const saveEntity = async () => {
    if (!user || !entityName.trim()) return;
    setSavingEntity(true);

    const entityData = {
      name: entityName.trim(),
      notes: entityNotes.trim() || null,
      user_id: user.id,
    };

    let entityId = editingEntity?.id;

    if (editingEntity) {
      const { error } = await supabase
        .from("entities")
        .update(entityData)
        .eq("id", editingEntity.id);

      if (error) {
        toast.error("Failed to update entity");
        setSavingEntity(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("entities")
        .insert(entityData)
        .select()
        .single();

      if (error || !data) {
        toast.error("Failed to create entity");
        setSavingEntity(false);
        return;
      }
      entityId = data.id;
    }

    // Sync wallet addresses
    if (entityId) {
      // Delete existing wallets for this entity
      await supabase.from("entity_wallets").delete().eq("entity_id", entityId);

      // Insert new wallets
      if (entityWalletAddresses.length > 0) {
        const walletRecords = entityWalletAddresses.map((addr) => ({
          entity_id: entityId,
          wallet_address: addr,
          user_id: user.id,
        }));
        await supabase.from("entity_wallets").insert(walletRecords);
      }
    }

    toast.success(editingEntity ? "Entity updated" : "Entity created");
    fetchData();
    setSavingEntity(false);
    setEntityDialogOpen(false);
  };

  const deleteEntity = async (entityId: string) => {
    const { error } = await supabase.from("entities").delete().eq("id", entityId);
    if (error) {
      toast.error("Failed to delete entity");
    } else {
      toast.success("Entity deleted");
      fetchData();
    }
  };

  const colorPresets = [
    "#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4",
    "#EF4444", "#84CC16", "#F97316", "#6366F1"
  ];

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
            <Button className="gap-2" onClick={openNewEntityDialog}>
              <Plus className="w-4 h-4" />
              New Entity
            </Button>
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entity Name</th>
                  <th>Wallet Addresses</th>
                  <th>Notes</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : entities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      No entities yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  entities.map((entity) => {
                    const wallets = entityWallets[entity.id] || [];
                    return (
                    <tr key={entity.id}>
                      <td className="font-medium">{entity.name}</td>
                      <td>
                        {wallets.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {wallets.slice(0, 2).map((w) => (
                              <code key={w.id} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                {w.wallet_address.slice(0, 6)}...{w.wallet_address.slice(-4)}
                              </code>
                            ))}
                            {wallets.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{wallets.length - 2} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="text-muted-foreground max-w-xs truncate">
                        {entity.notes || "-"}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => openEditEntityDialog(entity)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-destructive"
                            onClick={() => deleteEntity(entity.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button className="gap-2" onClick={openNewTagDialog}>
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
                  <th>Contract Address</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : tags.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      No tags yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  tags.map((tag) => (
                    <tr key={tag.id}>
                      <td>
                        <TagBadge tag={{ id: tag.id, name: tag.name, color: tag.color }} />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded border border-border"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="font-mono text-sm text-muted-foreground">
                            {tag.color}
                          </span>
                        </div>
                      </td>
                      <td>
                        {tag.contract_address ? (
                          <span className="font-mono text-xs">
                            {tag.contract_address.slice(0, 10)}...{tag.contract_address.slice(-8)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => openEditTagDialog(tag)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-destructive"
                            onClick={() => deleteTag(tag.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? "Edit Tag" : "New Tag"}</DialogTitle>
            <DialogDescription>
              {editingTag
                ? "Update the tag details below."
                : "Create a new tag to categorize wallets and transactions."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tagName">Name</Label>
              <Input
                id="tagName"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="e.g. Whale, Customer A"
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      tagColor === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setTagColor(color)}
                  />
                ))}
                <Input
                  type="color"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="w-10 h-8 p-0 border-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractAddress">Contract Address (optional)</Label>
              <Input
                id="contractAddress"
                value={tagContractAddress}
                onChange={(e) => setTagContractAddress(e.target.value)}
                placeholder="0x..."
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Add a contract address to filter transactions involving this contract.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTag} disabled={!tagName.trim() || savingTag}>
              {savingTag ? "Saving..." : editingTag ? "Save Changes" : "Create Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entity Dialog */}
      <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntity ? "Edit Entity" : "New Entity"}</DialogTitle>
            <DialogDescription>
              {editingEntity
                ? "Update the entity details below."
                : "Create a new entity to group related wallets."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="entityName">Name</Label>
              <Input
                id="entityName"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="e.g. Acme Corporation"
              />
            </div>

            <div className="space-y-2">
              <Label>Wallet Addresses</Label>
              <div className="flex gap-2">
                <Input
                  value={newWalletAddress}
                  onChange={(e) => setNewWalletAddress(e.target.value)}
                  placeholder="0x..."
                  className="font-mono"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addWalletAddress())}
                />
                <Button type="button" variant="outline" onClick={addWalletAddress}>
                  Add
                </Button>
              </div>
              {entityWalletAddresses.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {entityWalletAddresses.map((addr) => (
                    <div
                      key={addr}
                      className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm font-mono"
                    >
                      <span>{addr.slice(0, 10)}...{addr.slice(-6)}</span>
                      <button
                        type="button"
                        onClick={() => removeWalletAddress(addr)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="entityNotes">Notes</Label>
              <Input
                id="entityNotes"
                value={entityNotes}
                onChange={(e) => setEntityNotes(e.target.value)}
                placeholder="Optional notes about this entity"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEntityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEntity} disabled={!entityName.trim() || savingEntity}>
              {savingEntity ? "Saving..." : editingEntity ? "Save Changes" : "Create Entity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
