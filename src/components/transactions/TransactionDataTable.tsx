import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QueryRow {
  transaction_hash: string;
  method: string;
  block: number;
  timestamp: string;
  from_address: string;
  interacted_with: string;
  eth_direction: string;
  token_direction: string;
  token_from: string;
  token_to: string;
  token_amount_raw: string;
  token_amount: number;
  token_symbol: string;
  token_name: string;
  token_contract: string;
  value_eth: number;
  txn_fee_eth: number;
  gas_price_gwei: number;
  gas_price_wei: number;
  gas_used: number;
  status: string;
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
        "group inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors duration-75 cursor-pointer",
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

  useEffect(() => {
    setCurrentPage(1);
    setHoveredAddress(null);
  }, [rows, searchedWallet]);

  const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const paginatedRows = rows.slice(startIndex, startIndex + ROWS_PER_PAGE);

  // Pre-calculate address occurrences for visual feedback
  const addressCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((row) => {
      if (row.from_address) counts[row.from_address.toLowerCase()] = (counts[row.from_address.toLowerCase()] || 0) + 1;
      if (row.interacted_with) counts[row.interacted_with.toLowerCase()] = (counts[row.interacted_with.toLowerCase()] || 0) + 1;
      if (row.token_contract) counts[row.token_contract.toLowerCase()] = (counts[row.token_contract.toLowerCase()] || 0) + 1;
      if (row.token_from) counts[row.token_from.toLowerCase()] = (counts[row.token_from.toLowerCase()] || 0) + 1;
      if (row.token_to) counts[row.token_to.toLowerCase()] = (counts[row.token_to.toLowerCase()] || 0) + 1;
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

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  const formatFullTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "MMM d, yyyy HH:mm:ss");
    } catch {
      return timestamp;
    }
  };

  const formatEth = (value: number | string | null | undefined) => {
    if (value == null || value === "") return "-";
    if (typeof value === "string") return value;
    if (!Number.isFinite(value)) return "-";
    if (value === 0) return "0";
    const fixed = value.toFixed(18);
    return fixed.replace(/\.?0+$/, "");
  };

  return (
    <div className="space-y-4">
      {/* Hover indicator - fixed height to prevent layout shift */}
      <div className="flex items-center gap-4 px-1 h-5">
        {hoveredAddress && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500/30 ring-1 ring-amber-500/50" />
            <span className="text-xs text-muted-foreground">
              {addressCounts[hoveredAddress.toLowerCase()] || 0} occurrences highlighted
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Tx Hash</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Method</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Block</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">From</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Interacted With</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">ETH Dir</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Token Dir</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Token From</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Token To</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Token Amt Raw</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Token Amount</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Token</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Token Name</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Token Contract</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Value ETH</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Txn Fee ETH</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Gas Price (Gwei)</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Gas Price (Wei)</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Gas Used</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
            {paginatedRows.map((row, index) => {
                return (
                  <tr 
                    key={`${row.transaction_hash}-${startIndex + index}`}
                    className="transition-colors duration-100 hover:bg-muted/40"
                  >
                    {/* Tx Hash */}
                    <td className="px-4 py-3.5">
                      <a
                        href={`${ETHERSCAN_BASE}/tx/${row.transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline whitespace-nowrap"
                      >
                        {row.transaction_hash}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    </td>

                    {/* Method */}
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5">
                        {row.method || "-"}
                      </Badge>
                    </td>

                    {/* Block */}
                    <td className="px-4 py-3.5">
                      <a
                        href={`${ETHERSCAN_BASE}/block/${row.block}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary/80 hover:text-primary hover:underline"
                      >
                        {row.block?.toLocaleString()}
                      </a>
                    </td>

                    {/* Timestamp */}
                    <td className="px-4 py-3.5">
                      <span 
                        className="text-xs text-muted-foreground cursor-help whitespace-nowrap"
                        title={formatFullTime(row.timestamp)}
                      >
                        {formatTimestamp(row.timestamp)}
                      </span>
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

                    {/* Interacted With */}
                    <td className="px-4 py-3.5">
                      <AddressCell
                        address={row.interacted_with}
                        isHighlighted={isHighlighted(row.interacted_with)}
                        isSearchedWallet={isSearched(row.interacted_with)}
                        onHover={() => setHoveredAddress(row.interacted_with)}
                        onLeave={() => setHoveredAddress(null)}
                      />
                    </td>

                    {/* ETH Direction */}
                    <td className="px-4 py-3.5 text-center">
                      <Badge
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 border-0",
                          row.eth_direction === "IN" 
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
                            : row.eth_direction === "OUT"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        {row.eth_direction || "-"}
                      </Badge>
                    </td>

                    {/* Token Direction */}
                    <td className="px-4 py-3.5 text-center">
                      {row.token_direction ? (
                        <Badge
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 border-0",
                            row.token_direction === "IN" 
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
                              : row.token_direction === "OUT"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                          )}
                        >
                          {row.token_direction}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>

                    {/* Token From */}
                    <td className="px-4 py-3.5">
                      {row.token_from ? (
                        <AddressCell
                          address={row.token_from}
                          isHighlighted={isHighlighted(row.token_from)}
                          isSearchedWallet={isSearched(row.token_from)}
                          onHover={() => setHoveredAddress(row.token_from)}
                          onLeave={() => setHoveredAddress(null)}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>

                    {/* Token To */}
                    <td className="px-4 py-3.5">
                      {row.token_to ? (
                        <AddressCell
                          address={row.token_to}
                          isHighlighted={isHighlighted(row.token_to)}
                          isSearchedWallet={isSearched(row.token_to)}
                          onHover={() => setHoveredAddress(row.token_to)}
                          onLeave={() => setHoveredAddress(null)}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>

                    {/* Token Amount Raw */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {row.token_amount_raw || "-"}
                      </span>
                    </td>

                    {/* Token Amount */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-mono text-xs font-medium whitespace-nowrap">
                        {row.token_amount != null ? formatEth(row.token_amount) : "-"}
                      </span>
                    </td>

                    {/* Token Symbol */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-medium">
                        {row.token_symbol || "-"}
                      </span>
                    </td>

                    {/* Token Name */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {row.token_name || "-"}
                      </span>
                    </td>

                    {/* Token Contract */}
                    <td className="px-4 py-3.5">
                      {row.token_contract ? (
                        <AddressCell
                          address={row.token_contract}
                          isHighlighted={isHighlighted(row.token_contract)}
                          isSearchedWallet={false}
                          onHover={() => setHoveredAddress(row.token_contract)}
                          onLeave={() => setHoveredAddress(null)}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>

                    {/* Value ETH */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-mono text-xs font-medium whitespace-nowrap">
                        {formatEth(row.value_eth)}
                      </span>
                    </td>

                    {/* Txn Fee ETH */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {formatEth(row.txn_fee_eth)}
                      </span>
                    </td>

                    {/* Gas Price (Gwei) */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {row.gas_price_gwei != null ? row.gas_price_gwei.toLocaleString() : "-"}
                      </span>
                    </td>

                    {/* Gas Price (Wei) */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {row.gas_price_wei != null ? row.gas_price_wei.toLocaleString() : "-"}
                      </span>
                    </td>

                    {/* Gas Used */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {row.gas_used?.toLocaleString() ?? "-"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      <Badge
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 border-0",
                          row.status === "success" || row.status === "Success"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
                            : "bg-red-500/15 text-red-600 dark:text-red-400"
                        )}
                      >
                        {row.status || "-"}
                      </Badge>
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
