import { formatDistanceToNow } from "date-fns";
import { AddressDisplay } from "@/components/shared/AddressDisplay";
import { DirectionBadge } from "@/components/shared/DirectionBadge";
import type { TokenTransfer } from "@/types/wallet";

interface TokenTransfersTableProps {
  transfers: TokenTransfer[];
}

export function TokenTransfersTable({ transfers }: TokenTransfersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Block</th>
            <th>Age</th>
            <th>Token</th>
            <th>Direction</th>
            <th>From</th>
            <th>To</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((transfer) => (
            <tr key={transfer.hash}>
              <td className="font-mono text-sm">{transfer.block.toLocaleString()}</td>
              <td className="text-muted-foreground">
                {formatDistanceToNow(transfer.timestamp, { addSuffix: true })}
              </td>
              <td>
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-accent text-accent-foreground text-xs font-medium">
                  {transfer.tokenSymbol}
                </span>
              </td>
              <td>
                <DirectionBadge direction={transfer.direction} />
              </td>
              <td>
                <AddressDisplay address={transfer.from} />
              </td>
              <td>
                <AddressDisplay address={transfer.to} />
              </td>
              <td className="text-right font-mono">{transfer.amount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
