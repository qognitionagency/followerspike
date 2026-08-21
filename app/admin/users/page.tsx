import { db } from "@/lib/db";

export const metadata = { title: "Users · Admin" };

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  // Tier lives on `subscriptions`, not `users` — joined in below.
  tier: string | null;
  status: string | null;
  is_admin: boolean;
  autopilot_paused: boolean;
  created_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminUsersPage() {
  const sql = db();
  // One row per user: a user can hold several subscription rows over time, so
  // take the newest rather than fanning the table out.
  const rows = (await sql`
    select
      u.id, u.email, u.full_name, u.is_admin, u.autopilot_paused, u.created_at,
      s.tier, s.status
    from users u
    left join lateral (
      select tier, status
      from subscriptions
      where user_id = u.id
      order by created_at desc
      limit 1
    ) s on true
    order by u.created_at desc
    limit 200
  `) as UserRow[];

  return (
    <>
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black">Users</h1>
        <p className="mt-2 text-sm text-[#666]">
          {rows.length === 200 ? "Most recent 200 accounts." : `${rows.length} account${rows.length === 1 ? "" : "s"}.`}
        </p>
      </section>

      <section className="mt-6 overflow-x-auto rounded-xl border border-[#D6D6D6] bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-[#666]">No accounts yet.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[#D6D6D6] bg-[#F8FAFC] text-xs font-black uppercase text-[#666]">
              <tr>
                <th className="px-5 py-3">Account</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Automation</th>
                <th className="px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[#EEE] last:border-0">
                  <td className="px-5 py-3">
                    <span className="font-bold text-[#191919]">{row.full_name || "—"}</span>
                    {row.is_admin ? (
                      <span className="ml-2 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-xs font-black text-red-700">
                        admin
                      </span>
                    ) : null}
                    <span className="block text-xs text-[#666]">{row.email || "no email"}</span>
                  </td>
                  <td className="px-5 py-3 capitalize text-[#555]">
                    {row.tier || "free"}
                    {row.status && row.status !== "active" ? (
                      <span className="block text-xs text-[#666]">{row.status}</span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-[#555]">{row.autopilot_paused ? "paused" : "running"}</td>
                  <td className="px-5 py-3 text-[#555]">{formatDate(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
