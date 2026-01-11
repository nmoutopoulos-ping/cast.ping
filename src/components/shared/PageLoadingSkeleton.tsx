import { Skeleton } from '@/components/ui/skeleton';

interface PageLoadingSkeletonProps {
  kpiCount?: number;
  chartCount?: number;
  showHeader?: boolean;
}

/**
 * Shared loading skeleton for analytics pages
 * Provides consistent loading states across stablecoin and PAXG pages
 */
export function PageLoadingSkeleton({
  kpiCount = 3,
  chartCount = 2,
  showHeader = true,
}: PageLoadingSkeletonProps) {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {showHeader && (
        <div className="space-y-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      )}
      <div className={`grid grid-cols-${kpiCount} gap-4`}>
        {Array.from({ length: kpiCount }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      {Array.from({ length: chartCount }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full" />
      ))}
    </div>
  );
}
