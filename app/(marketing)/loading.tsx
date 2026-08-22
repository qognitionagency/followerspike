/**
 * Marketing pages are prerendered, so this is only ever seen on a slow first
 * navigation. It says so plainly rather than drawing pulsing grey boxes in the
 * shape of content that may not arrive: a skeleton that guesses wrong is a lie
 * about what is loading, and one that guesses right is a slower way to show
 * nothing.
 */
export default function MarketingLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F2EE] px-4">
      <p className="text-sm font-bold text-[#666]" role="status">
        Loading
      </p>
    </div>
  );
}
