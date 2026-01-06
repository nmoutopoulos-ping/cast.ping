import { Skeleton } from "@/components/ui/skeleton";

interface TransactionSkeletonsProps {
  count?: number;
}

export function TransactionSkeletons({ count = 10 }: TransactionSkeletonsProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}