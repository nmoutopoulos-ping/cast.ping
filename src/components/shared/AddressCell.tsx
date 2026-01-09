import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ETHERSCAN_BASE } from "@/types/transactions";

interface AddressCellProps {
  address: string;
  isHighlighted?: boolean;
  highlightColor?: string;
  onHover?: () => void;
  onLeave?: () => void;
  explorerBaseUrl?: string;
}

export function AddressCell({ 
  address, 
  isHighlighted = false, 
  highlightColor,
  onHover, 
  onLeave,
  explorerBaseUrl = ETHERSCAN_BASE,
}: AddressCellProps) {
  const [copied, setCopied] = useState(false);

  if (!address) return <span className="text-muted-foreground">-</span>;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div 
      className={cn(
        "group inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors duration-75 cursor-pointer",
        isHighlighted && !highlightColor && "bg-amber-500/20 ring-1 ring-amber-500/40",
        !isHighlighted && !highlightColor && "hover:bg-muted"
      )}
      style={highlightColor ? {
        backgroundColor: `${highlightColor}30`,
        boxShadow: `inset 0 0 0 1px ${highlightColor}60`,
      } : undefined}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <a
        href={`${explorerBaseUrl}/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs transition-colors whitespace-nowrap text-foreground/80 hover:text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {address}
      </a>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
      >
        {copied ? (
          <Check className="w-3 h-3 text-success" />
        ) : (
          <Copy className="w-3 h-3 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}