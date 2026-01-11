import { useState, useEffect, useCallback } from 'react';
import { useStablecoinData } from '@/hooks/useMarketData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatMarketCap, formatStablecoinPrice, getStablecoinPriceColor, formatNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, AlertCircle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PriceStabilityChart, TICKER_COLORS } from '@/components/stablecoins/PriceStabilityChart';
import { MarketSnapshot } from '@/types/transactions';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

export default function StablecoinMarket() {
  const { data, loading, error, refetch, lastUpdated, isAuthenticated } = useStablecoinData();
  const { session } = useAuth();
  const [allSnapshots, setAllSnapshots] = useState<MarketSnapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [visibleTickers, setVisibleTickers] = useState<Set<string>>(new Set());

  // Fetch all historical snapshots for the price stability chart
  const fetchAllSnapshots = useCallback(async () => {
    if (!session?.access_token) return;
    
    setSnapshotsLoading(true);
    try {
      // @ts-ignore - table exists but types may not be regenerated yet
      const { data: snapshots, error: fetchError } = await supabase
        .from('stablecoin_snapshots')
        .select('*')
        .order('as_of_date', { ascending: true })
        .order('as_of_time', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);
      setAllSnapshots(snapshots || []);
    } catch (err) {
      console.error('Failed to fetch all snapshots:', err);
    } finally {
      setSnapshotsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchAllSnapshots();
  }, [fetchAllSnapshots]);

  // Initialize visible tickers when snapshots load
  useEffect(() => {
    if (allSnapshots.length > 0 && visibleTickers.size === 0) {
      const tickers = [...new Set(
        allSnapshots
          .filter((s) => s.ticker.toUpperCase() !== 'PAXG')
          .map((s) => s.ticker)
      )];
      setVisibleTickers(new Set(tickers));
    }
  }, [allSnapshots]);

  const handleRefresh = async () => {
    await Promise.all([refetch(), fetchAllSnapshots()]);
  };

  // Show login prompt if not authenticated
  if (!isAuthenticated && !loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded border bg-card p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded bg-muted p-3">
              <LogIn className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-sm mb-1">Authentication Required</h3>
              <p className="text-xs text-muted-foreground">
                Sign in to view stablecoin market data
              </p>
            </div>
            <Button size="sm" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load market data: {error}</span>
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto gap-1">
              <RefreshCw className="w-3 h-3" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Filter out PAXG (not a stablecoin) and sort by market cap descending
  const sortedData = [...data]
    .filter((coin) => coin.ticker.toUpperCase() !== 'PAXG')
    .sort((a, b) => (b.market_cap_usd ?? 0) - (a.market_cap_usd ?? 0));

  // Calculate total market cap
  const totalMarketCap = sortedData.reduce(
    (sum, coin) => sum + (coin.market_cap_usd ?? 0), 
    0
  );

  // Get unique tickers for the line chart
  const uniqueTickers = [...new Set(
    allSnapshots
      .filter((s) => s.ticker.toUpperCase() !== 'PAXG')
      .map((s) => s.ticker)
  )];


  const toggleTicker = (ticker: string) => {
    setVisibleTickers((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (visibleTickers.size === uniqueTickers.length) {
      setVisibleTickers(new Set());
    } else {
      setVisibleTickers(new Set(uniqueTickers));
    }
  };

  // Transform snapshots into line chart format: { datetime, USDT: mcap, USDC: mcap, ... }
  const marketCapLineData = (() => {
    const groupedByDateTime: Record<string, Record<string, string | number>> = {};
    allSnapshots
      .filter((s) => s.ticker.toUpperCase() !== 'PAXG')
      .forEach((snapshot) => {
        // Use full datetime for granularity
        const dateTimeKey = `${snapshot.as_of_date} ${snapshot.as_of_time?.slice(0, 5) || '00:00'}`;
        if (!groupedByDateTime[dateTimeKey]) {
          groupedByDateTime[dateTimeKey] = { datetime: dateTimeKey };
        }
        groupedByDateTime[dateTimeKey][snapshot.ticker] = snapshot.market_cap_usd ?? 0;
      });
    return Object.values(groupedByDateTime).sort((a, b) => 
      String(a.datetime).localeCompare(String(b.datetime))
    );
  })();

  // Prepare scatter chart data with ticker info (exclude PAXG)
  const scatterData = allSnapshots
    .filter((snapshot) => snapshot.ticker.toUpperCase() !== 'PAXG')
    .map((snapshot) => ({
      dateLabel: snapshot.as_of_date,
      priceValue: snapshot.price_usd,
      ticker: snapshot.ticker,
      as_of_date: snapshot.as_of_date,
      as_of_time: snapshot.as_of_time,
    }));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1>Stablecoin Market</h1>
          <p className="text-xs text-muted-foreground">
            Market capitalization and price analysis
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-1.5 h-8 text-xs"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </Button>
      </div>

      {/* KPI Header Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card">
          <div className="kpi-value">{formatMarketCap(totalMarketCap)}</div>
          <div className="kpi-label">Total Market Cap</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{sortedData.length}</div>
          <div className="kpi-label">Stablecoins Tracked</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value text-base font-normal text-muted-foreground">
            {sortedData[0]?.as_of_date} {sortedData[0]?.as_of_time?.slice(0, 5)}
          </div>
          <div className="kpi-label">Last Updated</div>
        </div>
      </div>

      {/* Market Cap Line Chart */}
      {snapshotsLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="chart-container">
          <div className="flex items-center justify-between mb-3">
            <div className="chart-title mb-0">Market Caps Over Time</div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={toggleAll}
                className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
              >
                {visibleTickers.size === uniqueTickers.length ? 'Hide All' : 'Show All'}
              </button>
              {uniqueTickers.map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => toggleTicker(ticker)}
                  className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded transition-colors ${
                    visibleTickers.has(ticker)
                      ? 'bg-muted hover:bg-muted/80'
                      : 'bg-transparent opacity-40 hover:opacity-60'
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: TICKER_COLORS[ticker] || 'hsl(var(--institutional-blue))' }}
                  />
                  <span>{ticker}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={marketCapLineData}
                margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
              >
                <XAxis
                  dataKey="datetime"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={(value) => formatMarketCap(value)}
                  width={55}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded border bg-popover px-3 py-2 shadow-md text-xs">
                        <div className="font-semibold mb-1">{label}</div>
                        {payload.map((entry: any) => (
                          <div key={entry.dataKey} className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: entry.stroke }}
                            />
                            <span className="text-muted-foreground">{entry.dataKey}:</span>
                            <span className="font-mono font-medium">
                              {formatMarketCap(entry.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                {uniqueTickers
                  .filter((ticker) => visibleTickers.has(ticker))
                  .map((ticker) => (
                    <Line
                      key={ticker}
                      type="monotone"
                      dataKey={ticker}
                      stroke={TICKER_COLORS[ticker] || 'hsl(var(--institutional-blue))'}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Price Stability Chart - All Stablecoins */}
      {snapshotsLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <PriceStabilityChart
          data={scatterData}
          storageKey="market-all-stablecoins"
          title="Price Stability - All Stablecoins"
          showLegend={true}
          colorByTicker={true}
          height="h-72"
        />
      )}

      {/* Data Table */}
      <div className="chart-container">
        <div className="chart-title">Stablecoin Details</div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th className="text-right">Price</th>
                <th className="text-right">Market Cap</th>
                <th className="text-right">% of Market</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((coin) => {
                const percentage = totalMarketCap > 0 
                  ? ((coin.market_cap_usd ?? 0) / totalMarketCap * 100)
                  : 0;
                return (
                  <tr 
                    key={coin.ticker} 
                    className="cursor-pointer"
                    onClick={() => window.location.href = `/stablecoins/${coin.ticker.toLowerCase()}`}
                  >
                    <td className="font-medium text-primary hover:underline">
                      <Link to={`/stablecoins/${coin.ticker.toLowerCase()}`}>
                        {coin.ticker}
                      </Link>
                    </td>
                    <td className={`text-right font-mono ${getStablecoinPriceColor(coin.price_usd)}`}>
                      {formatStablecoinPrice(coin.price_usd)}
                    </td>
                    <td className="text-right font-mono tabular-nums">
                      {formatMarketCap(coin.market_cap_usd)}
                    </td>
                    <td className="text-right text-muted-foreground tabular-nums">
                      {percentage.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer timestamp */}
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
        Data as of: {sortedData[0]?.as_of_date} {sortedData[0]?.as_of_time}
      </div>
    </div>
  );
}
