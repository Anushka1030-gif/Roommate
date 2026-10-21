import Skeleton from '../ui/Skeleton.jsx';
import Card from '../ui/Card.jsx';

export default function MatchSkeleton({ count = 3 }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-6 sm:p-7 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            {/* Header info */}
            <div className="flex items-start gap-4 flex-1">
              <Skeleton circle className="w-14 h-14 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            </div>

            {/* Score Badge Skeleton */}
            <div className="flex items-center gap-3 shrink-0">
              <Skeleton className="w-14 h-14 rounded-2xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>

          {/* Explanation Skeleton */}
          <div className="mt-5 p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          {/* Highlights Chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-7 w-40 rounded-full" />
            <Skeleton className="h-7 w-48 rounded-full" />
          </div>

          {/* Lifestyle Grid */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>

          {/* Action Bar */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24 rounded-xl" />
              <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </Card>
      ))}
    </div>
  );
}
