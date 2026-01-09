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
