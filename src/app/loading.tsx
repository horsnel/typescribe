export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#D4A853]/30 border-t-[#D4A853] rounded-full animate-spin" />
        <p className="text-sm text-[#6b7280]">Loading...</p>
      </div>
    </div>
  );
}
