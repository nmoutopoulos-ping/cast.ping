import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyableAddress } from "@/components/shared/CopyableAddress";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";

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

const ETHERSCAN_BASE = "https://sepolia.etherscan.io";

export default function QueryResults() {
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.functions.invoke("dune-query", {
        body: { queryId: "6459204" },
      });

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (data?.result?.rows) {
        setRows(data.result.rows);
      } else if (data?.error) {
        setError(data.error);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  const formatBlockTime = (blockTime: string) => {
    try {
      return format(new Date(blockTime), "yyyy-MM-dd HH:mm");
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

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Query Results</h1>
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Query Results</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Query Results</h1>
        <span className="text-sm text-muted-foreground">{rows.length} rows</span>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">tx_hash</TableHead>
              <TableHead>block</TableHead>
              <TableHead>time</TableHead>
              <TableHead>dir</TableHead>
              <TableHead className="min-w-[380px]">from_address</TableHead>
              <TableHead className="min-w-[380px]">to_address</TableHead>
              <TableHead>nonce</TableHead>
              <TableHead>idx</TableHead>
              <TableHead>value_eth</TableHead>
              <TableHead>fee_eth</TableHead>
              <TableHead>gas_price</TableHead>
              <TableHead>gas_used</TableHead>
              <TableHead>ok</TableHead>
              <TableHead className="min-w-[380px]">token_contract</TableHead>
              <TableHead>token_symbol</TableHead>
              <TableHead>token_name</TableHead>
              <TableHead>token_amount_raw</TableHead>
              <TableHead>token_amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.tx_hash || index}>
                <TableCell>
                  <a
                    href={`${ETHERSCAN_BASE}/tx/${row.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                  >
                    {row.tx_hash?.slice(0, 10)}...
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </TableCell>
                <TableCell>{row.block_number}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{formatBlockTime(row.block_time)}</TableCell>
                <TableCell>
                  <Badge
                    variant={row.direction === "IN" ? "default" : "secondary"}
                    className={
                      row.direction === "IN"
                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                        : "bg-slate-500/10 text-slate-600 hover:bg-slate-500/20"
                    }
                  >
                    {row.direction}
                  </Badge>
                </TableCell>
                <TableCell>
                  <CopyableAddress address={row.from_address} />
                </TableCell>
                <TableCell>
                  <CopyableAddress address={row.to_address} />
                </TableCell>
                <TableCell>{row.nonce}</TableCell>
                <TableCell>{row.transaction_index}</TableCell>
                <TableCell className="font-mono text-xs">{formatEth(row.value_eth)}</TableCell>
                <TableCell className="font-mono text-xs">{formatEth(row.tx_fee_eth)}</TableCell>
                <TableCell className="text-xs">{row.gas_price}</TableCell>
                <TableCell>{row.gas_used}</TableCell>
                <TableCell>
                  <Badge
                    variant={row.success ? "default" : "destructive"}
                    className={
                      row.success
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-600"
                    }
                  >
                    {row.success ? "✓" : "✗"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {row.token_contract ? <CopyableAddress address={row.token_contract} /> : "-"}
                </TableCell>
                <TableCell className="font-mono text-xs">{row.token_symbol || "-"}</TableCell>
                <TableCell className="text-xs">{row.token_name || "-"}</TableCell>
                <TableCell className="font-mono text-xs">{row.token_amount_raw || "-"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {row.token_amount != null ? formatEth(row.token_amount) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
