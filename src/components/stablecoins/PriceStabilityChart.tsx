import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, RotateCcw } from 'lucide-react';
import { formatStablecoinPrice, getStablecoinPriceColor } from '@/lib/utils';
import { formatAxisDateTime, formatBrushTickDate } from '@/lib/marketDataUtils';
import {
  getXDomainFromBrushRange,
  isFullBrushRange,
  rescaleBrushRange,
  type BrushRange,
} from '@/lib/brushUtils';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Brush,
} from 'recharts';

export interface PriceDataPoint {
  /** Label form used when we don't have a numeric X value */
  dateLabel: string;
  /** Numeric x (ms since epoch) for true time-scale rendering */
  x?: number;
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
  getTickerColor?: (ticker: string) => string;
  colorPickerElement?: React.ReactNode;
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
  getTickerColor,
  colorPickerElement,
}: PriceStabilityChartProps) {
  const [yMin, setYMin] = useState(DEFAULT_MIN);
  const [yMax, setYMax] = useState(DEFAULT_MAX);
  const [inputMin, setInputMin] = useState(DEFAULT_MIN.toString());
  const [inputMax, setInputMax] = useState(DEFAULT_MAX.toString());
  const [isSaved, setIsSaved] = useState(false);
  const [brushRange, setBrushRange] = useState<BrushRange | null>(null);
  const prevDataLenRef = useRef(0);

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
    setBrushRange(null);
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

  // Sort data by x for brush to work correctly and eliminate visual gaps
  const sortedFilteredData = useMemo(() => {
    return [...filteredData].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
  }, [filteredData]);

  // Keep brush selection stable when data length changes (e.g. toggling tickers).
  useEffect(() => {
    const nextLen = sortedFilteredData.length;
    const prevLen = prevDataLenRef.current;
    prevDataLenRef.current = nextLen;

    if (nextLen < 2) {
      if (brushRange) setBrushRange(null);
      return;
    }

    // Initialize to full range once data exists.
    if (!brushRange) {
      setBrushRange({ startIndex: 0, endIndex: nextLen - 1 });
      return;
    }

    if (prevLen !== nextLen) {
      setBrushRange(rescaleBrushRange(brushRange, prevLen, nextLen));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedFilteredData.length]);

  // Helper to get color - use prop or fallback to TICKER_COLORS
  const resolveColor = (ticker: string) => {
    if (getTickerColor) return getTickerColor(ticker);
    return TICKER_COLORS[ticker] || 'hsl(var(--institutional-blue))';
  };

  // Handle brush change
  const handleBrushChange = (brushData: { startIndex?: number; endIndex?: number }) => {
    if (brushData.startIndex === undefined || brushData.endIndex === undefined) return;
    setBrushRange({ startIndex: brushData.startIndex, endIndex: brushData.endIndex });
  };

  const xDomain = useMemo(() => {
    if (!brushRange) return ['dataMin', 'dataMax'] as const;
    if (isFullBrushRange(brushRange, sortedFilteredData.length)) {
      return ['dataMin', 'dataMax'] as const;
    }
    const domain = getXDomainFromBrushRange(sortedFilteredData, brushRange);
    return domain ?? (['dataMin', 'dataMax'] as const);
  }, [brushRange, sortedFilteredData]);

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="chart-title mb-0">{title}</div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Ticker filter bar */}
          {hasTickerFiltering && (
            <>
              {colorPickerElement}
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
                    style={{ backgroundColor: resolveColor(ticker) }}
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
          <ScatterChart 
            data={sortedFilteredData} 
            margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
            />
            {/* Time-scale X axis with data sorted by timestamp */}
            <XAxis
              dataKey="x"
              type="number"
              scale="linear"
              domain={xDomain as any}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickFormatter={(v) => formatAxisDateTime(Number(v))}
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
            {/* Interactive Brush for timeline zoom */}
            <Brush
              dataKey="x"
              height={20}
              stroke="hsl(var(--primary))"
              fill="hsl(var(--muted))"
              tickFormatter={(v) => formatBrushTickDate(Number(v))}
              startIndex={brushRange?.startIndex}
              endIndex={brushRange?.endIndex}
              onChange={handleBrushChange}
            />
            {colorByTicker && displayTickers.length > 0 ? (
              displayTickers.map((ticker) => (
                <Scatter
                  key={ticker}
                  name={ticker}
                  data={sortedFilteredData.filter((d) => d.ticker === ticker)}
                  dataKey="priceValue"
                  fill={resolveColor(ticker)}
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
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
