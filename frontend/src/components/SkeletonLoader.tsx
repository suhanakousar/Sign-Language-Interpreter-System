"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
}

export function TranscriptSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-label="Loading transcripts" role="status">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function AvatarSkeleton() {
  return (
    <div
      className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl"
      role="status"
      aria-label="Loading 3D avatar"
    >
      <div className="flex flex-col items-center gap-3">
        {/* Head */}
        <Skeleton className="w-16 h-16 !rounded-full" />
        {/* Body */}
        <Skeleton className="w-12 h-24 !rounded-xl" />
        {/* Arms */}
        <div className="flex gap-8 -mt-16">
          <Skeleton className="w-4 h-20 !rounded-full" />
          <Skeleton className="w-4 h-20 !rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function GestureQueueSkeleton() {
  return (
    <div className="flex gap-2 p-4" role="status" aria-label="Loading gestures">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="w-16 h-8" />
      ))}
    </div>
  );
}
