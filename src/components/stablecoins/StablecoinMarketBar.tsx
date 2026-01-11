import { useStablecoinData, usePaxgData } from '@/hooks/useMarketData';
import { MarketSnapshot } from '@/types/transactions';
import { 
  formatMarketCap, 
  formatStablecoinPrice, 
  formatCurrencyPrice, 
  getStablecoinPriceColor 
} from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp, AlertCircle, LogIn, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

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
        <MarketSection
          icon={<Coins className="w-4 h-4 text-yellow-500" />}
          title="Gold-Backed Assets"
          asOfDate={paxgData.as_of_date}
          asOfTime={paxgData.as_of_time}
        >
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-5 py-4">
            <MarketRow
              ticker={paxgData.ticker}
              price={formatCurrencyPrice(paxgData.price_usd)}
              priceColorClass="text-yellow-600 dark:text-yellow-400"
              marketCap={paxgData.market_cap_usd}
            />
          </div>
        </MarketSection>
      )}

      {/* Stablecoin Section */}
      <MarketSection
        icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
        title="Stablecoin Market"
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        asOfDate={sortedData[0]?.as_of_date}
        asOfTime={sortedData[0]?.as_of_time}
      >
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
              <MarketRow
                ticker={coin.ticker}
                price={formatStablecoinPrice(coin.price_usd)}
                priceColorClass={getStablecoinPriceColor(coin.price_usd)}
                marketCap={coin.market_cap_usd}
              />
            </div>
          ))}
        </div>
      </MarketSection>
    </div>
  );
}

/** Reusable section wrapper for market data cards */
interface MarketSectionProps {
  icon: React.ReactNode;
  title: string;
  lastUpdated?: Date | null;
  onRefresh?: () => void;
  asOfDate?: string;
  asOfTime?: string;
  children: React.ReactNode;
}

function MarketSection({ 
  icon, 
  title, 
  lastUpdated, 
  onRefresh, 
  asOfDate, 
  asOfTime, 
  children 
}: MarketSectionProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          )}
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="gap-1 h-7 px-2"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="text-xs">Refresh</span>
          </Button>
        )}
      </div>
      
      {children}
      
      {asOfDate && (
        <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
          Data as of: {asOfDate} {asOfTime}
        </div>
      )}
    </div>
  );
}

/** Reusable row for displaying ticker, price, and market cap */
interface MarketRowProps {
  ticker: string;
  price: string;
  priceColorClass: string;
  marketCap: number | null;
}

function MarketRow({ ticker, price, priceColorClass, marketCap }: MarketRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-bold text-lg">{ticker}</span>
        <span className={`text-xl font-mono font-semibold ${priceColorClass}`}>
          {price}
        </span>
      </div>
      <div className="text-right">
        <div className="text-xl font-semibold text-foreground">
          {formatMarketCap(marketCap)}
        </div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          Market Cap
        </div>
      </div>
    </div>
  );
}
