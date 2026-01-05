import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TagBadge } from "@/components/shared/TagBadge";
import { CopyableAddress } from "@/components/shared/CopyableAddress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DbTag {
  id: string;
  name: string;
  color: string;
  contract_address: string | null;
  decimals: number | null;
  token_symbol: string | null;
  token_name: string | null;
}

interface DbEntity {
  id: string;
  name: string;
  notes: string | null;
  wallet_address: string | null;
  color: string;
}

export default function Entities() {
  const { user } = useAuth();
  const [tags, setTags] = useState<DbTag[]>([]);
  const [entities, setEntities] = useState<DbEntity[]>([]);
  const [loading, setLoading] = useState(true);

  // Tag dialog state
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<DbTag | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#3B82F6");
  const [tagContractAddress, setTagContractAddress] = useState("");
  const [tagDecimals, setTagDecimals] = useState<string>("");
  const [tagTokenSymbol, setTagTokenSymbol] = useState("");
  const [tagTokenName, setTagTokenName] = useState("");
  const [savingTag, setSavingTag] = useState(false);

  // Entity dialog state
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<DbEntity | null>(null);
  const [entityName, setEntityName] = useState("");
  const [entityNotes, setEntityNotes] = useState("");
  const [entityWalletAddress, setEntityWalletAddress] = useState("");
  const [entityColor, setEntityColor] = useState("#3B82F6");
  const [savingEntity, setSavingEntity] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [tagsRes, entitiesRes] = await Promise.all([
      supabase.from("tags").select("*").order("name"),
      supabase.from("entities").select("*").order("name"),
    ]);

    if (tagsRes.data) setTags(tagsRes.data);
    if (entitiesRes.data) setEntities(entitiesRes.data);
    setLoading(false);
  };

  // Tag handlers
  const openNewTagDialog = () => {
    setEditingTag(null);
    setTagName("");
    setTagColor("#3B82F6");
    setTagContractAddress("");
    setTagDecimals("");
    setTagTokenSymbol("");
    setTagTokenName("");
    setTagDialogOpen(true);
  };

  const openEditTagDialog = (tag: DbTag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setTagContractAddress(tag.contract_address || "");
    setTagDecimals(tag.decimals != null ? String(tag.decimals) : "");
    setTagTokenSymbol(tag.token_symbol || "");
    setTagTokenName(tag.token_name || "");
    setTagDialogOpen(true);
  };

  const saveTag = async () => {
    if (!user || !tagName.trim()) return;
    setSavingTag(true);

    const decimalsValue = tagDecimals.trim() ? parseInt(tagDecimals.trim(), 10) : null;
    const tagData = {
      name: tagName.trim(),
      color: tagColor,
      contract_address: tagContractAddress.trim() || null,
      decimals: decimalsValue,
      token_symbol: tagTokenSymbol.trim() || null,
      token_name: tagTokenName.trim() || null,
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
    setEntityWalletAddress("");
    setEntityColor("#3B82F6");
    setEntityDialogOpen(true);
  };

  const openEditEntityDialog = (entity: DbEntity) => {
    setEditingEntity(entity);
    setEntityName(entity.name);
    setEntityNotes(entity.notes || "");
    setEntityWalletAddress(entity.wallet_address || "");
    setEntityColor(entity.color || "#3B82F6");
    setEntityDialogOpen(true);
  };

  const saveEntity = async () => {
    if (!user || !entityName.trim()) return;
    setSavingEntity(true);

    const entityData = {
      name: entityName.trim(),
      notes: entityNotes.trim() || null,
      wallet_address: entityWalletAddress.trim() || null,
      color: entityColor,
      user_id: user.id,
    };

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
      const { error } = await supabase
        .from("entities")
        .insert(entityData);

      if (error) {
        toast.error("Failed to create entity");
        setSavingEntity(false);
        return;
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

  // 30 colors across RGBV gradient
  const colorPresets = [
    // Reds
    "#DC2626", "#EF4444", "#F87171",
    // Oranges
    "#EA580C", "#F97316", "#FB923C",
    // Yellows
    "#CA8A04", "#EAB308", "#FACC15",
    // Yellow-Greens
    "#65A30D", "#84CC16", "#A3E635",
    // Greens
    "#16A34A", "#22C55E", "#4ADE80",
    // Teals
    "#0D9488", "#14B8A6", "#2DD4BF",
    // Cyans
    "#0891B2", "#06B6D4", "#22D3EE",
    // Blues
    "#2563EB", "#3B82F6", "#60A5FA",
    // Purples
    "#7C3AED", "#8B5CF6", "#A78BFA",
    // Pinks/Magentas
    "#DB2777", "#EC4899", "#F472B6",
  ];

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Entities & Tags</h1>
          <p className="text-muted-foreground">Group wallets and manage classification tags</p>
        </div>
        
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-muted-foreground"><span className="font-medium text-foreground">Entities</span> — Wallet addresses you want to track</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-foreground" />
            <span className="text-muted-foreground"><span className="font-medium text-foreground">Tags</span> — Token contracts for filtering transactions</span>
          </div>
        </div>
      </div>

      {/* Entities Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Entities</h2>
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
                <th>Color</th>
                <th>Wallet Address</th>
                <th>Notes</th>
                <th className="w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : entities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    No entities yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                entities.map((entity) => (
                  <tr key={entity.id}>
                    <td className="font-medium">{entity.name}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded border border-border"
                          style={{ backgroundColor: entity.color }}
                        />
                        <span className="font-mono text-sm text-muted-foreground">
                          {entity.color}
                        </span>
                      </div>
                    </td>
                    <td>
                      {entity.wallet_address ? (
                        <CopyableAddress address={entity.wallet_address} />
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tags Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Tags</h2>
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
                <th>Decimals</th>
                <th className="w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : tags.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
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
                        <CopyableAddress address={tag.contract_address} />
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td>
                      {tag.decimals != null ? (
                        <span className="font-mono text-sm">{tag.decimals}</span>
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
      </div>

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
              <Label htmlFor="contractAddress">
                Contract Address{(tagDecimals.trim() || tagTokenSymbol.trim() || tagTokenName.trim()) && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                id="contractAddress"
                value={tagContractAddress}
                onChange={(e) => setTagContractAddress(e.target.value)}
                placeholder="0x..."
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {(tagDecimals.trim() || tagTokenSymbol.trim() || tagTokenName.trim()) 
                  ? "Required when setting token transformation rules."
                  : "Add a contract address to filter transactions involving this contract."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagDecimals">Decimals (optional)</Label>
              <Input
                id="tagDecimals"
                type="number"
                min="0"
                max="18"
                value={tagDecimals}
                onChange={(e) => setTagDecimals(e.target.value)}
                placeholder="e.g. 6 for USDC, 18 for ETH"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Set decimal places to format Token Amount from raw value. Leave empty to show "No Rule".
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagTokenSymbol">Token Symbol (optional)</Label>
              <Input
                id="tagTokenSymbol"
                value={tagTokenSymbol}
                onChange={(e) => setTagTokenSymbol(e.target.value)}
                placeholder="e.g. PYUSD, USDC"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Override the "Token" column value for this contract.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagTokenName">Token Name (optional)</Label>
              <Input
                id="tagTokenName"
                value={tagTokenName}
                onChange={(e) => setTagTokenName(e.target.value)}
                placeholder="e.g. PayPal USD"
              />
              <p className="text-xs text-muted-foreground">
                Override the "Token Name" column value for this contract.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTag} disabled={!tagName.trim() || savingTag || ((tagDecimals.trim() || tagTokenSymbol.trim() || tagTokenName.trim()) && !tagContractAddress.trim())}>
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
              <Label>Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      entityColor === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEntityColor(color)}
                  />
                ))}
                <Input
                  type="color"
                  value={entityColor}
                  onChange={(e) => setEntityColor(e.target.value)}
                  className="w-10 h-8 p-0 border-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="walletAddress">Wallet Address</Label>
              <Input
                id="walletAddress"
                value={entityWalletAddress}
                onChange={(e) => setEntityWalletAddress(e.target.value)}
                placeholder="0x..."
                className="font-mono"
              />
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
