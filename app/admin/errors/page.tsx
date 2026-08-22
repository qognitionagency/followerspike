import { errorCountsBySource, recentErrors } from "@/lib/observability/log";

export const metadata = { title: "Errors · Admin" };

// Errors are written on every request; a cached page would show a stale
// picture of an incident in progress, which is the one moment this page matters.
export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminErrorsPage() {
  const [entries, counts] = await Promise.all([recentErrors(200), errorCountsBySource(24)]);
  const total = counts.reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black">Errors</h1>
        <p className="mt-2 text-sm leading-6 text-[#666]">
          Failures recorded across the API routes and the job queue. Entries are kept for 30 days
          and pruned on the scheduler tick.
        </p>
        <p className="mt-4 inline-flex rounded-full bg-[#F4F2EE] px-3 py-1 text-xs font-black text-[#191919]">
          {total} in the last 24 hours
        </p>
      </section>

      {counts.length > 0 ? (
        <section className="mt-6 rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">By source, last 24 hours</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {counts.map((row) => (
              <li
                key={row.source}
                className="flex items-center justify-between rounded-lg border border-[#EEE] px-4 py-2.5 text-sm"
              >
                <span className="font-bold text-[#191919]">{row.source}</span>
                <span className="font-black text-red-700">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 overflow-x-auto rounded-xl border border-[#D6D6D6] bg-white shadow-sm">
        {entries.length === 0 ? (
          <p className="p-6 text-sm text-[#666]">Nothing recorded. That is the good outcome.</p>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-[#D6D6D6] bg-[#F8FAFC] text-xs font-black uppercase text-[#666]">
              <tr>
                <th className="px-6 py-3">When</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3">Kind</th>
                <th className="px-6 py-3">Message</th>
                <th className="px-6 py-3">Path</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-[#EEE] last:border-0 align-top">
                  <td className="whitespace-nowrap px-6 py-3 text-[#555]">{formatDate(entry.occurred_at)}</td>
                  <td className="px-6 py-3 font-bold text-[#191919]">{entry.source}</td>
                  <td className="px-6 py-3">
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">
                      {entry.kind}
                    </span>
                  </td>
                  <td className="max-w-lg px-6 py-3 text-[#555]">{entry.message}</td>
                  <td className="px-6 py-3 text-[#666]">{entry.request_path || "not recorded"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
