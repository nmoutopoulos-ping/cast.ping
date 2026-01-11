import { useState, useCallback } from 'react';

/**
 * Hook to manage ticker visibility toggling for charts
 * Consolidates the repeated toggle logic used across stablecoin charts
 */
export function useTickerVisibility(initialTickers: string[] = []) {
  const [visibleTickers, setVisibleTickers] = useState<Set<string>>(
    () => new Set(initialTickers)
  );

  const toggleTicker = useCallback((ticker: string) => {
    setVisibleTickers((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback((allTickers: string[]) => {
    setVisibleTickers((prev) => {
      if (prev.size === allTickers.length) {
        return new Set();
      }
      return new Set(allTickers);
    });
  }, []);

  const initializeTickers = useCallback((tickers: string[]) => {
    setVisibleTickers((prev) => {
      if (prev.size === 0) {
        return new Set(tickers);
      }
      return prev;
    });
  }, []);

  const showAll = useCallback((allTickers: string[]) => {
    setVisibleTickers(new Set(allTickers));
  }, []);

  const hideAll = useCallback(() => {
    setVisibleTickers(new Set());
  }, []);

  return {
    visibleTickers,
    toggleTicker,
    toggleAll,
    initializeTickers,
    showAll,
    hideAll,
  };
}
