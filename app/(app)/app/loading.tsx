export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-white" />
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-xl border border-[#D6D6D6] bg-white" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl border border-[#D6D6D6] bg-white" />
    </div>
  );
}
