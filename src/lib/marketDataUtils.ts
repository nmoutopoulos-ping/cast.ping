/**
 * Shared utilities for market data processing
 * Consolidates duplicated snapshot-to-chart transformations
 */

import { MarketSnapshot } from '@/types/transactions';
import { formatTimeEST } from '@/lib/utils';

/**
 * Price data point for scatter/line charts
 */
export interface PriceDataPoint {
  /** Label form used when we don't have a numeric X value */
  dateLabel: string;
  /** Numeric x (ms since epoch) for true time-scale rendering */
  x: number;
  priceValue: number;
  ticker?: string;
  as_of_date?: string;
  as_of_time?: string;
}

/**
 * Market cap data point for line charts
 */
export interface MarketCapDataPoint {
  /** Numeric x (ms since epoch) for time-scale rendering */
  x: number;
  dateLabel: string;
  marketCapValue: number;
  priceValue: number;
  ticker: string;
  as_of_date: string;
  as_of_time: string;
}

/**
 * Convert snapshot timestamp to milliseconds since epoch
 * Handles HH:MM and HH:MM:SS formats
 */
export function snapshotToTimestamp(as_of_date: string, as_of_time?: string): number {
  const rawTime = as_of_time || '00:00:00';
  const timeWithSeconds = rawTime.length === 5 ? `${rawTime}:00` : rawTime;
  return Date.parse(`${as_of_date}T${timeWithSeconds}Z`);
}

/**
 * Transform snapshots into price scatter chart data
 * Filters out PAXG by default (not a stablecoin)
 */
export function snapshotsToPriceData(
  snapshots: MarketSnapshot[],
  excludePaxg = true
): PriceDataPoint[] {
  return snapshots
    .filter((s) => !excludePaxg || s.ticker.toUpperCase() !== 'PAXG')
    .map((snapshot) => {
      const x = snapshotToTimestamp(snapshot.as_of_date, snapshot.as_of_time);
      const timeEST = formatTimeEST(snapshot.as_of_time || '00:00');
      
      return {
        x: Number.isNaN(x) ? 0 : x,
        dateLabel: `${snapshot.as_of_date} ${timeEST}`,
        priceValue: snapshot.price_usd,
        ticker: snapshot.ticker,
        as_of_date: snapshot.as_of_date,
        as_of_time: snapshot.as_of_time,
      };
    });
}

/**
 * Transform snapshots into market cap chart data grouped by datetime
 * Returns object keyed by datetime with ticker values and Total
 */
export function snapshotsToMarketCapLineData(
  snapshots: MarketSnapshot[],
  excludePaxg = true
): Array<Record<string, string | number>> {
  const groupedByDateTime: Record<string, Record<string, string | number>> = {};

  snapshots
    .filter((s) => !excludePaxg || s.ticker.toUpperCase() !== 'PAXG')
    .forEach((snapshot) => {
      const x = snapshotToTimestamp(snapshot.as_of_date, snapshot.as_of_time);
      const timeEST = formatTimeEST(snapshot.as_of_time || '00:00');
      const dateTimeKey = `${snapshot.as_of_date} ${timeEST}`;

      if (!groupedByDateTime[dateTimeKey]) {
        groupedByDateTime[dateTimeKey] = { 
          x: Number.isNaN(x) ? 0 : x,
          datetime: dateTimeKey, 
          Total: 0 
        };
      }
      groupedByDateTime[dateTimeKey][snapshot.ticker] = snapshot.market_cap_usd ?? 0;
      (groupedByDateTime[dateTimeKey].Total as number) += snapshot.market_cap_usd ?? 0;
    });

  return Object.values(groupedByDateTime).sort((a, b) => 
    (a.x as number) - (b.x as number)
  );
}

/**
 * Transform snapshots for a single ticker into combined chart data
 */
export function snapshotsToChartData(snapshots: MarketSnapshot[]): MarketCapDataPoint[] {
  return snapshots.map((snapshot) => {
    const x = snapshotToTimestamp(snapshot.as_of_date, snapshot.as_of_time);
    const timeEST = formatTimeEST(snapshot.as_of_time || '00:00');

    return {
      x: Number.isNaN(x) ? 0 : x,
      dateLabel: `${snapshot.as_of_date} ${timeEST}`,
      marketCapValue: snapshot.market_cap_usd ?? 0,
      priceValue: snapshot.price_usd,
      ticker: snapshot.ticker,
      as_of_date: snapshot.as_of_date,
      as_of_time: snapshot.as_of_time || '',
    };
  });
}

/**
 * Calculate extent (min/max) of numeric x values
 */
export function calculateXExtent(data: { x: number }[]): [number, number] | null {
  const xs = data.map((d) => d.x).filter((v) => !Number.isNaN(v) && v > 0);
  if (xs.length === 0) return null;
  return [Math.min(...xs), Math.max(...xs)];
}

/**
 * Format axis datetime for display (EST timezone)
 */
export function formatAxisDateTime(value: number): string {
  const d = new Date(value);
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return `${date} ${time}`;
}

/**
 * Lightweight tick formatter for Brush mini-axis.
 * Intentionally uses the user's local timezone to preserve existing behavior.
 */
export function formatBrushTickDate(value: number): string {
  const d = new Date(value);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Get unique tickers from snapshots, excluding PAXG by default
 */
export function getUniqueTickers(snapshots: MarketSnapshot[], excludePaxg = true): string[] {
  const tickers = new Set<string>();
  for (const s of snapshots) {
    if (!excludePaxg || s.ticker.toUpperCase() !== 'PAXG') {
      tickers.add(s.ticker);
    }
  }
  return Array.from(tickers);
}
