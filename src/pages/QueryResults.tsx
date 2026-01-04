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
}

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

  const formatHash = (hash: string) => {
    if (!hash) return "";
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const formatBlockTime = (blockTime: string) => {
    try {
      return format(new Date(blockTime), "yyyy-MM-dd HH:mm");
    } catch {
      return blockTime;
    }
  };

  const formatEth = (value: number) => {
    if (value === 0) return "0";
    if (value < 0.0001) return value.toExponential(2);
    return value.toFixed(6);
  };

  if (loading) {
    return (
      <div className="space-y-4">
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
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Query Results</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Query Results</h1>
        <span className="text-sm text-muted-foreground">{rows.length} rows</span>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>tx_hash</TableHead>
              <TableHead>block_number</TableHead>
              <TableHead>block_time</TableHead>
              <TableHead>direction</TableHead>
              <TableHead>from_address</TableHead>
              <TableHead>to_address</TableHead>
              <TableHead>nonce</TableHead>
              <TableHead>tx_index</TableHead>
              <TableHead>value_eth</TableHead>
              <TableHead>tx_fee_eth</TableHead>
              <TableHead>gas_price</TableHead>
              <TableHead>gas_used</TableHead>
              <TableHead>success</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.tx_hash || index}>
                <TableCell className="font-mono text-xs">
                  {formatHash(row.tx_hash)}
                </TableCell>
                <TableCell>{row.block_number}</TableCell>
                <TableCell className="whitespace-nowrap">{formatBlockTime(row.block_time)}</TableCell>
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
                <TableCell className="font-mono text-xs">
                  {formatAddress(row.from_address)}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {formatAddress(row.to_address)}
                </TableCell>
                <TableCell>{row.nonce}</TableCell>
                <TableCell>{row.transaction_index}</TableCell>
                <TableCell className="font-mono text-xs">{formatEth(row.value_eth)}</TableCell>
                <TableCell className="font-mono text-xs">{formatEth(row.tx_fee_eth)}</TableCell>
                <TableCell>{row.gas_price}</TableCell>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
