import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAppSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type TargetLeader = {
  id: string;
  profile_url: string;
  name: string | null;
  headline: string | null;
  company: string | null;
  relevance_score: number | null;
  active: boolean;
};

const targetSchema = z.object({
  profileUrl: z.string().url(),
  name: z.string().min(1).max(120),
  headline: z.string().max(180).optional(),
});

async function addTarget(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const parsed = targetSchema.safeParse({
    profileUrl: formData.get("profileUrl"),
    name: formData.get("name"),
    headline: formData.get("headline") || undefined,
  });

  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.from("target_leaders").upsert(
    {
      user_id: session.userId,
      profile_url: parsed.data.profileUrl,
      name: parsed.data.name,
      headline: parsed.data.headline,
      relevance_score: 7.5,
      active: true,
    },
    { onConflict: "user_id,profile_url" }
  );

  revalidatePath("/app/targets");
}

export default async function TargetsPage() {
  const session = await requireAppSession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("target_leaders")
    .select("id, profile_url, name, headline, company, relevance_score, active")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  const targets = (data as TargetLeader[] | null) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-[#0A66C2]" />
          <div>
            <p className="text-sm font-black uppercase text-[#0A66C2]">Audience and leaders</p>
            <h1 className="text-3xl font-black text-[#191919]">Tell FollowerSpike who to grow around.</h1>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#666]">
          Add seed leaders, buyers, peers, and role models. FollowerSpike uses them to find relevant posts to engage with
          and people worth connecting to.
        </p>
        <form action={addTarget} className="mt-6 space-y-4">
          <Input name="profileUrl" type="url" placeholder="https://www.linkedin.com/in/leader" required className="h-12 bg-white" />
          <Input name="name" placeholder="Target name" required className="h-12 bg-white" />
          <Input name="headline" placeholder="Founder, investor, operator..." className="h-12 bg-white" />
          <Button className="h-12 w-full rounded-full bg-[#0A66C2] font-black text-white hover:bg-[#004182]">
            <Plus className="h-4 w-4" />
            Add Person
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-[#191919]">Active audience signals</h2>
        <div className="mt-5 divide-y divide-[#E2E2E2]">
          {targets.length > 0 ? (
            targets.map((target) => (
              <div key={target.id} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-[#191919]">{target.name}</p>
                    <p className="mt-1 text-sm text-[#666]">{target.headline || target.profile_url}</p>
                  </div>
                  <span className="rounded-full bg-[#EEF3F8] px-3 py-1 text-xs font-black text-[#0A66C2]">
                    {target.relevance_score ?? 7}/10
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-[#666]">No audience signals yet. Add 5-15 leaders to begin the engagement loop.</p>
          )}
        </div>
      </section>
    </div>
  );
}
