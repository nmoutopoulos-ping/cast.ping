import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with US-style commas (e.g., 10000 -> "10,000")
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value == null || value === "") return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US");
}

/**
 * Normalize an Ethereum address to lowercase and trimmed
 * Used consistently across the app for address comparison and mapping
 */
export function normalizeAddress(address?: string | null): string {
  return (address ?? "").trim().toLowerCase();
}

/**
 * Format a market cap value with B/M suffix (e.g., 1500000000 -> "$1.50B")
 */
export function formatMarketCap(value: number | null): string {
  if (value === null) return '—';
  
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  return `$${value.toLocaleString()}`;
}

/**
 * Format a stablecoin price with 6 decimal places
 */
export function formatStablecoinPrice(price: number): string {
  return price.toFixed(6);
}

/**
 * Format a currency price with 2 decimal places and USD symbol
 */
export function formatCurrencyPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Get color class for stablecoin price based on deviation from $1
 */
export function getStablecoinPriceColor(price: number): string {
  const diff = Math.abs(price - 1);
  if (diff < 0.001) return 'text-green-500';
  if (diff < 0.005) return 'text-yellow-500';
  return 'text-red-500';
}
