import { useEffect, useState } from "react";

/**
 * Hook to track elapsed time in seconds for API operations.
 * Useful for displaying a live timer during long-running requests.
 */
export function useElapsedTimer(startTime: number | undefined, isActive: boolean) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    if (!isActive || !startTime) {
      setElapsed(0);
      return;
    }
    
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime, isActive]);
  
  return elapsed;
}

/**
 * Format seconds into mm:ss or Xs format
 */
export function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
}
