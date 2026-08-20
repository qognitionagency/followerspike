import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AlertTriangle, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getAppSession } from "@/lib/session";

const pauseSchema = z.object({
  paused: z.enum(["true", "false"]),
  // Nullable, not just optional: the Resume form carries no reason field, so the
  // value arrives as null. `.optional()` alone rejects null, which made the
  // parse fail and the Resume button silently do nothing.
  reason: z.string().max(240).nullable().optional(),
});

async function setGlobalPause(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session?.profile.is_admin) redirect("/app");

  const parsed = pauseSchema.safeParse({
    paused: formData.get("paused"),
    reason: formData.get("reason") || null,
  });
  if (!parsed.success) return;

  const value = {
    paused: parsed.data.paused === "true",
    reason: parsed.data.reason || null,
  };

  const sql = db();
  await sql`
    insert into system_settings (key, value)
    values (${"automation_global_paused"}, ${JSON.stringify(value)}::jsonb)
    on conflict (key) do update set
      value = excluded.value,
      updated_at = now()
  `;

  revalidatePath("/admin");
}

type PauseSetting = {
  paused: boolean;
  reason: string | null;
};

function isPauseSetting(value: unknown): value is PauseSetting {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.paused === "boolean" && (typeof record.reason === "string" || record.reason === null);
}

export default async function AdminPage() {
  const session = await getAppSession();

  if (!session?.profile.is_admin) {
    redirect("/app");
  }

  const sql = db();
  const rows = await sql`select value from system_settings where key = 'automation_global_paused' limit 1`;
  const pause = isPauseSetting(rows[0]?.value) ? rows[0].value : { paused: false, reason: null };

  return (
    <main className="min-h-screen bg-[#F4F2EE] p-8 text-[#191919]">
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase text-[#0A66C2]">Admin</p>
        <h1 className="mt-2 text-3xl font-black">FollowerSpike control room</h1>
        <p className="mt-2 text-sm text-[#666]">Emergency controls for automation operations.</p>
      </section>

      <section className="mt-6 rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-5 w-5 text-amber-600" />
          <div>
            <h2 className="text-xl font-black">Global automation kill switch</h2>
            <p className="mt-2 text-sm leading-6 text-[#666]">
              This stops QStash dispatch before jobs reach the Playwright worker. Use it for incidents, provider
              issues, LinkedIn UI changes, or legal review.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-lg bg-[#F8FAFC] p-4 text-sm font-semibold text-[#555]">
          Current status: {pause.paused ? `paused (${pause.reason || "no reason"})` : "running"}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <form action={setGlobalPause} className="space-y-3">
            <input type="hidden" name="paused" value="true" />
            <input
              name="reason"
              placeholder="Reason for pause"
              className="h-11 w-full rounded-lg border border-[#D6D6D6] bg-white px-3 text-sm"
            />
            <Button className="h-11 w-full rounded-full bg-red-600 font-bold text-white hover:bg-red-700">
              <PauseCircle className="h-4 w-4" />
              Pause All Automation
            </Button>
          </form>
          <form action={setGlobalPause}>
            <input type="hidden" name="paused" value="false" />
            <Button className="h-11 w-full rounded-full bg-[#0A66C2] font-bold text-white hover:bg-[#004182]">
              <PlayCircle className="h-4 w-4" />
              Resume Automation
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
