import { formatDistanceToNow } from "date-fns";
import { AddressDisplay } from "@/components/shared/AddressDisplay";
import { DirectionBadge } from "@/components/shared/DirectionBadge";
import type { Transaction } from "@/types/wallet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TransactionsTableProps {
  transactions: Transaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="overflow-x-auto flex-1">
        <table className="data-table">
          <thead>
            <tr>
              <th>Block</th>
              <th>Age</th>
              <th>Direction</th>
              <th>From</th>
              <th>To</th>
              <th className="text-right">Value (ETH)</th>
              <th className="text-right">Fee (ETH)</th>
              <th>Tx Hash</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.hash}>
                <td className="font-mono text-sm">{tx.block.toLocaleString()}</td>
                <td className="text-muted-foreground">
                  {formatDistanceToNow(tx.timestamp, { addSuffix: true })}
                </td>
                <td>
                  <DirectionBadge direction={tx.direction} />
                </td>
                <td>
                  <AddressDisplay address={tx.from} />
                </td>
                <td>
                  <AddressDisplay address={tx.to} />
                </td>
                <td className="text-right font-mono">{tx.value.toFixed(4)}</td>
                <td className="text-right font-mono text-muted-foreground">{tx.fee.toFixed(4)}</td>
                <td>
                  <AddressDisplay address={tx.hash} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="border-t border-border px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Showing 1-{transactions.length} of {transactions.length} transactions
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" disabled>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
