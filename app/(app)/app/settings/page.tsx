import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AlertTriangle, PauseCircle, PlayCircle, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRICING, BRAND } from "@/lib/constants";
import { createRazorpaySubscription } from "@/lib/billing/razorpay";
import { requireAppSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const modeSchema = z.object({
  approvalMode: z.enum(["review", "auto", "off"]),
});

const consentSchema = z.object({
  enabled: z.enum(["true", "false"]),
  risk: z.literal("accepted").optional(),
});

const checkoutSchema = z.object({
  tier: z.enum(["starter", "pro", "scale"]),
});

async function updateApprovalMode(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const parsed = modeSchema.safeParse({ approvalMode: formData.get("approvalMode") });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("users").update({ approval_mode: parsed.data.approvalMode }).eq("id", session.userId);
  revalidatePath("/app/settings");
}

async function updateAutopilotConsent(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const parsed = consentSchema.safeParse({ enabled: formData.get("enabled"), risk: formData.get("risk") || undefined });
  if (!parsed.success) return;
  if (parsed.data.enabled === "true" && parsed.data.risk !== "accepted") return;

  const supabase = await createClient();
  const enabled = parsed.data.enabled === "true";
  await supabase
    .from("users")
    .update({
      autopilot_enabled: enabled,
      autopilot_paused: !enabled,
      autopilot_pause_reason: enabled ? null : "user_paused",
      autopilot_accepted_at: enabled ? new Date().toISOString() : session.profile.autopilot_accepted_at,
      risk_acknowledged_at: enabled ? new Date().toISOString() : session.profile.risk_acknowledged_at,
      consent_version: enabled ? BRAND.consentVersion : session.profile.consent_version,
    })
    .eq("id", session.userId);
  revalidatePath("/app/settings");
}

async function deleteLinkedInSession() {
  "use server";
  const session = await requireAppSession();
  const supabase = await createClient();
  await supabase
    .from("users")
    .update({
      linkedin_session_encrypted: null,
      autopilot_enabled: false,
      autopilot_paused: true,
      autopilot_pause_reason: "session_deleted",
    })
    .eq("id", session.userId);
  revalidatePath("/app/settings");
}

async function deleteAccount() {
  "use server";
  const session = await requireAppSession();
  const supabase = createAdminClient();
  await supabase.from("automation_log").insert({
    user_id: session.userId,
    action: "profile_scrape",
    outcome: "success",
    reason: "account_deletion_requested",
  });
  await supabase.auth.admin.deleteUser(session.userId);
  redirect("/");
}

async function startCheckout(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const parsed = checkoutSchema.safeParse({ tier: formData.get("tier") });
  if (!parsed.success) return;
  const subscription = await createRazorpaySubscription({
    tier: parsed.data.tier,
    customerEmail: session.email,
    customerName: session.profile.full_name,
    userId: session.userId,
  });
  redirect(subscription.short_url || `/app/settings?checkout=${subscription.id}`);
}

export default async function SettingsPage() {
  const session = await requireAppSession();

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase tracking-wide text-[#0A66C2]">Settings</p>
        <h1 className="mt-2 text-3xl font-black text-[#191919]">Control risk before growth.</h1>
        <p className="mt-2 text-sm leading-6 text-[#666]">
          FollowerSpike can be aggressive in outcomes, but execution stays consent-based and pauseable.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-[#191919]">Approval mode</h2>
          <form action={updateApprovalMode} className="mt-5 grid gap-3">
            {[
              ["review", "Review", "Every post, comment, and invite waits in the queue."],
              ["auto", "Auto", "Eligible actions can execute when worker safety checks pass."],
              ["off", "Off", "Automation pauses and only drafts are created."],
            ].map(([value, label, help]) => (
              <label key={value} className="flex cursor-pointer gap-3 rounded-lg border border-[#D6D6D6] p-4">
                <input name="approvalMode" type="radio" value={value} defaultChecked={session.profile.approval_mode === value} />
                <span>
                  <span className="block font-black text-[#191919]">{label}</span>
                  <span className="block text-sm text-[#666]">{help}</span>
                </span>
              </label>
            ))}
            <Button className="h-11 rounded-full bg-[#0A66C2] font-bold text-white hover:bg-[#004182]">Save Mode</Button>
          </form>
        </section>

        <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-[#191919]">Live execution consent</h2>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            <div className="mb-2 flex items-center gap-2 font-black">
              <AlertTriangle className="h-4 w-4" />
              Platform risk acknowledgement
            </div>
            Live automation can carry LinkedIn account risk. FollowerSpike uses safety controls designed to reduce
            risk, but it cannot guarantee platform outcomes.
          </div>
          <form action={updateAutopilotConsent} className="mt-5 space-y-4">
            <label className="flex items-start gap-3 text-sm font-semibold text-[#333]">
              <input type="checkbox" name="risk" value="accepted" required />
              I understand and accept the platform risk of enabling live execution.
            </label>
            <Button name="enabled" value="true" className="h-11 w-full rounded-full bg-[#0A66C2] font-bold text-white hover:bg-[#004182]">
              <PlayCircle className="h-4 w-4" />
              Enable Autopilot
            </Button>
          </form>
          <form action={updateAutopilotConsent} className="mt-3">
            <Button name="enabled" value="false" className="h-11 w-full rounded-full bg-[#EEF3F8] font-bold text-[#0A66C2] hover:bg-[#DDECF7]">
              <PauseCircle className="h-4 w-4" />
              Pause Autopilot
            </Button>
          </form>
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-[#F8FAFC] p-3 text-sm font-semibold text-[#555]">
            <ShieldCheck className="h-4 w-4 text-[#0A66C2]" />
            Current status: {session.profile.autopilot_enabled && !session.profile.autopilot_paused ? "enabled" : "paused"}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#191919]">Upgrade with Razorpay</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {PRICING.map((plan) => (
            <form key={plan.tier} action={startCheckout} className="rounded-xl border border-[#D6D6D6] p-4">
              <input type="hidden" name="tier" value={plan.tier} />
              <p className="font-black text-[#191919]">{plan.name}</p>
              <p className="mt-2 text-2xl font-black text-[#0A66C2]">{plan.monthlyInr}</p>
              <Button className="mt-4 h-10 w-full rounded-full bg-[#EEF3F8] font-bold text-[#0A66C2] hover:bg-[#DDECF7]">
                Choose {plan.name}
              </Button>
            </form>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#191919]">Privacy controls</h2>
        <p className="mt-2 text-sm leading-6 text-[#666]">
          Export your data, delete stored LinkedIn session material, or remove the account entirely.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Button asChild className="rounded-full bg-[#EEF3F8] font-bold text-[#0A66C2] hover:bg-[#DDECF7]">
            <a href="/api/privacy/export">Download Data Export</a>
          </Button>
          <form action={deleteLinkedInSession}>
            <Button className="w-full rounded-full bg-amber-600 font-bold text-white hover:bg-amber-700">
              <Trash2 className="h-4 w-4" />
              Delete LinkedIn Session
            </Button>
          </form>
          <form action={deleteAccount}>
            <Button className="w-full rounded-full bg-red-600 font-bold text-white hover:bg-red-700">
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
