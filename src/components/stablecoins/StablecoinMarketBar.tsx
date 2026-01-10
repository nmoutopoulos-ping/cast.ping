import { useStablecoinData } from '@/hooks/useStablecoinData';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(price);
}

function formatMarketCap(value: number | null): string {
  if (value === null) return '—';
  
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  return `$${value.toLocaleString()}`;
}

function getPriceColor(price: number): string {
  const diff = Math.abs(price - 1);
  if (diff < 0.001) return 'text-green-500';
  if (diff < 0.005) return 'text-yellow-500';
  return 'text-red-500';
}

export function StablecoinMarketBar() {
  const { data, loading, error, refetch, lastUpdated } = useStablecoinData();

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-4 overflow-x-auto">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-40 flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Failed to load stablecoin data: {error}</span>
          <Button variant="ghost" size="sm" onClick={refetch} className="ml-auto gap-1">
            <RefreshCw className="w-3 h-3" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm">No stablecoin data available yet</span>
          <Button variant="ghost" size="sm" onClick={refetch} className="ml-auto gap-1">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Stablecoin Prices</span>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          className="gap-1 h-7 px-2"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="text-xs">Refresh</span>
        </Button>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-1">
        {data.map((coin) => (
          <div
            key={coin.ticker}
            className="flex-shrink-0 rounded-md border bg-muted/30 px-4 py-2.5 min-w-[140px]"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{coin.ticker}</span>
            </div>
            <div className={`text-lg font-mono font-medium ${getPriceColor(coin.price_usd)}`}>
              {formatPrice(coin.price_usd)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              MCap: {formatMarketCap(coin.market_cap_usd)}
            </div>
          </div>
        ))}
      </div>
      
      {data.length > 0 && data[0].as_of_date && (
        <div className="text-xs text-muted-foreground mt-2">
          Data as of: {data[0].as_of_date} {data[0].as_of_time}
        </div>
      )}
    </div>
  );
}
