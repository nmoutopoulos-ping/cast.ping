import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, RotateCcw } from 'lucide-react';
import { formatStablecoinPrice, getStablecoinPriceColor } from '@/lib/utils';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';

interface PriceDataPoint {
  dateLabel: string;
  priceValue: number;
  ticker?: string;
  as_of_date?: string;
  as_of_time?: string;
}

interface PriceStabilityChartProps {
  data: PriceDataPoint[];
  storageKey: string;
  title?: string;
  showLegend?: boolean;
  colorByTicker?: boolean;
  height?: string;
  visibleTickers?: Set<string>;
  onToggleTicker?: (ticker: string) => void;
  onToggleAll?: () => void;
  allTickers?: string[];
}

export const TICKER_COLORS: Record<string, string> = {
  USDT: 'hsl(160, 60%, 45%)',
  USDC: 'hsl(210, 80%, 55%)',
  DAI: 'hsl(40, 80%, 50%)',
  FRAX: 'hsl(0, 0%, 40%)',
  TUSD: 'hsl(200, 70%, 50%)',
  USDP: 'hsl(280, 60%, 55%)',
  GUSD: 'hsl(180, 50%, 45%)',
  LUSD: 'hsl(220, 70%, 60%)',
  PYUSD: 'hsl(210, 100%, 50%)',
  FDUSD: 'hsl(30, 80%, 50%)',
  USDS: 'hsl(320, 60%, 50%)',
  USDG: 'hsl(90, 60%, 45%)',
};

const DEFAULT_MIN = 0.9999;
const DEFAULT_MAX = 1.0005;

export function PriceStabilityChart({
  data,
  storageKey,
  title = 'Price Stability (Target: $1.00)',
  showLegend = false,
  colorByTicker = false,
  height = 'h-64',
  visibleTickers,
  onToggleTicker,
  onToggleAll,
  allTickers = [],
}: PriceStabilityChartProps) {
  const [yMin, setYMin] = useState(DEFAULT_MIN);
  const [yMax, setYMax] = useState(DEFAULT_MAX);
  const [inputMin, setInputMin] = useState(DEFAULT_MIN.toString());
  const [inputMax, setInputMax] = useState(DEFAULT_MAX.toString());
  const [isSaved, setIsSaved] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    const saved = localStorage.getItem(`price-stability-${storageKey}`);
    if (saved) {
      try {
        const { min, max } = JSON.parse(saved);
        setYMin(min);
        setYMax(max);
        setInputMin(min.toString());
        setInputMax(max.toString());
        setIsSaved(true);
      } catch (e) {
        console.error('Failed to parse saved chart settings', e);
      }
    }
  }, [storageKey]);

  const handleApply = () => {
    const min = parseFloat(inputMin);
    const max = parseFloat(inputMax);
    if (!isNaN(min) && !isNaN(max) && min < max) {
      setYMin(min);
      setYMax(max);
    }
  };

  const handleSave = () => {
    const min = parseFloat(inputMin);
    const max = parseFloat(inputMax);
    if (!isNaN(min) && !isNaN(max) && min < max) {
      setYMin(min);
      setYMax(max);
      localStorage.setItem(
        `price-stability-${storageKey}`,
        JSON.stringify({ min, max })
      );
      setIsSaved(true);
    }
  };

  const handleReset = () => {
    setYMin(DEFAULT_MIN);
    setYMax(DEFAULT_MAX);
    setInputMin(DEFAULT_MIN.toString());
    setInputMax(DEFAULT_MAX.toString());
    localStorage.removeItem(`price-stability-${storageKey}`);
    setIsSaved(false);
  };

  // Group data by ticker for legend (fallback if no external filtering)
  const tickers = colorByTicker
    ? [...new Set(data.map((d) => d.ticker).filter(Boolean))] as string[]
    : [];

  // Filter data by visible tickers if provided
  const filteredData = visibleTickers && colorByTicker
    ? data.filter((d) => d.ticker && visibleTickers.has(d.ticker))
    : data;

  // Get tickers to display in scatter
  const displayTickers = visibleTickers
    ? allTickers.filter((t) => visibleTickers.has(t))
    : tickers;

  const hasTickerFiltering = onToggleTicker && onToggleAll && allTickers.length > 0;

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="chart-title mb-0">{title}</div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Ticker filter bar - same layout as Market Cap chart */}
          {hasTickerFiltering && (
            <>
              <button
                onClick={onToggleAll}
                className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
              >
                {visibleTickers?.size === allTickers.length ? 'Hide All' : 'Show All'}
              </button>
              {allTickers.map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => onToggleTicker(ticker)}
                  className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded transition-colors ${
                    visibleTickers?.has(ticker)
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
              <div className="w-px h-4 bg-border mx-1" />
            </>
          )}
          {/* Y-Axis controls */}
          <div className="flex items-center gap-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase">Min</Label>
            <Input
              type="number"
              step="0.00001"
              value={inputMin}
              onChange={(e) => {
                setInputMin(e.target.value);
                setIsSaved(false);
              }}
              onBlur={handleApply}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              className="h-7 w-24 text-xs font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase">Max</Label>
            <Input
              type="number"
              step="0.00001"
              value={inputMax}
              onChange={(e) => {
                setInputMax(e.target.value);
                setIsSaved(false);
              }}
              onBlur={handleApply}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              className="h-7 w-24 text-xs font-mono"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className={`h-7 gap-1 text-xs ${isSaved ? 'text-success border-success/50' : ''}`}
          >
            <Save className="w-3 h-3" />
            {isSaved ? 'Saved' : 'Save'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 gap-1 text-xs"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        </div>
      </div>

      <div className={height}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
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
            <YAxis
              domain={[yMin, yMax]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickFormatter={(value) => `$${value.toFixed(4)}`}
              width={60}
            />
            <ReferenceLine
              y={1.0}
              stroke="hsl(var(--success))"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: '$1.00 Peg',
                position: 'right',
                fill: 'hsl(var(--success))',
                fontSize: 10,
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as PriceDataPoint;
                const deviation = ((d.priceValue - 1) * 100).toFixed(4);
                const deviationNum = parseFloat(deviation);
                const deviationColor =
                  deviationNum < 0
                    ? 'text-destructive'
                    : deviationNum > 0
                    ? 'text-success'
                    : 'text-muted-foreground';
                return (
                  <div className="rounded border bg-popover px-3 py-2 shadow-md text-xs">
                    {d.ticker && (
                      <div className="font-semibold mb-1">{d.ticker}</div>
                    )}
                    <div className="text-muted-foreground text-[10px]">
                      {d.as_of_date} {d.as_of_time?.slice(0, 5)}
                    </div>
                    <div className="text-muted-foreground mt-1">
                      Price:{' '}
                      <span
                        className={`font-mono font-medium ${getStablecoinPriceColor(
                          d.priceValue
                        )}`}
                      >
                        {formatStablecoinPrice(d.priceValue)}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Deviation:{' '}
                      <span className={`font-mono font-medium ${deviationColor}`}>
                        {Number(deviation) >= 0 ? '+' : ''}
                        {deviation}%
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            {colorByTicker && displayTickers.length > 0 ? (
              displayTickers.map((ticker) => (
                <Scatter
                  key={ticker}
                  name={ticker}
                  data={filteredData.filter((d) => d.ticker === ticker)}
                  dataKey="priceValue"
                  fill={TICKER_COLORS[ticker] || 'hsl(var(--institutional-blue))'}
                  fillOpacity={0.8}
                />
              ))
            ) : (
              <Scatter
                dataKey="priceValue"
                fill="hsl(var(--institutional-blue))"
                fillOpacity={0.7}
              />
            )}
            {showLegend && <Legend />}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
