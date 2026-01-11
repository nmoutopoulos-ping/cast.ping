import { useStablecoinData, usePaxgData } from '@/hooks/useMarketData';
import { 
  formatMarketCap, 
  formatStablecoinPrice, 
  formatCurrencyPrice, 
  getStablecoinPriceColor 
} from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { LogIn, Coins, CircleDollarSign, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function StablecoinMarketBar() {
  const { data, loading, isAuthenticated } = useStablecoinData();
  const { data: paxgData, loading: paxgLoading } = usePaxgData();

  // Show login prompt if not authenticated
  if (!isAuthenticated && !loading) {
    return (
      <div className="rounded border bg-card p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded bg-muted p-2.5">
            <LogIn className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-sm mb-0.5">Sign in to view market data</h3>
            <p className="text-xs text-muted-foreground">
              Market prices and caps require authentication
            </p>
          </div>
          <Button size="sm" asChild className="h-8 text-xs">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading || paxgLoading) {
    return (
      <div className="rounded border bg-card p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="grid gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0 && !paxgData) {
    return (
      <div className="rounded border bg-card p-4">
        <p className="text-xs text-muted-foreground">No market data available</p>
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
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Stablecoin Summary Card */}
        <Link 
          to="/stablecoins"
          className="rounded border bg-card p-4 hover:bg-muted/30 transition-colors group"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CircleDollarSign className="w-4 h-4 text-institutional-blue" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Stablecoin Market
                </span>
              </div>
              <div className="metric-large">{formatMarketCap(totalMarketCap)}</div>
              <div className="metric-sublabel mt-1">
                {sortedData.length} stablecoins tracked
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          </div>
        </Link>

        {/* PAXG Summary Card */}
        {paxgData && (
          <Link 
            to="/paxg"
            className="rounded border border-gold/30 bg-gold-muted/30 p-4 hover:bg-gold-muted/50 transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-gold" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    PAXG
                  </span>
                </div>
                <div className="metric-large text-gold">{formatCurrencyPrice(paxgData.price_usd)}</div>
                <div className="metric-sublabel mt-1">
                  {formatMarketCap(paxgData.market_cap_usd)} market cap
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
            </div>
          </Link>
        )}
      </div>

      {/* Quick View Table */}
      <div className="rounded border bg-card">
        <div className="px-3 py-2 border-b">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Stablecoin Prices
          </span>
        </div>
        <div className="divide-y divide-border">
          {sortedData.slice(0, 5).map((coin) => (
            <div
              key={coin.ticker}
              className="flex items-center justify-between px-3 py-2 text-xs"
            >
              <span className="font-medium">{coin.ticker}</span>
              <div className="flex items-center gap-4">
                <span className={`font-mono ${getStablecoinPriceColor(coin.price_usd)}`}>
                  {formatStablecoinPrice(coin.price_usd)}
                </span>
                <span className="text-muted-foreground w-16 text-right tabular-nums">
                  {formatMarketCap(coin.market_cap_usd)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <Link 
          to="/stablecoins"
          className="flex items-center justify-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground border-t transition-colors"
        >
          View full dashboard
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Timestamp */}
      {sortedData[0] && (
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Data as of: {sortedData[0].as_of_date} {sortedData[0].as_of_time}
        </div>
      )}
    </div>
  );
}