import { Copy, Check, Plus } from "lucide-react";
import { useState } from "react";
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
import { TagBadge } from "@/components/shared/TagBadge";
import type { WalletProfile, WalletType, RiskLevel } from "@/types/wallet";
import { format } from "date-fns";

interface WalletSummaryPanelProps {
  wallet: WalletProfile;
}

const walletTypes: WalletType[] = [
  "Unknown",
  "EOA",
  "Exchange",
  "Smart Contract",
  "LP Pool",
  "MEV / Bot",
  "Bridge",
  "Internal / House Wallet",
];

const riskLevels: RiskLevel[] = ["Low", "Medium", "High"];

export function WalletSummaryPanel({ wallet }: WalletSummaryPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-80 border-r border-border bg-card p-6 space-y-6 overflow-y-auto scrollbar-thin">
      {/* Address */}
      <div>
        <p className="section-header">Wallet Address</p>
        <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
          <code className="text-sm font-mono flex-1 truncate">{wallet.address}</code>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Chain */}
      <div>
        <Label className="section-header">Chain</Label>
        <Select defaultValue={wallet.chain}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Sepolia">Sepolia</SelectItem>
            <SelectItem value="Mainnet">Mainnet</SelectItem>
            <SelectItem value="Arbitrum">Arbitrum</SelectItem>
            <SelectItem value="Polygon">Polygon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div>
        <p className="section-header">Statistics</p>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Transactions</span>
            <span className="font-medium">{wallet.totalTxCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">First Seen</span>
            <span className="font-medium">{format(wallet.firstSeen, "MMM d, yyyy")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Seen</span>
            <span className="font-medium">{format(wallet.lastSeen, "MMM d, yyyy")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total IN</span>
            <span className="font-medium text-success">{wallet.totalInValue.toFixed(4)} ETH</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total OUT</span>
            <span className="font-medium text-destructive">{wallet.totalOutValue.toFixed(4)} ETH</span>
          </div>
        </div>
      </div>

      {/* Classification */}
      <div className="space-y-4">
        <p className="section-header">Classification</p>
        
        <div>
          <Label className="text-xs text-muted-foreground">Wallet Type</Label>
          <Select defaultValue={wallet.type}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {walletTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Risk Level</Label>
          <Select defaultValue={wallet.riskLevel}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {riskLevels.map((level) => (
                <SelectItem key={level} value={level}>{level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Internal Wallet ID</Label>
          <Input className="mt-1" defaultValue={wallet.internalId} placeholder="e.g., PING-001" />
        </div>
      </div>

      {/* Tags */}
      <div>
        <p className="section-header">Tags</p>
        <div className="flex flex-wrap gap-2">
          {wallet.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs gap-1">
            <Plus className="w-3 h-3" />
            Add tag
          </Button>
        </div>
      </div>
    </div>
  );
}
