/**
 * Shown while a signed-in page resolves its data. Deliberately not a skeleton:
 * the dashboard's shape depends on what is connected and what the plan allows,
 * so placeholder cards would routinely settle into a different layout than the
 * one they implied.
 */
export default function AppLoading() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <p className="text-sm font-bold text-[#666]" role="status">
        Loading
      </p>
    </div>
  );
}
