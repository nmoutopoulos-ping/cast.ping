import { useStablecoinData } from '@/hooks/useMarketData';
import { formatMarketCap, formatStablecoinPrice, getStablecoinPriceColor, formatNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, AlertCircle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';

export default function StablecoinMarket() {
  const { data, loading, error, refetch, lastUpdated, isAuthenticated } = useStablecoinData();

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
            <Button variant="ghost" size="sm" onClick={refetch} className="ml-auto gap-1">
              <RefreshCw className="w-3 h-3" />
              Retry
            </Button>
          </div>
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

  // Prepare chart data
  const chartData = sortedData.map(coin => ({
    ticker: coin.ticker,
    marketCap: coin.market_cap_usd ?? 0,
    price: coin.price_usd,
    percentage: totalMarketCap > 0 
      ? ((coin.market_cap_usd ?? 0) / totalMarketCap * 100)
      : 0,
  }));

  const maxMarketCap = Math.max(...chartData.map(d => d.marketCap));

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
          onClick={refetch}
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

      {/* Horizontal Bar Chart */}
      <div className="chart-container">
        <div className="chart-title">Market Cap Distribution</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 40, left: 50, bottom: 0 }}
              barCategoryGap="20%"
            >
              <XAxis 
                type="number" 
                tickFormatter={(value) => formatMarketCap(value)}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                domain={[0, maxMarketCap * 1.1]}
              />
              <YAxis 
                type="category" 
                dataKey="ticker" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }}
                width={45}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded border bg-popover px-3 py-2 shadow-md text-xs">
                      <div className="font-semibold mb-1">{d.ticker}</div>
                      <div className="text-muted-foreground">
                        Market Cap: <span className="text-foreground font-medium">{formatMarketCap(d.marketCap)}</span>
                      </div>
                      <div className="text-muted-foreground">
                        Share: <span className="text-foreground font-medium">{d.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar 
                dataKey="marketCap" 
                radius={[0, 2, 2, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill="hsl(var(--institutional-blue))"
                    fillOpacity={0.7 + (0.3 * (1 - index / chartData.length))}
                    className="hover:opacity-100 transition-opacity"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

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