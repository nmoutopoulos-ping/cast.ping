import { usePaxgData } from '@/hooks/useMarketData';
import { formatMarketCap, formatCurrencyPrice, formatNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, AlertCircle, LogIn, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { format } from 'date-fns';

interface PaxgSnapshot {
  id: string;
  ticker: string;
  price_usd: number;
  market_cap_usd: number | null;
  as_of_date: string;
  as_of_time: string;
  captured_at: string;
}

export default function PaxgAnalytics() {
  const { data: latestPaxg, loading, refetch } = usePaxgData();
  const { user } = useAuth();

  // Fetch historical data for chart
  const { data: historicalData } = useQuery({
    queryKey: ['paxg-history'],
    queryFn: async () => {
      // @ts-ignore - table exists but types not yet updated
      const { data, error } = await supabase
        .from('paxg_snapshots')
        .select('*')
        .order('as_of_date', { ascending: true })
        .order('as_of_time', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return (data as PaxgSnapshot[]) || [];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Show login prompt if not authenticated
  if (!user && !loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded border bg-card p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded bg-gold-muted p-3">
              <LogIn className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h3 className="font-medium text-sm mb-1">Authentication Required</h3>
              <p className="text-xs text-muted-foreground">
                Sign in to view PAXG analytics
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
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!latestPaxg) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded border bg-card p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded bg-gold-muted p-3">
              <TrendingUp className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h3 className="font-medium text-sm mb-1">No Data Available</h3>
              <p className="text-xs text-muted-foreground">
                PAXG price data has not been captured yet
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={refetch} className="gap-1.5">
              <RefreshCw className="w-3 h-3" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = (historicalData || []).map((snapshot) => ({
    date: `${snapshot.as_of_date} ${snapshot.as_of_time?.slice(0, 5) || ''}`,
    price: snapshot.price_usd,
    displayDate: snapshot.as_of_date,
  }));

  // Calculate price change if we have historical data
  const priceChange = chartData.length >= 2 
    ? ((chartData[chartData.length - 1].price - chartData[0].price) / chartData[0].price * 100)
    : null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1>PAXG Analytics</h1>
          <p className="text-xs text-muted-foreground">
            Gold-backed token price analysis
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

      {/* KPI Tiles */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card border-gold bg-gold-muted/30">
          <div className="kpi-value text-gold">{formatCurrencyPrice(latestPaxg.price_usd)}</div>
          <div className="kpi-label">Current Price</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{formatMarketCap(latestPaxg.market_cap_usd)}</div>
          <div className="kpi-label">Market Cap</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value text-base font-normal text-muted-foreground">
            {latestPaxg.as_of_date} {latestPaxg.as_of_time?.slice(0, 5)}
          </div>
          <div className="kpi-label">Data Timestamp</div>
        </div>
      </div>

      {/* Price Line Chart */}
      <div className="chart-container">
        <div className="flex items-center justify-between mb-4">
          <div className="chart-title">Price History</div>
          {priceChange !== null && (
            <div className={`text-xs font-medium tabular-nums ${priceChange >= 0 ? 'text-success' : 'text-destructive'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% period change
            </div>
          )}
        </div>
        <div className="h-80">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <XAxis 
                  dataKey="displayDate" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={(value) => {
                    try {
                      return format(new Date(value), 'MMM d');
                    } catch {
                      return value;
                    }
                  }}
                  minTickGap={50}
                />
                <YAxis 
                  domain={['dataMin - 50', 'dataMax + 50']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={(value) => `$${formatNumber(value)}`}
                  width={70}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const firstPrice = chartData[0]?.price || d.price;
                    const changeFromStart = ((d.price - firstPrice) / firstPrice * 100);
                    return (
                      <div className="rounded border bg-popover px-3 py-2 shadow-md text-xs">
                        <div className="text-muted-foreground mb-1">{d.date}</div>
                        <div className="font-semibold text-gold">{formatCurrencyPrice(d.price)}</div>
                        <div className={`text-[10px] mt-1 ${changeFromStart >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {changeFromStart >= 0 ? '+' : ''}{changeFromStart.toFixed(2)}% from start
                        </div>
                      </div>
                    );
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="hsl(var(--gold))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: 'hsl(var(--gold))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Insufficient data for chart</p>
                <p className="text-xs">Price history will appear after more data points are captured</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Placeholder */}
      <div className="chart-container opacity-60">
        <div className="chart-title">PAXG vs Spot Gold (Coming Soon)</div>
        <div className="h-32 flex items-center justify-center text-muted-foreground text-xs">
          Comparison chart will be available in a future update
        </div>
      </div>

      {/* Footer timestamp */}
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
        Data as of: {latestPaxg.as_of_date} {latestPaxg.as_of_time}
      </div>
    </div>
  );
}