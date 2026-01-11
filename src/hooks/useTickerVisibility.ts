import { useState, useCallback, useRef } from 'react';

/**
 * Hook to manage ticker visibility toggling for charts
 * Consolidates the repeated toggle logic used across stablecoin charts
 */
export function useTickerVisibility(initialTickers: string[] = []) {
  const [visibleTickers, setVisibleTickers] = useState<Set<string>>(
    () => new Set(initialTickers)
  );
  const initialized = useRef(false);

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
      // If all are visible, hide all; otherwise show all
      if (prev.size === allTickers.length) {
        return new Set();
      }
      return new Set(allTickers);
    });
  }, []);

  const initializeTickers = useCallback((tickers: string[]) => {
    if (!initialized.current) {
      initialized.current = true;
      setVisibleTickers(new Set(tickers));
    }
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
