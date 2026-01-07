import { Wifi, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { formatElapsedTime } from "@/hooks/useElapsedTimer";
import { cn } from "@/lib/utils";
import type { ApiStatus } from "@/types/transactions";

// Re-export for backwards compatibility
export type { ApiStatus } from "@/types/transactions";

interface ApiStatusIndicatorProps {
  status: ApiStatus;
  message: string;
  elapsedSeconds?: number;
  className?: string;
}

export function ApiStatusIndicator({
  status,
  message,
  elapsedSeconds = 0,
  className,
}: ApiStatusIndicatorProps) {
  if (status === "idle") return null;

  const statusConfig = {
    connecting: {
      styles: "bg-primary/8 border-primary/30 text-primary",
      icon: <Wifi className="w-4 h-4 animate-pulse" />,
    },
    fetching: {
      styles: "bg-primary/8 border-primary/30 text-primary",
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    processing: {
      styles: "bg-primary/8 border-primary/30 text-primary",
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    complete: {
      styles: "bg-success/8 border-success/30 text-success",
      icon: <CheckCircle className="w-4 h-4" />,
    },
    error: {
      styles: "bg-destructive/8 border-destructive/30 text-destructive",
      icon: <AlertCircle className="w-4 h-4" />,
    },
  };

  const config = statusConfig[status] || statusConfig.connecting;

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3.5 rounded-lg border",
      config.styles,
      className
    )}>
      {config.icon}
      
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">
          {status === "connecting" && "Connecting to Dune API..."}
          {status === "fetching" && message}
          {status === "processing" && "Processing transaction data..."}
          {status === "complete" && message}
          {status === "error" && "API Error"}
        </span>
        {status === "fetching" && (
          <p className="text-xs opacity-70 mt-0.5">This may take up to 2 minutes...</p>
        )}
        {status === "error" && message && (
          <p className="text-xs opacity-80 mt-0.5 truncate">{message}</p>
        )}
      </div>

      {["connecting", "fetching", "processing"].includes(status) && (
        <span className={cn(
          "font-mono tabular-nums shrink-0",
          status === "fetching" ? "text-base font-semibold" : "text-sm"
        )}>
          {formatElapsedTime(elapsedSeconds)}
        </span>
      )}
    </div>
  );
}