import { useStablecoinData } from '@/hooks/useStablecoinData';
import { usePaxgData } from '@/hooks/usePaxgData';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp, AlertCircle, LogIn, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

function formatPrice(price: number): string {
  return price.toFixed(6);
}

function formatPaxgPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
  const { data, loading, error, refetch, lastUpdated, isAuthenticated } = useStablecoinData();
  const { data: paxgData, loading: paxgLoading, refetch: refetchPaxg } = usePaxgData();

  const handleRefresh = () => {
    refetch();
    refetchPaxg();
  };

  // Show login prompt if not authenticated
  if (!isAuthenticated && !loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-muted p-3">
            <LogIn className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium mb-1">Sign in to view market data</h3>
            <p className="text-sm text-muted-foreground">
              Market prices and caps require authentication
            </p>
          </div>
          <Button asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading || paxgLoading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-20 w-full mb-4" />
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
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
          <span className="text-sm">Failed to load market data: {error}</span>
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto gap-1">
            <RefreshCw className="w-3 h-3" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (data.length === 0 && !paxgData) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm">No market data available yet</span>
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto gap-1">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  // Sort by market cap descending
  const sortedData = [...data].sort((a, b) => 
    (b.market_cap_usd ?? 0) - (a.market_cap_usd ?? 0)
  );

  // Calculate total market cap
  const totalMarketCap = sortedData.reduce(
    (sum, coin) => sum + (coin.market_cap_usd ?? 0), 
    0
  );

  return (
    <div className="space-y-4">
      {/* PAXG Section */}
      {paxgData && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Gold-Backed Assets</span>
            </div>
          </div>
          
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg">{paxgData.ticker}</span>
                <span className="text-xl font-mono font-semibold text-yellow-600 dark:text-yellow-400">
                  {formatPaxgPrice(paxgData.price_usd)}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold text-foreground">
                  {formatMarketCap(paxgData.market_cap_usd)}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Market Cap
                </div>
              </div>
            </div>
          </div>
          
          {paxgData.as_of_date && (
            <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
              Data as of: {paxgData.as_of_date} {paxgData.as_of_time}
            </div>
          )}
        </div>
      )}

      {/* Stablecoin Section */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Stablecoin Market</span>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="gap-1 h-7 px-2"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="text-xs">Refresh</span>
          </Button>
        </div>

        {/* Total Market Cap Summary */}
        <div className="rounded-lg bg-primary/10 border border-primary/20 px-5 py-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Total Stablecoin Market Cap
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatMarketCap(totalMarketCap)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                {sortedData.length} stablecoins tracked
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid gap-3">
          {sortedData.map((coin) => (
            <div
              key={coin.ticker}
              className="rounded-lg border bg-muted/30 px-5 py-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{coin.ticker}</span>
                  <span className={`text-xl font-mono font-semibold ${getPriceColor(coin.price_usd)}`}>
                    {formatPrice(coin.price_usd)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold text-foreground">
                    {formatMarketCap(coin.market_cap_usd)}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    Market Cap
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {sortedData.length > 0 && sortedData[0].as_of_date && (
          <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
            Data as of: {sortedData[0].as_of_date} {sortedData[0].as_of_time}
          </div>
        )}
      </div>
    </div>
  );
}
