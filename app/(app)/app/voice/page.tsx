import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, PenLine } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireAppSession } from "@/lib/session";
import { requireWorkspace } from "@/lib/workspace";
import { INTERVIEW_QUESTIONS, completionRatio, isComplete, normalizeAnswers } from "@/lib/voice/interview";
import { activeProfile, calibrationSummary, latestInterview, saveInterview, saveProfile } from "@/lib/voice/store";
import { synthesizeVoice } from "@/lib/voice/synthesize";
import { embeddingCount, embeddingsConfigured, replaceEmbeddings } from "@/lib/voice/embeddings";
import { SLIDER_LABELS, SLIDER_MAX, type VoiceSliders } from "@/lib/voice/types";

export const metadata = { title: "Voice" };

/**
 * The voice page.
 *
 * Two ways in, because founders arrive in two states. Someone with a posting
 * history pastes it and gets a profile cloned from real writing; someone with
 * none answers the interview, which is what Starter sells as "build your voice
 * with no posts to import". Both land in the same `voice_profiles` row.
 *
 * What this page will not do is save a profile when the model was unavailable.
 * A neutral placeholder profile would not look broken — it would just quietly
 * make every future post sound like somebody else, under the user's real name.
 */

/** Pasted posts are separated by a blank line, which is how people naturally paste them. */
function splitSamples(raw: string): string[] {
  return raw
    .split(/\n\s*\n/)
    .map((sample) => sample.trim())
    .filter((sample) => sample.length > 40);
}

async function buildVoice(formData: FormData) {
  "use server";

  // A server action re-authorizes on its own; the layout gate does not cover it.
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const answers = normalizeAnswers(
    Object.fromEntries(INTERVIEW_QUESTIONS.map((question) => [question.id, formData.get(question.id)]))
  );
  const samples = splitSamples(String(formData.get("samples") ?? ""));

  if (Object.keys(answers).length === 0 && samples.length === 0) {
    redirect("/app/voice?error=empty");
  }

  const interviewId = await saveInterview({
    userId: session.userId,
    interviewId: (formData.get("interviewId") as string) || null,
    answers,
    completed: isComplete(answers),
  });

  const result = await synthesizeVoice(
    { answers, samples },
    { workspaceId: context.workspace.id, userId: session.userId }
  );

  if (!result.ok) {
    // The answers are already saved, so nothing the user typed is lost — only
    // the synthesis has to be retried.
    redirect(`/app/voice?error=${result.reason}`);
  }

  // `import` when real writing drove it, `interview` when only answers did, and
  // `hybrid` when both — the source column is what tells a later regeneration
  // how much to trust each input.
  const source = samples.length > 0 ? (Object.keys(answers).length > 0 ? "hybrid" : "import") : "interview";

  const profile = await saveProfile({
    workspaceId: context.workspace.id,
    userId: session.userId,
    profile: result.value,
    source,
  });

  if (profile) {
    if (interviewId) {
      await saveInterview({
        userId: session.userId,
        interviewId,
        answers,
        completed: isComplete(answers),
        voiceProfileId: profile.id,
      });
    }

    // Embedded from the pasted samples rather than the model's exemplars: the
    // point of retrieval is to surface what this person actually wrote.
    const toEmbed = samples.length > 0 ? samples : result.value.exemplars;
    if (toEmbed.length > 0) {
      await replaceEmbeddings({
        userId: session.userId,
        voiceProfileId: profile.id,
        contents: toEmbed,
        context: { workspaceId: context.workspace.id, userId: session.userId },
      });
    }
  }

  revalidatePath("/app/voice");
  redirect("/app/voice?saved=1");
}

const ERROR_COPY: Record<string, string> = {
  empty: "Answer at least one question or paste a post before building a voice.",
  no_provider_configured:
    "No AI provider is configured, so a voice cannot be built yet. Your answers were saved.",
  all_providers_failed: "The AI provider could not be reached. Your answers were saved, so try again shortly.",
  invalid_response: "The model returned an unusable profile. Your answers were saved, so try again.",
};

function SliderBar({ name, value }: { name: keyof VoiceSliders; value: number }) {
  const meta = SLIDER_LABELS[name];
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs font-bold text-[#666]">
        <span>{meta.low}</span>
        <span className="text-[#191919]">{meta.label}</span>
        <span>{meta.high}</span>
      </div>
      <div className="mt-1.5 flex gap-1">
        {Array.from({ length: SLIDER_MAX }, (_, index) => (
          <span
            key={index}
            className={`h-2 flex-1 rounded-full ${index < value ? "bg-[#0A66C2]" : "bg-[#E2E8F0]"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default async function VoicePage({
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await requireAppSession();
  const context = await requireWorkspace(session);
  const params = searchParams;

  const [profile, interview] = await Promise.all([
    activeProfile(context.workspace.id),
    latestInterview(session.userId),
  ]);

  const [calibration, exemplarCount] = await Promise.all([
    profile ? calibrationSummary(profile.id) : Promise.resolve(null),
    profile ? embeddingCount(profile.id) : Promise.resolve(0),
  ]);

  const answers = interview?.answers ?? {};
  const progress = Math.round(completionRatio(answers) * 100);
  const errorKey = typeof params.error === "string" ? params.error : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase text-[#0A66C2]">Voice modelling</p>
        <h1 className="mt-2 text-3xl font-black text-[#191919]">Teach FollowerSpike how you sound.</h1>
        <p className="mt-2 text-sm leading-6 text-[#666]">
          Paste posts you have already written, answer the interview, or do both. Pasted writing is the strongest
          signal; the interview exists so you can start with none.
        </p>

        {params.saved ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Voice profile saved.
          </div>
        ) : null}

        {errorKey ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {ERROR_COPY[errorKey] ?? "Something went wrong building the voice profile."}
          </div>
        ) : null}

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-bold text-[#666]">
            <span>Interview progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-[#E2E8F0]">
            <div className="h-2 rounded-full bg-[#0A66C2]" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <form action={buildVoice} className="mt-6 space-y-5">
          <input type="hidden" name="interviewId" value={interview?.id ?? ""} />

          <div>
            <label htmlFor="samples" className="text-sm font-black text-[#191919]">
              Posts you have written
            </label>
            <p className="mt-1 text-xs leading-5 text-[#666]">
              Separate each post with a blank line. Anything shorter than a couple of sentences is ignored.
            </p>
            <Textarea
              id="samples"
              name="samples"
              placeholder="Paste a few of your best posts here…"
              className="mt-2 min-h-40 bg-white"
            />
          </div>

          <div className="space-y-4 border-t border-[#E2E2E2] pt-5">
            {INTERVIEW_QUESTIONS.map((question) => (
              <div key={question.id}>
                <label htmlFor={question.id} className="text-sm font-black text-[#191919]">
                  {question.prompt}
                  {question.required ? <span className="ml-1 text-[#0A66C2]">*</span> : null}
                </label>
                <p className="mt-1 text-xs leading-5 text-[#666]">{question.help}</p>
                {question.long ? (
                  <Textarea
                    id={question.id}
                    name={question.id}
                    defaultValue={answers[question.id] ?? ""}
                    className="mt-2 min-h-24 bg-white"
                  />
                ) : (
                  <Input
                    id={question.id}
                    name={question.id}
                    defaultValue={answers[question.id] ?? ""}
                    className="mt-2 h-12 bg-white"
                  />
                )}
              </div>
            ))}
          </div>

          <Button className="h-12 w-full rounded-full bg-[#0A66C2] font-black text-white hover:bg-[#004182]">
            <PenLine className="mr-2 h-4 w-4" />
            Build my voice profile
          </Button>
        </form>
      </section>

      <section className="space-y-6">
        <div className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-[#191919]">Current voice</h2>
            {profile ? (
              <span className="text-xs font-bold uppercase text-[#666]">
                v{profile.version} · {profile.source}
              </span>
            ) : null}
          </div>

          {profile ? (
            <div className="mt-5 space-y-6">
              {profile.profile.summary ? (
                <p className="rounded-lg bg-[#F8FAFC] p-4 text-sm leading-6 text-[#333]">{profile.profile.summary}</p>
              ) : null}

              <div className="space-y-3">
                {(Object.keys(SLIDER_LABELS) as Array<keyof VoiceSliders>).map((key) => (
                  <SliderBar key={key} name={key} value={profile.profile.sliders[key]} />
                ))}
              </div>

              {profile.profile.lexicon.length > 0 ? (
                <div>
                  <p className="text-xs font-black uppercase text-[#0A66C2]">Words you reach for</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profile.profile.lexicon.slice(0, 24).map((word) => (
                      <span key={word} className="rounded-full bg-[#EEF3F8] px-2.5 py-1 text-xs font-bold text-[#0A66C2]">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {profile.profile.taboo.length > 0 ? (
                <div>
                  <p className="text-xs font-black uppercase text-red-700">Never use</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profile.profile.taboo.slice(0, 24).map((word) => (
                      <span key={word} className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-5 rounded-lg bg-[#F8FAFC] p-6 text-sm leading-6 text-[#666]">
              No voice profile yet. Paste a few posts or answer the interview to build one.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-[#191919]">How well it fits</h2>
          {calibration && calibration.total > 0 ? (
            <>
              <p className="mt-2 text-sm leading-6 text-[#666]">
                You kept {calibration.kept} of {calibration.total} drafts unedited
                {" "}({Math.round(calibration.keptRatio * 100)}%). Every edit you make sharpens the next version.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Kept", value: calibration.kept },
                  { label: "Edited", value: calibration.edited },
                  { label: "Rejected", value: calibration.rejected },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-[#F8FAFC] p-3">
                    <p className="text-xl font-black text-[#191919]">{stat.value}</p>
                    <p className="text-xs font-bold text-[#666]">{stat.label}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[#666]">
              No drafts have been reviewed yet. Once you approve or edit generated posts, the fit is measured here.
            </p>
          )}

          <p className="mt-4 border-t border-[#E2E2E2] pt-4 text-xs leading-5 text-[#666]">
            {embeddingsConfigured()
              ? `${exemplarCount} exemplar${exemplarCount === 1 ? "" : "s"} indexed for topic matching.`
              : "Topic matching is off until an embedding provider is configured."}
          </p>
        </div>
      </section>
    </div>
  );
}
