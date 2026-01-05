import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Copy, Check, ChevronLeft, ChevronRight, Columns } from "lucide-react";
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

interface EntityTagInfo {
  address: string;
  name: string;
  color: string;
  type: "entity" | "tag";
}

interface TransactionDataTableProps {
  rows: QueryRow[];
  highlightMap?: Record<string, string>;
  addressLabels?: EntityTagInfo[];
}

const ETHERSCAN_BASE = "https://sepolia.etherscan.io";
const ROWS_PER_PAGE = 25;

const ALL_COLUMNS = [
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

export function TransactionDataTable({ rows, highlightMap = {}, addressLabels = [] }: TransactionDataTableProps) {
  const [hoveredAddress, setHoveredAddress] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnKey>>(new Set());

  const toggleColumn = (key: ColumnKey) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const visibleColumns = ALL_COLUMNS.filter((col) => !hiddenColumns.has(col.key));

  useEffect(() => {
    setCurrentPage(1);
    setHoveredAddress(null);
  }, [rows]);

  const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const paginatedRows = rows.slice(startIndex, startIndex + ROWS_PER_PAGE);

  // Build address -> label name lookup
  const addressLabelMap = useMemo(() => {
    const map: Record<string, EntityTagInfo> = {};
    addressLabels.forEach((label) => {
      map[label.address.toLowerCase()] = label;
    });
    return map;
  }, [addressLabels]);

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

  // Get highlight color for an address from the highlightMap
  const getHighlightColor = (address: string | null | undefined): string | undefined => {
    if (!address) return undefined;
    return highlightMap[address.toLowerCase()];
  };

  // Get label info for hovered address
  const hoveredLabel = hoveredAddress ? addressLabelMap[hoveredAddress.toLowerCase()] : null;


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

  const isColumnVisible = (key: ColumnKey) => !hiddenColumns.has(key);

  const renderCell = (row: QueryRow, columnKey: ColumnKey) => {
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
        return (
          <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5">
            {row.method || "-"}
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
      case "token_amount":
        return (
          <span className="font-mono text-xs font-medium whitespace-nowrap">
            {row.token_amount != null ? formatEth(row.token_amount) : "-"}
          </span>
        );
      case "token_symbol":
        return (
          <span className="font-mono text-xs font-medium">
            {row.token_symbol || "-"}
          </span>
        );
      case "token_name":
        return (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {row.token_name || "-"}
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
            {formatEth(row.value_eth)}
          </span>
        );
      case "txn_fee_eth":
        return (
          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
            {formatEth(row.txn_fee_eth)}
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
      {/* Controls row */}
      <div className="flex items-center justify-between px-1">
        {/* Hover indicator - fixed height to prevent layout shift */}
        <div className="flex items-center gap-4 h-5">
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

        {/* Column visibility toggle */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Columns className="w-4 h-4" />
              Columns
              {hiddenColumns.size > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {ALL_COLUMNS.length - hiddenColumns.size}/{ALL_COLUMNS.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-2 max-h-80 overflow-y-auto">
            <div className="space-y-1">
              {ALL_COLUMNS.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={!hiddenColumns.has(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
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
