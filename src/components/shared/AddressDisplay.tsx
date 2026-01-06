import { useState } from "react";
import { Copy, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AddressDisplayProps {
  address: string;
  shortened?: boolean;
  showCopy?: boolean;
  showExternalLink?: boolean;
  className?: string;
  explorerBaseUrl?: string;
}

export function AddressDisplay({ 
  address, 
  shortened = true, 
  showCopy = true, 
  showExternalLink = true,
  className,
  explorerBaseUrl = "https://sepolia.etherscan.io"
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const displayAddress = shortened 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openEtherscan = () => {
    window.open(`${explorerBaseUrl}/address/${address}`, "_blank");
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 group", className)}>
      <span className="address-text">{displayAddress}</span>
      {showCopy && (
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </Button>
      )}
      {showExternalLink && (
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={openEtherscan}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      )}
    </span>
  );
}
