import { Skeleton } from "@/components/ui/skeleton";

interface TransactionSkeletonsProps {
  count?: number;
}

export function TransactionSkeletons({ count = 8 }: TransactionSkeletonsProps) {
  return (
    <div className="space-y-1.5">
      {/* Header skeleton */}
      <Skeleton className="h-11 w-full rounded-t-lg" />
      {/* Row skeletons */}
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="h-12 w-full" 
          style={{ opacity: 1 - (i * 0.08) }}
        />
      ))}
    </div>
  );
}