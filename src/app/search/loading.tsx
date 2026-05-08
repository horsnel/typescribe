export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
        <div className="h-8 w-64 bg-[#1e1e28] rounded-lg animate-pulse mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-[#1e1e28] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
