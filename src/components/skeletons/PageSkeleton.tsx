/**
 * Generic page skeleton — hero strip + filter row + card grid.
 * Used by route-level loading.tsx files so navigation between
 * client-rendered pages shows an instant, consistent skeleton
 * instead of a blank screen.
 */
export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#050507] text-white animate-pulse">
      {/* Header strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-28 pb-8">
        <div className="h-9 bg-[#0c0c10] rounded-lg w-56 mb-3" />
        <div className="h-4 bg-[#0c0c10] rounded w-80 max-w-full" />
      </div>

      {/* Filter / control row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-6">
        <div className="flex gap-3 flex-wrap">
          <div className="h-10 bg-[#0c0c10] rounded-lg w-40" />
          <div className="h-10 bg-[#0c0c10] rounded-lg w-32" />
          <div className="h-10 bg-[#0c0c10] rounded-lg w-28" />
        </div>
      </div>

      {/* Card grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] bg-[#0c0c10] rounded-lg" />
              <div className="h-3.5 bg-[#0c0c10] rounded w-4/5" />
              <div className="h-3 bg-[#0c0c10] rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
