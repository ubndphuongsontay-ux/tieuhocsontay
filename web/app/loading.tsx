import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-[12px]" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-[12px]" />
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-[12px]" />
        <Skeleton className="h-64 rounded-[12px]" />
      </div>
    </div>
  );
}
