import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { analyzeBrandTone, linkedinUrlSchema } from "@/lib/ai/generators";
import { requireAppSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { JsonObject } from "@/lib/types";

const voiceSchema = z.object({
  fullName: z.string().min(1).max(120),
  linkedinUrl: linkedinUrlSchema,
  niche: z.string().min(2).max(120),
  icpDescription: z.string().min(5).max(500),
});

async function saveVoice(formData: FormData) {
  "use server";

  const session = await requireAppSession();
  const parsed = voiceSchema.safeParse({
    fullName: formData.get("fullName"),
    linkedinUrl: formData.get("linkedinUrl"),
    niche: formData.get("niche"),
    icpDescription: formData.get("icpDescription"),
  });

  if (!parsed.success) {
    redirect("/app/voice?error=invalid");
  }

  const brandVoice = await analyzeBrandTone({
    linkedinUrl: parsed.data.linkedinUrl,
    headline: parsed.data.niche,
    about: parsed.data.icpDescription,
    goal: "build founder-led LinkedIn demand",
  });

  const supabase = await createClient();
  await supabase
    .from("users")
    .update({
      full_name: parsed.data.fullName,
      linkedin_url: parsed.data.linkedinUrl,
      niche: parsed.data.niche,
      icp_description: parsed.data.icpDescription,
      brand_voice: brandVoice,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", session.userId);

  revalidatePath("/app/voice");
  redirect("/app/voice?saved=1");
}

export default async function VoicePage({
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await requireAppSession();
  const params = searchParams;
  const brandVoice = (session.profile.brand_voice ?? {}) as JsonObject;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase tracking-wide text-[#0A66C2]">Brand tone learning</p>
        <h1 className="mt-2 text-3xl font-black text-[#191919]">Teach FollowerSpike how you sound.</h1>
        <p className="mt-2 text-sm leading-6 text-[#666]">
          No voice prompt needed. Start with your public profile and positioning; the AI turns it into a reusable
          brand voice profile.
        </p>
        {params.saved ? (
          <div className="mt-4 flex gap-2 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Voice profile saved.
          </div>
        ) : null}
        {params.error ? (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
            Check the LinkedIn URL and required fields.
          </div>
        ) : null}
        <form action={saveVoice} className="mt-6 space-y-4">
          <Input name="fullName" defaultValue={session.profile.full_name ?? ""} placeholder="Full name" required className="h-12 bg-white" />
          <Input
            name="linkedinUrl"
            defaultValue={session.profile.linkedin_url ?? ""}
            placeholder="https://www.linkedin.com/in/yourname"
            required
            className="h-12 bg-white"
          />
          <Input name="niche" defaultValue={session.profile.niche ?? ""} placeholder="Niche" required className="h-12 bg-white" />
          <Textarea
            name="icpDescription"
            defaultValue={session.profile.icp_description ?? ""}
            placeholder="Who do you want to reach and what should they know you for?"
            required
            className="min-h-32 bg-white"
          />
          <Button className="h-12 w-full rounded-full bg-[#0A66C2] font-black text-white hover:bg-[#004182]">
            Save Voice Profile
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-[#191919]">Current voice profile</h2>
        <div className="mt-5 grid gap-4">
          {Object.keys(brandVoice).length > 0 ? (
            Object.entries(brandVoice).slice(0, 8).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-[#E2E2E2] bg-[#F8FAFC] p-4">
                <p className="text-xs font-black uppercase tracking-wide text-[#0A66C2]">{key.replace(/_/g, " ")}</p>
                <p className="mt-2 text-sm leading-6 text-[#333]">
                  {typeof value === "string" ? value : JSON.stringify(value)}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-lg bg-[#F8FAFC] p-6 text-sm leading-6 text-[#666]">
              No voice profile yet. Save the form to generate one.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
