export default function AnimeLoading() {
  return (
    <div className="min-h-screen bg-[#050507]">
      <div className="h-[50vh] bg-[#0c0c10] animate-pulse" />
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
        <div className="h-8 w-64 bg-[#1e1e28] rounded-lg animate-pulse mb-4" />
        <div className="h-4 w-48 bg-[#1e1e28] rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
