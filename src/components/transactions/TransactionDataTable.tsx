import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TransactionRow, AddressLabelInfo, DbTag } from "@/types/transactions";
import { ETHERSCAN_BASE, PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from "@/types/transactions";
import { formatEthValue } from "@/lib/transactionUtils";

interface TransactionDataTableProps {
  rows: TransactionRow[];
  highlightMap?: Record<string, string>;
  addressLabels?: AddressLabelInfo[];
  hiddenColumns?: Set<string>;
  tags?: DbTag[];
}

export const ALL_COLUMNS = [
  { key: "transaction_hash", label: "Tx Hash" },
  { key: "method", label: "Method" },
  { key: "block", label: "Block" },
  { key: "timestamp", label: "Timestamp" },
  { key: "from_address", label: "From" },
  { key: "interacted_with", label: "Interacted With" },
  { key: "eth_direction", label: "ETH Dir" },
  { key: "token_direction", label: "Token Dir" },
  { key: "token_from", label: "Token From" },
  { key: "token_to", label: "Token To" },
  { key: "token_amount_raw", label: "Token Amt Raw" },
  { key: "token_amount", label: "Token Amount" },
  { key: "token_symbol", label: "Token" },
  { key: "token_name", label: "Token Name" },
  { key: "token_contract", label: "Token Contract" },
  { key: "value_eth", label: "Value ETH" },
  { key: "txn_fee_eth", label: "Txn Fee ETH" },
  { key: "gas_price_gwei", label: "Gas Price (Gwei)" },
  { key: "gas_price_wei", label: "Gas Price (Wei)" },
  { key: "gas_used", label: "Gas Used" },
  { key: "status", label: "Status" },
] as const;

type ColumnKey = typeof ALL_COLUMNS[number]["key"];

const normalizeAddress = (addr?: string | null) => (addr ?? "").trim().toLowerCase();

function AddressCell({ 
  address, 
  isHighlighted, 
  highlightColor,
  onHover, 
  onLeave,
}: { 
  address: string; 
  isHighlighted: boolean;
  highlightColor?: string;
  onHover: () => void;
  onLeave: () => void;
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
        href={`${ETHERSCAN_BASE}/address/${address}`}
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

export function TransactionDataTable({ rows, highlightMap = {}, addressLabels = [], hiddenColumns: externalHiddenColumns, tags = [] }: TransactionDataTableProps) {
  const [hoveredAddress, setHoveredAddress] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const hiddenColumns = externalHiddenColumns ?? new Set<string>();
  const visibleColumns = ALL_COLUMNS.filter((col) => !hiddenColumns.has(col.key));

  useEffect(() => {
    setCurrentPage(1);
    setHoveredAddress(null);
  }, [rows]);

  // Reset to page 1 when page size changes
  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(rows.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize);

  const addressLabelMap = useMemo(() => {
    const map: Record<string, AddressLabelInfo> = {};
    addressLabels.forEach((label) => {
      map[label.address.toLowerCase()] = label;
    });
    return map;
  }, [addressLabels]);

  // Build a map of contract address (normalized lowercase) → tag info for tags with rules
  const tagRulesMap = useMemo(() => {
    const map: Record<
      string,
      { decimals: number | null; token_symbol: string | null; token_name: string | null }
    > = {};

    tags.forEach((tag) => {
      const key = normalizeAddress(tag.contract_address);
      if (!key) return;

      map[key] = {
        decimals: tag.decimals ?? null,
        token_symbol: tag.token_symbol ?? null,
        token_name: tag.token_name ?? null,
      };
    });

    return map;
  }, [tags]);

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

  const getHighlightColor = (address: string | null | undefined): string | undefined => {
    if (!address) return undefined;
    return highlightMap[address.toLowerCase()];
  };

  const hoveredLabel = hoveredAddress ? addressLabelMap[hoveredAddress.toLowerCase()] : null;

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "yyyy-MM-dd HH:mm");
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

  // Format token amount based on decimal rule
  const formatTokenAmount = (row: TransactionRow): string => {
    const contractKey = normalizeAddress(row.token_contract);
    if (!contractKey) return "-";

    const tagRule = tagRulesMap[contractKey];
    const decimals = tagRule?.decimals;
    if (decimals == null) return "No Rule";

    const rawValue = row.token_amount_raw;
    if (!rawValue || rawValue === "-") return "-";

    try {
      const rawBigInt = BigInt(String(rawValue));
      const divisor = BigInt(10) ** BigInt(decimals);
      const wholePart = rawBigInt / divisor;
      const remainder = rawBigInt % divisor;

      // Format whole part with commas
      const wholePartWithCommas = wholePart.toLocaleString("en-US");

      if (remainder === BigInt(0)) {
        return wholePartWithCommas;
      }

      const remainderStr = remainder.toString().padStart(decimals, "0");
      const trimmedRemainder = remainderStr.replace(/0+$/, "");
      return `${wholePartWithCommas}.${trimmedRemainder}`;
    } catch {
      return "No Rule";
    }
  };

  // Get token symbol from tag rule or fallback to row data
  const getTokenSymbol = (row: TransactionRow): string => {
    const contractKey = normalizeAddress(row.token_contract);
    if (!contractKey) return row.token_symbol || "-";

    const tagRule = tagRulesMap[contractKey];
    return tagRule?.token_symbol || row.token_symbol || "-";
  };

  // Get token name from tag rule or fallback to row data
  const getTokenName = (row: TransactionRow): string => {
    const contractKey = normalizeAddress(row.token_contract);
    if (!contractKey) return row.token_name || "-";

    const tagRule = tagRulesMap[contractKey];
    return tagRule?.token_name || row.token_name || "-";
  };

  const renderCell = (row: TransactionRow, columnKey: ColumnKey) => {
    switch (columnKey) {
      case "transaction_hash":
        return (
          <a
            href={`${ETHERSCAN_BASE}/tx/${row.transaction_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline whitespace-nowrap"
          >
            {row.transaction_hash}
            <ExternalLink className="w-3 h-3 opacity-50" />
          </a>
        );
      case "method":
        return row.method ? (
          <a
            href={`${ETHERSCAN_BASE}/tx/${row.transaction_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 hover:bg-primary/10 hover:border-primary/50 transition-colors cursor-pointer">
              {row.method}
            </Badge>
          </a>
        ) : (
          <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5">
            -
          </Badge>
        );
      case "block":
        return (
          <a
            href={`${ETHERSCAN_BASE}/block/${row.block}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-primary/80 hover:text-primary hover:underline"
          >
            {row.block?.toLocaleString()}
          </a>
        );
      case "timestamp":
        return (
          <span 
            className="text-xs text-muted-foreground cursor-help whitespace-nowrap"
            title={formatFullTime(row.timestamp)}
          >
            {formatTimestamp(row.timestamp)}
          </span>
        );
      case "from_address":
        return (
          <AddressCell
            address={row.from_address}
            isHighlighted={isHighlighted(row.from_address)}
            highlightColor={getHighlightColor(row.from_address)}
            onHover={() => setHoveredAddress(row.from_address)}
            onLeave={() => setHoveredAddress(null)}
          />
        );
      case "interacted_with":
        return (
          <AddressCell
            address={row.interacted_with}
            isHighlighted={isHighlighted(row.interacted_with)}
            highlightColor={getHighlightColor(row.interacted_with)}
            onHover={() => setHoveredAddress(row.interacted_with)}
            onLeave={() => setHoveredAddress(null)}
          />
        );
      case "eth_direction":
        return (
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
        );
      case "token_direction":
        return row.token_direction ? (
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
        );
      case "token_from":
        return row.token_from ? (
          <AddressCell
            address={row.token_from}
            isHighlighted={isHighlighted(row.token_from)}
            highlightColor={getHighlightColor(row.token_from)}
            onHover={() => setHoveredAddress(row.token_from)}
            onLeave={() => setHoveredAddress(null)}
          />
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );
      case "token_to":
        return row.token_to ? (
          <AddressCell
            address={row.token_to}
            isHighlighted={isHighlighted(row.token_to)}
            highlightColor={getHighlightColor(row.token_to)}
            onHover={() => setHoveredAddress(row.token_to)}
            onLeave={() => setHoveredAddress(null)}
          />
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );
      case "token_amount_raw":
        return (
          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
            {row.token_amount_raw || "-"}
          </span>
        );
      case "token_amount": {
        const formattedAmount = formatTokenAmount(row);
        const isNoRule = formattedAmount === "No Rule";
        return (
          <span className={cn("font-mono text-xs whitespace-nowrap", isNoRule ? "text-muted-foreground italic" : "font-medium")}>
            {formattedAmount}
          </span>
        );
      }
      case "token_symbol":
        return (
          <span className="font-mono text-xs font-medium">
            {getTokenSymbol(row)}
          </span>
        );
      case "token_name":
        return (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {getTokenName(row)}
          </span>
        );
      case "token_contract":
        return row.token_contract ? (
          <AddressCell
            address={row.token_contract}
            isHighlighted={isHighlighted(row.token_contract)}
            highlightColor={getHighlightColor(row.token_contract)}
            onHover={() => setHoveredAddress(row.token_contract)}
            onLeave={() => setHoveredAddress(null)}
          />
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );
      case "value_eth":
        return (
          <span className="font-mono text-xs font-medium whitespace-nowrap">
            {formatEthValue(row.value_eth)}
          </span>
        );
      case "txn_fee_eth":
        return (
          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
            {formatEthValue(row.txn_fee_eth)}
          </span>
        );
      case "gas_price_gwei":
        return (
          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
            {row.gas_price_gwei != null ? row.gas_price_gwei.toLocaleString() : "-"}
          </span>
        );
      case "gas_price_wei":
        return (
          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
            {row.gas_price_wei != null ? row.gas_price_wei.toLocaleString() : "-"}
          </span>
        );
      case "gas_used":
        return (
          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
            {row.gas_used?.toLocaleString() ?? "-"}
          </span>
        );
      case "status":
        return (
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
        );
      default:
        return null;
    }
  };

  const getColumnAlignment = (key: ColumnKey): string => {
    const rightAligned = ["token_amount_raw", "token_amount", "value_eth", "txn_fee_eth", "gas_price_gwei", "gas_price_wei", "gas_used"];
    const centerAligned = ["eth_direction", "token_direction", "status"];
    if (rightAligned.includes(key)) return "text-right";
    if (centerAligned.includes(key)) return "text-center";
    return "text-left";
  };

  return (
    <div className="space-y-4">
      {/* Hover indicator */}
      <div className="flex items-center gap-4 h-5 px-1">
        {hoveredAddress && (
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full ring-1"
              style={{
                backgroundColor: hoveredLabel ? `${hoveredLabel.color}50` : "rgb(245 158 11 / 0.3)",
                boxShadow: hoveredLabel ? `0 0 0 1px ${hoveredLabel.color}80` : "0 0 0 1px rgb(245 158 11 / 0.5)",
              }}
            />
            <span className="text-xs text-muted-foreground">
              {addressCounts[hoveredAddress.toLowerCase()] || 0} occurrences
              {hoveredLabel && (
                <span 
                  className="ml-1.5 font-medium"
                  style={{ color: hoveredLabel.color }}
                >
                  ({hoveredLabel.type === "entity" ? "Entity" : "Tag"}: {hoveredLabel.name})
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="overflow-auto scrollbar-thin max-h-[70vh]">
          <table className="w-full min-w-max text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border/60 bg-muted">
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "font-medium text-muted-foreground px-4 py-3.5 text-xs uppercase tracking-wider whitespace-nowrap bg-muted",
                      getColumnAlignment(col.key)
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginatedRows.map((row, index) => (
                <tr 
                  key={`${row.transaction_hash}-${startIndex + index}`}
                  className="transition-colors duration-100 hover:bg-muted/40"
                >
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-4 py-3.5", getColumnAlignment(col.key))}
                    >
                      {renderCell(row, col.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + pageSize, rows.length)} of {rows.length}
              </span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-7 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)} className="text-xs">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
