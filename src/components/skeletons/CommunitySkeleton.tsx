'use client';

export function CommunityCardSkeleton() {
  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-4 bg-[#1e1e28] rounded w-32 mb-2" />
          <div className="h-5 bg-[#1e1e28] rounded w-16" />
        </div>
        <div className="h-8 w-16 bg-[#1e1e28] rounded-lg" />
      </div>
      <div className="h-3 bg-[#1e1e28] rounded w-full mb-2" />
      <div className="h-3 bg-[#1e1e28] rounded w-3/4 mb-4" />
      <div className="flex items-center gap-4">
        <div className="h-3 bg-[#1e1e28] rounded w-16" />
        <div className="h-3 bg-[#1e1e28] rounded w-16" />
      </div>
    </div>
  );
}

export function CommunityHeaderSkeleton() {
  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 mb-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 bg-[#1e1e28] rounded w-48" />
            <div className="h-5 bg-[#1e1e28] rounded w-16" />
          </div>
          <div className="h-4 bg-[#1e1e28] rounded w-full mb-2" />
          <div className="h-4 bg-[#1e1e28] rounded w-3/4 mb-4" />
          <div className="flex items-center gap-4">
            <div className="h-4 bg-[#1e1e28] rounded w-24" />
            <div className="h-4 bg-[#1e1e28] rounded w-20" />
            <div className="h-4 bg-[#1e1e28] rounded w-28" />
          </div>
        </div>
        <div className="h-10 w-32 bg-[#1e1e28] rounded-lg" />
      </div>
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-[#1e1e28] flex-shrink-0" />
        <div className="flex-1">
          <div className="h-5 bg-[#1e1e28] rounded w-2/3 mb-2" />
          <div className="h-3.5 bg-[#1e1e28] rounded w-full mb-1.5" />
          <div className="h-3.5 bg-[#1e1e28] rounded w-5/6 mb-3" />
          <div className="h-px bg-[#1e1e28] my-3" />
          <div className="flex items-center gap-6">
            <div className="h-4 bg-[#1e1e28] rounded w-12" />
            <div className="h-4 bg-[#1e1e28] rounded w-16" />
            <div className="h-4 bg-[#1e1e28] rounded w-12" />
            <div className="h-3 bg-[#1e1e28] rounded w-16 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3 animate-pulse">
      <div className="w-7 h-7 rounded-full bg-[#1e1e28] flex-shrink-0" />
      <div className="flex-1">
        <div className="h-3.5 bg-[#1e1e28] rounded w-20 mb-2" />
        <div className="h-3 bg-[#1e1e28] rounded w-full mb-1" />
        <div className="h-3 bg-[#1e1e28] rounded w-3/4" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col items-center mb-8">
        <div className="w-28 h-28 rounded-full bg-[#1e1e28] mb-4" />
        <div className="h-6 bg-[#1e1e28] rounded w-32 mb-2" />
        <div className="h-4 bg-[#1e1e28] rounded w-48 mb-3" />
        <div className="h-3 bg-[#1e1e28] rounded w-64" />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 text-center">
            <div className="h-8 bg-[#1e1e28] rounded w-12 mx-auto mb-2" />
            <div className="h-3 bg-[#1e1e28] rounded w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
