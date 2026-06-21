import { Skeleton } from '@/components/_shared/Skeleton';

export function TimelineSkeleton() {
  return (
    <div className="flex-1 p-4">
      <div className="flex gap-2 mb-4">
        <Skeleton variant="text" className="w-32 h-6" />
        <Skeleton variant="text" className="w-20 h-6" />
        <div className="ml-auto flex gap-2">
          <Skeleton variant="circle" className="h-8 w-8" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton variant="text" className="w-[160px] h-10" />
            <div className="flex-1 flex gap-2">
              <Skeleton variant="card" className="h-16 flex-1" />
              <Skeleton variant="card" className="h-16 flex-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
