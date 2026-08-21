import { db } from "@/lib/db";

export const metadata = { title: "Activity log · Admin" };

type LogRow = {
  id: string;
  action: string;
  outcome: string;
  reason: string | null;
  recipient_handle: string | null;
  created_at: string;
  user_email: string | null;
};

const outcomeStyles: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  skipped: "bg-amber-50 text-amber-700",
  blocked: "bg-slate-100 text-slate-700",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminLogsPage() {
  const sql = db();
  const rows = (await sql`
    select l.id, l.action, l.outcome, l.reason, l.recipient_handle, l.created_at,
           u.email as user_email
    from automation_log l
    left join users u on u.id = l.user_id
    order by l.created_at desc
    limit 200
  `) as LogRow[];

  return (
    <>
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black">Activity log</h1>
        <p className="mt-2 text-sm text-[#666]">
          Every automated action, with its outcome. Most recent 200 entries.
        </p>
      </section>

      <section className="mt-6 overflow-x-auto rounded-xl border border-[#D6D6D6] bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-[#666]">
            Nothing logged yet — no automation has run.
          </p>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-[#D6D6D6] bg-[#F8FAFC] text-xs font-black uppercase text-[#666]">
              <tr>
                <th className="px-6 py-3">When</th>
                <th className="px-6 py-3">Account</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Outcome</th>
                <th className="px-6 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[#EEE] last:border-0">
                  <td className="whitespace-nowrap px-6 py-3 text-[#555]">{formatDate(row.created_at)}</td>
                  <td className="px-6 py-3 text-[#555]">{row.user_email || "—"}</td>
                  <td className="px-6 py-3 font-bold capitalize text-[#191919]">{row.action}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        outcomeStyles[row.outcome] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.outcome}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[#555]">
                    {row.reason || row.recipient_handle || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
