import { db } from "@/lib/db";

export const metadata = { title: "Leads · Admin" };

type ToolLeadRow = {
  id: string;
  email: string | null;
  tool_slug: string;
  utm_source: string | null;
  created_at: string;
};

type CapturedLeadRow = {
  id: string;
  platform: string;
  handle: string;
  display_name: string | null;
  email: string | null;
  keyword: string | null;
  captured_at: string;
  owner_email: string | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminLeadsPage() {
  const sql = db();

  const [toolLeads, capturedLeads] = (await Promise.all([
    sql`
      select id, email, tool_slug, utm_source, created_at
      from free_tool_leads
      order by created_at desc
      limit 100
    `,
    sql`
      select l.id, l.platform, l.handle, l.display_name, l.email, l.keyword, l.captured_at,
             u.email as owner_email
      from leads l
      left join users u on u.id = l.user_id
      order by l.captured_at desc
      limit 100
    `,
  ])) as [ToolLeadRow[], CapturedLeadRow[]];

  return (
    <>
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black">Leads</h1>
        <p className="mt-2 text-sm text-[#666]">
          Emails captured by the public free tools, and leads captured by customers&apos; own
          lead-capture automations.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-[#D6D6D6] bg-white shadow-sm">
        <h2 className="border-b border-[#D6D6D6] px-6 py-4 text-lg font-black">Free-tool leads</h2>
        {toolLeads.length === 0 ? (
          <p className="p-6 text-sm text-[#666]">No free-tool submissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[#D6D6D6] bg-[#F8FAFC] text-xs font-black uppercase text-[#666]">
                <tr>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Tool</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">Captured</th>
                </tr>
              </thead>
              <tbody>
                {toolLeads.map((row) => (
                  <tr key={row.id} className="border-b border-[#EEE] last:border-0">
                    <td className="px-6 py-3 font-bold text-[#191919]">{row.email || "not provided"}</td>
                    <td className="px-6 py-3 text-[#555]">{row.tool_slug}</td>
                    <td className="px-6 py-3 text-[#555]">{row.utm_source || "direct"}</td>
                    <td className="px-6 py-3 text-[#555]">{formatDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-[#D6D6D6] bg-white shadow-sm">
        <h2 className="border-b border-[#D6D6D6] px-6 py-4 text-lg font-black">Customer-captured leads</h2>
        {capturedLeads.length === 0 ? (
          <p className="p-6 text-sm text-[#666]">
            No captured leads yet — lead-capture automations have not run.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[#D6D6D6] bg-[#F8FAFC] text-xs font-black uppercase text-[#666]">
                <tr>
                  <th className="px-6 py-3">Lead</th>
                  <th className="px-6 py-3">Platform</th>
                  <th className="px-6 py-3">Keyword</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3">Captured</th>
                </tr>
              </thead>
              <tbody>
                {capturedLeads.map((row) => (
                  <tr key={row.id} className="border-b border-[#EEE] last:border-0">
                    <td className="px-6 py-3">
                      <span className="font-bold text-[#191919]">{row.display_name || row.handle}</span>
                      <span className="block text-xs text-[#666]">{row.email || `@${row.handle}`}</span>
                    </td>
                    <td className="px-6 py-3 capitalize text-[#555]">{row.platform}</td>
                    <td className="px-6 py-3 text-[#555]">{row.keyword || "—"}</td>
                    <td className="px-6 py-3 text-[#555]">{row.owner_email || "—"}</td>
                    <td className="px-6 py-3 text-[#555]">{formatDate(row.captured_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
