import { Wifi, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { formatElapsedTime } from "@/hooks/useElapsedTimer";
import { cn } from "@/lib/utils";

export type ApiStatus = "idle" | "connecting" | "fetching" | "processing" | "complete" | "error";

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

  const statusStyles = {
    connecting: "bg-primary/10 border-primary/50 text-primary",
    fetching: "bg-primary/10 border-primary/50 text-primary",
    processing: "bg-primary/10 border-primary/50 text-primary",
    complete: "bg-green-500/10 border-green-500/50 text-green-600",
    error: "bg-destructive/10 border-destructive/50 text-destructive",
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-4 rounded-lg border",
      statusStyles[status] || statusStyles.connecting,
      className
    )}>
      {status === "connecting" && (
        <>
          <Wifi className="w-5 h-5 animate-pulse" />
          <span className="font-medium flex-1">Connecting to Dune API...</span>
          <span className="font-mono text-sm tabular-nums">{formatElapsedTime(elapsedSeconds)}</span>
        </>
      )}
      {status === "fetching" && (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <div className="flex-1">
            <span className="font-medium">{message}</span>
            <p className="text-xs opacity-75 mt-0.5">This may take up to 2 minutes...</p>
          </div>
          <span className="font-mono text-lg tabular-nums font-semibold">{formatElapsedTime(elapsedSeconds)}</span>
        </>
      )}
      {status === "processing" && (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium flex-1">Processing transaction data...</span>
          <span className="font-mono text-sm tabular-nums">{formatElapsedTime(elapsedSeconds)}</span>
        </>
      )}
      {status === "complete" && (
        <>
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{message}</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="w-5 h-5" />
          <div className="flex-1">
            <span className="font-medium">API Error</span>
            <p className="text-sm mt-1 opacity-90">{message}</p>
          </div>
        </>
      )}
    </div>
  );
}