import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function KPICard({ title, value, icon: Icon, trend, className }: KPICardProps) {
  return (
    <div className={cn("kpi-card", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="kpi-value">{value}</p>
          <p className="kpi-label">{title}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-sm">
          <span className={trend.isPositive ? "text-success" : "text-destructive"}>
            {trend.isPositive ? "+" : ""}{trend.value}%
          </span>
          <span className="text-muted-foreground">vs last week</span>
        </div>
      )}
    </div>
  );
}
