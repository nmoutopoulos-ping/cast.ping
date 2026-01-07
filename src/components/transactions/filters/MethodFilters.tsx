import { ArrowLeftRight, Flame, Sparkles, Wallet } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { MethodType, TransactionRow } from "@/types/transactions";
import { useMemo } from "react";

interface MethodFiltersProps {
  rows: TransactionRow[];
  methodFilters: MethodType[];
  onMethodFiltersChange: (methods: MethodType[]) => void;
}

const METHOD_CONFIG = {
  native: { icon: Wallet, label: "Native" },
  transfer: { icon: ArrowLeftRight, label: "Transfers" },
  mint: { icon: Sparkles, label: "Mints" },
  burn: { icon: Flame, label: "Burns" },
} as const;

export function MethodFilters({
  rows,
  methodFilters,
  onMethodFiltersChange,
}: MethodFiltersProps) {
  const methodCounts = useMemo(() => {
    const counts = { native: 0, transfer: 0, mint: 0, burn: 0 };
    rows.forEach((row) => {
      const method = row.method?.toLowerCase() || "";
      if (method.includes("native")) counts.native++;
      else if (method.includes("transfer")) counts.transfer++;
      else if (method.includes("mint")) counts.mint++;
      else if (method.includes("burn")) counts.burn++;
    });
    return counts;
  }, [rows]);

  const isMethodActive = (method: MethodType) => methodFilters.includes(method);

  const toggleMethodFilter = (method: MethodType) => {
    if (isMethodActive(method)) {
      onMethodFiltersChange(methodFilters.filter((m) => m !== method));
    } else {
      onMethodFiltersChange([...methodFilters, method]);
    }
  };

  const hasAnyMethodTransactions = Object.values(methodCounts).some(c => c > 0);
  if (!hasAnyMethodTransactions) return null;

  const methods: MethodType[] = ["native", "transfer", "mint", "burn"];

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-background p-0.5">
      {methods.map((method) => {
        if (methodCounts[method] === 0) return null;
        
        const config = METHOD_CONFIG[method];
        const Icon = config.icon;
        const isActive = isMethodActive(method);

        return (
          <button
            key={method}
            onClick={() => toggleMethodFilter(method)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all rounded-md",
              isActive
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{config.label}</span>
            <span className={cn(
              "tabular-nums ml-0.5",
              isActive ? "text-background/70" : "text-muted-foreground/60"
            )}>
              {formatNumber(methodCounts[method])}
            </span>
          </button>
        );
      })}
    </div>
  );
}
