import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatMarketCap, formatStablecoinPrice, getStablecoinPriceColor } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, AlertCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { MarketSnapshot } from '@/types/transactions';
import { PriceStabilityChart } from '@/components/stablecoins/PriceStabilityChart';
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const DEFAULT_PRICE_MIN = 0.9999;
const DEFAULT_PRICE_MAX = 1.0005;

export default function StablecoinDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const { session, loading: authLoading } = useAuth();
  const [data, setData] = useState<MarketSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [priceYMin, setPriceYMin] = useState(DEFAULT_PRICE_MIN);
  const [priceYMax, setPriceYMax] = useState(DEFAULT_PRICE_MAX);

  const displayTicker = ticker?.toUpperCase() || 'Unknown';
  const priceStorageKey = `detail-${displayTicker.toLowerCase()}`;

  // Load saved price axis settings (synced with PriceStabilityChart)
  useEffect(() => {
    const saved = localStorage.getItem(`price-stability-${priceStorageKey}`);
    if (saved) {
      try {
        const { min, max } = JSON.parse(saved);
        setPriceYMin(min);
        setPriceYMax(max);
      } catch (e) {
        console.error('Failed to parse saved price settings', e);
      }
    }
  }, [priceStorageKey]);

  // Listen for storage changes to sync price axis in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `price-stability-${priceStorageKey}` && e.newValue) {
        try {
          const { min, max } = JSON.parse(e.newValue);
          setPriceYMin(min);
          setPriceYMax(max);
        } catch (err) {
          console.error('Failed to parse storage change', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [priceStorageKey]);

  const fetchData = useCallback(async () => {
    if (authLoading || !session?.access_token || !ticker) return;

    setLoading(true);
    setError(null);

    try {
      // @ts-ignore - table exists but types may not be regenerated yet
      const { data: snapshots, error: fetchError } = await supabase
        .from('stablecoin_snapshots')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .order('as_of_date', { ascending: true })
        .order('as_of_time', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);
      setData(snapshots || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, authLoading, ticker]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={fetchData} className="ml-auto gap-1">
              <RefreshCw className="w-3 h-3" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const latestData = data[data.length - 1];

  // Prepare chart data with formatted dates
  const chartData = data.map((snapshot) => ({
    ...snapshot,
    dateLabel: snapshot.as_of_date,
    marketCapValue: snapshot.market_cap_usd ?? 0,
    priceValue: snapshot.price_usd,
    ticker: snapshot.ticker,
  }));

  // Calculate market cap min/max from data with padding
  const marketCapValues = chartData.map(d => d.marketCapValue).filter(v => v > 0);
  const marketCapMin = marketCapValues.length > 0 ? Math.min(...marketCapValues) * 0.98 : 0;
  const marketCapMax = marketCapValues.length > 0 ? Math.max(...marketCapValues) * 1.02 : 100;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-1.5">
          <Link to="/stablecoins">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </Button>
        <div className="flex-1">
          <h1>{displayTicker} Analytics</h1>
          <p className="text-xs text-muted-foreground">
            Historical market cap and price stability analysis
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 h-8 text-xs">
          <RefreshCw className="w-3 h-3" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card">
          <div className={`kpi-value ${getStablecoinPriceColor(latestData?.price_usd ?? 1)}`}>
            {formatStablecoinPrice(latestData?.price_usd ?? 1)}
          </div>
          <div className="kpi-label">Current Price</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{formatMarketCap(latestData?.market_cap_usd)}</div>
          <div className="kpi-label">Market Cap</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value text-base font-normal text-muted-foreground">
            {data.length}
          </div>
          <div className="kpi-label">Data Points</div>
        </div>
      </div>

      {/* Market Cap Chart (with optional Price Comparison) */}
      <div className="chart-container">
        <div className="flex items-center justify-between mb-2">
          <div className="chart-title">
            {comparisonMode ? 'Market Cap & Price Correlation' : 'Market Cap Over Time'}
          </div>
          <Button
            variant={comparisonMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setComparisonMode(!comparisonMode)}
            className="gap-1.5 h-7 text-xs"
          >
            {comparisonMode ? <ZoomOut className="w-3 h-3" /> : <ZoomIn className="w-3 h-3" />}
            {comparisonMode ? 'Exit Comparison' : 'Compare with Price'}
          </Button>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: comparisonMode ? 70 : 30, left: 10, bottom: 0 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.5}
              />
              <XAxis 
                dataKey="dateLabel" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              {/* Left Y-Axis: Market Cap (auto-scaled to data range) */}
              <YAxis 
                yAxisId="marketCap"
                orientation="left"
                domain={[marketCapMin, marketCapMax]}
                tickFormatter={(value) => formatMarketCap(value)}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--institutional-blue))', fontSize: 10 }}
                width={70}
              />
              {/* Right Y-Axis: Price (synced with PriceStabilityChart settings) */}
              {comparisonMode && (
                <YAxis 
                  yAxisId="price"
                  orientation="right"
                  domain={[priceYMin, priceYMax]}
                  tickFormatter={(value) => `$${value.toFixed(4)}`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--price-coral))', fontSize: 10 }}
                  width={60}
                />
              )}
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as MarketSnapshot;
                  const deviation = ((d.price_usd - 1) * 100).toFixed(4);
                  const deviationSign = d.price_usd >= 1 ? '+' : '';
                  return (
                    <div className="rounded border bg-popover px-3 py-2 shadow-md text-xs space-y-1">
                      <div className="font-semibold">{d.as_of_date} {d.as_of_time}</div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[hsl(var(--institutional-blue))]" />
                        <span className="text-muted-foreground">Market Cap:</span>
                        <span className="text-foreground font-medium">{formatMarketCap(d.market_cap_usd)}</span>
                      </div>
                      {comparisonMode && (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[hsl(var(--price-coral))]" />
                          <span className="text-muted-foreground">Price:</span>
                          <span className={`font-medium ${getStablecoinPriceColor(d.price_usd)}`}>
                            {formatStablecoinPrice(d.price_usd)}
                          </span>
                          <span className="text-muted-foreground text-[10px]">({deviationSign}{deviation}%)</span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              {/* Market Cap Line */}
              <Line 
                yAxisId="marketCap"
                type="monotone" 
                dataKey="marketCapValue" 
                stroke="hsl(var(--institutional-blue))" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--institutional-blue))' }}
                name="Market Cap"
              />
              {/* Price Scatter Dots (only in comparison mode) */}
              {comparisonMode && (
                <Scatter 
                  yAxisId="price"
                  dataKey="priceValue" 
                  fill="hsl(var(--price-coral))"
                  name="Price"
                  shape={(props: any) => (
                    <circle 
                      cx={props.cx} 
                      cy={props.cy} 
                      r={3} 
                      fill="hsl(var(--price-coral))"
                      stroke="hsl(var(--background))"
                      strokeWidth={1}
                    />
                  )}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {comparisonMode && (
          <div className="flex justify-center gap-6 mt-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[hsl(var(--institutional-blue))]" />
              <span>Market Cap (Left)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[hsl(var(--price-coral))]" />
              <span>Price (Right)</span>
            </div>
          </div>
        )}
      </div>

      {/* Price Scatter Plot with dynamic Y-axis */}
      <PriceStabilityChart
        data={chartData}
        storageKey={`detail-${displayTicker.toLowerCase()}`}
        title={`${displayTicker} Price Stability (Target: $1.00)`}
      />

      {/* Footer timestamp */}
      {latestData && (
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Latest data: {latestData.as_of_date} {latestData.as_of_time}
        </div>
      )}
    </div>
  );
}
