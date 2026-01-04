import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QueryRow {
  tx_hash: string;
  block_number: number;
  block_time: string;
  direction: string;
  from_address: string;
  to_address: string;
  nonce: number;
  transaction_index: number;
  value_eth: number;
  tx_fee_eth: number;
  gas_price: number;
  gas_used: number;
  success: boolean;
  token_contract: string;
  token_symbol: string;
  token_name: string;
  token_amount_raw: string;
  token_amount: number;
}

interface TransactionDataTableProps {
  rows: QueryRow[];
  searchedWallet?: string;
}

const ETHERSCAN_BASE = "https://sepolia.etherscan.io";
const ROWS_PER_PAGE = 25;

function AddressCell({ 
  address, 
  isHighlighted, 
  onHover, 
  onLeave,
  isSearchedWallet 
}: { 
  address: string; 
  isHighlighted: boolean;
  onHover: () => void;
  onLeave: () => void;
  isSearchedWallet?: boolean;
}) {
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

  const shortAddress = `${address.slice(0, 8)}...${address.slice(-6)}`;

  return (
    <div 
      className={cn(
        "group inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-150 cursor-pointer",
        isHighlighted && "bg-amber-500/20 ring-1 ring-amber-500/40",
        isSearchedWallet && "bg-primary/10 ring-1 ring-primary/30",
        !isHighlighted && !isSearchedWallet && "hover:bg-muted"
      )}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <a
        href={`${ETHERSCAN_BASE}/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "font-mono text-xs transition-colors",
          isSearchedWallet ? "text-primary font-medium" : "text-foreground/80 hover:text-primary"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {shortAddress}
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

export function TransactionDataTable({ rows, searchedWallet }: TransactionDataTableProps) {
  const [hoveredAddress, setHoveredAddress] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const paginatedRows = rows.slice(startIndex, startIndex + ROWS_PER_PAGE);

  // Pre-calculate address occurrences for visual feedback
  const addressCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((row) => {
      if (row.from_address) counts[row.from_address.toLowerCase()] = (counts[row.from_address.toLowerCase()] || 0) + 1;
      if (row.to_address) counts[row.to_address.toLowerCase()] = (counts[row.to_address.toLowerCase()] || 0) + 1;
      if (row.token_contract) counts[row.token_contract.toLowerCase()] = (counts[row.token_contract.toLowerCase()] || 0) + 1;
    });
    return counts;
  }, [rows]);

  const isHighlighted = (address: string | null | undefined) => {
    if (!address || !hoveredAddress) return false;
    return address.toLowerCase() === hoveredAddress.toLowerCase();
  };

  const isSearched = (address: string | null | undefined) => {
    if (!address || !searchedWallet) return false;
    return address.toLowerCase() === searchedWallet.toLowerCase();
  };

  const formatBlockTime = (blockTime: string) => {
    try {
      return formatDistanceToNow(new Date(blockTime), { addSuffix: true });
    } catch {
      return blockTime;
    }
  };

  const formatFullTime = (blockTime: string) => {
    try {
      return format(new Date(blockTime), "MMM d, yyyy HH:mm");
    } catch {
      return blockTime;
    }
  };

  const formatEth = (value: number | string | null | undefined) => {
    if (value == null) return "-";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "-";
    if (num === 0) return "0";
    if (Math.abs(num) < 0.0001) return num.toExponential(2);
    return num.toFixed(6);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Hover indicator */}
      {hoveredAddress && (
        <div className="flex items-center gap-4 px-1">
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="w-3 h-3 rounded-full bg-amber-500/30 ring-1 ring-amber-500/50" />
            <span className="text-xs text-muted-foreground">
              {addressCounts[hoveredAddress.toLowerCase()] || 0} occurrences highlighted
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider">Tx Hash</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider">Block</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider">Age</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider">Method</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider">From</th>
                <th className="text-center font-medium text-muted-foreground px-2 py-3.5 text-xs uppercase tracking-wider w-16"></th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider">To</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider">Value</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider">Txn Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginatedRows.map((row, index) => {
                const rowHasHighlight = isHighlighted(row.from_address) || isHighlighted(row.to_address);
                
                return (
                  <tr 
                    key={row.tx_hash || index}
                    className={cn(
                      "transition-colors duration-100",
                      rowHasHighlight ? "bg-amber-500/5" : "hover:bg-muted/40"
                    )}
                  >
                    {/* Tx Hash */}
                    <td className="px-4 py-3.5">
                      <a
                        href={`${ETHERSCAN_BASE}/tx/${row.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
                      >
                        {row.tx_hash?.slice(0, 12)}...
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    </td>

                    {/* Block */}
                    <td className="px-4 py-3.5">
                      <a
                        href={`${ETHERSCAN_BASE}/block/${row.block_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary/80 hover:text-primary hover:underline"
                      >
                        {row.block_number?.toLocaleString()}
                      </a>
                    </td>

                    {/* Age */}
                    <td className="px-4 py-3.5">
                      <span 
                        className="text-xs text-muted-foreground cursor-help"
                        title={formatFullTime(row.block_time)}
                      >
                        {formatBlockTime(row.block_time)}
                      </span>
                    </td>

                    {/* Method */}
                    <td className="px-4 py-3.5">
                      <Badge 
                        variant="outline" 
                        className="font-mono text-[10px] px-2 py-0.5 bg-muted/50 border-border/50"
                      >
                        {row.token_symbol ? "Transfer" : "Txn"}
                      </Badge>
                    </td>

                    {/* From */}
                    <td className="px-4 py-3.5">
                      <AddressCell
                        address={row.from_address}
                        isHighlighted={isHighlighted(row.from_address)}
                        isSearchedWallet={isSearched(row.from_address)}
                        onHover={() => setHoveredAddress(row.from_address)}
                        onLeave={() => setHoveredAddress(null)}
                      />
                    </td>

                    {/* Direction */}
                    <td className="px-2 py-3.5 text-center">
                      <Badge
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 border-0",
                          row.direction === "IN" 
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
                            : row.direction === "OUT"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        {row.direction}
                      </Badge>
                    </td>

                    {/* To */}
                    <td className="px-4 py-3.5">
                      <AddressCell
                        address={row.to_address}
                        isHighlighted={isHighlighted(row.to_address)}
                        isSearchedWallet={isSearched(row.to_address)}
                        onHover={() => setHoveredAddress(row.to_address)}
                        onLeave={() => setHoveredAddress(null)}
                      />
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-mono text-xs font-medium">
                        {formatEth(row.value_eth)}
                      </span>
                      <span className="text-muted-foreground text-xs ml-1">ETH</span>
                    </td>

                    {/* Fee */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatEth(row.tx_fee_eth)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-border/60 px-4 py-3 flex items-center justify-between bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(startIndex + ROWS_PER_PAGE, rows.length)} of {rows.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="text-xs h-8 px-2"
              >
                First
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs px-3 py-1 bg-muted rounded-md">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="text-xs h-8 px-2"
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
