import { ArrowLeftRight, Flame, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MethodType, TransactionRow } from "@/types/transactions";
import { useMemo } from "react";

interface MethodFiltersProps {
  rows: TransactionRow[];
  methodFilters: MethodType[];
  onMethodFiltersChange: (methods: MethodType[]) => void;
  onViewChanged?: () => void;
}

export function MethodFilters({
  rows,
  methodFilters,
  onMethodFiltersChange,
  onViewChanged,
}: MethodFiltersProps) {
  const methodCounts = useMemo(() => {
    const counts = { transfer: 0, mint: 0, burn: 0 };
    rows.forEach((row) => {
      const method = row.method?.toLowerCase() || "";
      if (method.includes("transfer")) counts.transfer++;
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
    onViewChanged?.();
  };

  const hasAnyMethodTransactions = methodCounts.transfer > 0 || methodCounts.mint > 0 || methodCounts.burn > 0;

  if (!hasAnyMethodTransactions) return null;

  return (
    <div className="flex items-center gap-1.5">
      {methodCounts.transfer > 0 && (
        <button
          onClick={() => toggleMethodFilter("transfer")}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border",
            isMethodActive("transfer")
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground"
          )}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Transfers
          <Badge 
            variant={isMethodActive("transfer") ? "secondary" : "outline"} 
            className="text-[10px] px-1.5 py-0 h-4"
          >
            {methodCounts.transfer}
          </Badge>
          {isMethodActive("transfer") && <X className="w-3 h-3" />}
        </button>
      )}
      {methodCounts.mint > 0 && (
        <button
          onClick={() => toggleMethodFilter("mint")}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border",
            isMethodActive("mint")
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Mints
          <Badge 
            variant={isMethodActive("mint") ? "secondary" : "outline"} 
            className="text-[10px] px-1.5 py-0 h-4"
          >
            {methodCounts.mint}
          </Badge>
          {isMethodActive("mint") && <X className="w-3 h-3" />}
        </button>
      )}
      {methodCounts.burn > 0 && (
        <button
          onClick={() => toggleMethodFilter("burn")}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border",
            isMethodActive("burn")
              ? "bg-orange-600 text-white border-orange-600 shadow-sm"
              : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground"
          )}
        >
          <Flame className="w-3.5 h-3.5" />
          Burns
          <Badge 
            variant={isMethodActive("burn") ? "secondary" : "outline"} 
            className="text-[10px] px-1.5 py-0 h-4"
          >
            {methodCounts.burn}
          </Badge>
          {isMethodActive("burn") && <X className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}
