import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, PenLine } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireAppSession } from "@/lib/session";
import { requireWorkspace } from "@/lib/workspace";
import { INTERVIEW_QUESTIONS, isComplete, normalizeAnswers } from "@/lib/voice/interview";
import { activeProfile, calibrationSummary, latestInterview, saveInterview, saveProfile } from "@/lib/voice/store";
import { synthesizeVoice } from "@/lib/voice/synthesize";
import { embeddingCount, embeddingsConfigured, replaceEmbeddings } from "@/lib/voice/embeddings";
import { SLIDER_LABELS, SLIDER_MAX, type VoiceSliders } from "@/lib/voice/types";
import { canBuildFromPosts, samplesFrom, voiceSources } from "@/lib/voice/import";
import { platformLabel } from "@/lib/platforms/types";

export const metadata = { title: "Voice" };

/**
 * The voice page.
 *
 * Three ways in, in the order they cost the member anything.
 *
 * If an account is connected, its posts are read and modelled directly: one
 * button, no typing. That is the whole point of connecting an account, and it
 * used to be missing. `synthesizeVoice` always accepted samples; the only way
 * to supply them was to go and paste them in by hand, so the fastest route to a
 * profile was answering eight questions about how you write rather than showing
 * the model what you had already written.
 *
 * Failing that, a three-question interview, with the optional five folded away
 * until somebody wants them. Failing that, paste posts manually.
 *
 * All three land in the same `voice_profiles` row.
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

/**
 * Builds a profile from the writing already on a connected account.
 *
 * No form fields: everything it needs is the connection. Reads the accounts,
 * pools what is long enough to learn from, and models it.
 */
async function buildFromAccounts() {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const sources = await voiceSources(context.workspace.id);
  const samples = samplesFrom(sources);

  if (samples.length === 0) {
    redirect("/app/voice?error=no_posts");
  }

  const result = await synthesizeVoice(
    { samples },
    { workspaceId: context.workspace.id, userId: session.userId }
  );

  if (!result.ok) {
    redirect(`/app/voice?error=${result.reason}`);
  }

  const profile = await saveProfile({
    workspaceId: context.workspace.id,
    userId: session.userId,
    profile: result.value,
    source: "import",
  });

  // Embedded from the real posts, not the model's paraphrase of them: the point
  // of retrieval is to surface what this person actually wrote.
  if (profile) {
    await replaceEmbeddings({
      userId: session.userId,
      voiceProfileId: profile.id,
      contents: samples,
      context: { workspaceId: context.workspace.id, userId: session.userId },
    });
  }

  revalidatePath("/app/voice");
  redirect("/app/voice?saved=1");
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
  no_posts:
    "We could not read enough posts from your connected accounts. Answer the three questions below instead.",
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

  const [calibration, exemplarCount, sources] = await Promise.all([
    profile ? calibrationSummary(profile.id) : Promise.resolve(null),
    profile ? embeddingCount(profile.id) : Promise.resolve(0),
    voiceSources(context.workspace.id),
  ]);

  const readableSamples = samplesFrom(sources).length;
  const autoReady = canBuildFromPosts(sources);
  const requiredQuestions = INTERVIEW_QUESTIONS.filter((question) => question.required);
  const optionalQuestions = INTERVIEW_QUESTIONS.filter((question) => !question.required);

  const answers = interview?.answers ?? {};
  const errorKey = typeof params.error === "string" ? params.error : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase text-[#0A66C2]">Voice</p>
        <h1 className="mt-2 text-3xl font-black text-[#191919]">
          {autoReady ? "Your writing is already here." : "Teach FollowerSpike how you sound."}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#666]">
          {autoReady
            ? "We can read your posts from a connected account and model your voice from them. Nothing to type."
            : "Connect an account and we read your posts automatically. Until then, three questions is enough to start."}
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

        {sources.length > 0 ? (
          <div className="mt-5 rounded-lg border border-[#D6D6D6] bg-[#F8FAFC] p-4">
            <ul className="space-y-2">
              {sources.map((source) => (
                <li key={`${source.platform}:${source.handle}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-[#191919]">
                    {platformLabel(source.platform)}
                    <span className="ml-2 font-normal text-[#666]">@{source.handle}</span>
                  </span>
                  {source.unavailable ? (
                    <span className="text-xs font-semibold text-[#666]">{source.unavailable}</span>
                  ) : (
                    <span className="text-xs font-black text-emerald-700">{source.samples.length} posts readable</span>
                  )}
                </li>
              ))}
            </ul>

            {autoReady ? (
              <form action={buildFromAccounts} className="mt-4">
                <Button className="h-12 w-full rounded-full bg-[#0A66C2] font-black text-white hover:bg-[#004182]">
                  <PenLine className="mr-2 h-4 w-4" />
                  Build my voice from {readableSamples} posts
                </Button>
              </form>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-[#D6D6D6] bg-[#F8FAFC] p-4 text-sm leading-6 text-[#666]">
            No account connected yet.{" "}
            <a href="/app/accounts" className="font-bold text-[#0A66C2] underline">
              Connect one
            </a>{" "}
            and we read your posts for you. Bluesky takes about a minute and needs no approval.
          </div>
        )}

        {/*
          The interview is the fallback, so it is presented as one: three
          questions, and the optional five folded away. Showing all eight at once
          made answering them look like the main path, which it never was.
        */}
        <details className="group mt-6" open={!autoReady}>
          <summary className="cursor-pointer list-none text-sm font-black text-[#0A66C2]">
            {autoReady ? "Or answer three questions instead" : "Answer three questions"}
          </summary>

          <form action={buildVoice} className="mt-4 space-y-5">
            <input type="hidden" name="interviewId" value={interview?.id ?? ""} />

            <div className="space-y-4">
              {requiredQuestions.map((question) => (
                <div key={question.id}>
                  <label htmlFor={question.id} className="text-sm font-black text-[#191919]">
                    {question.prompt}
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

            <details className="border-t border-[#E2E2E2] pt-4">
              <summary className="cursor-pointer list-none text-sm font-bold text-[#666]">
                Add more nuance (optional)
              </summary>
              <div className="mt-4 space-y-4">
                {optionalQuestions.map((question) => (
                  <div key={question.id}>
                    <label htmlFor={question.id} className="text-sm font-black text-[#191919]">
                      {question.prompt}
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
            </details>

            <details className="border-t border-[#E2E2E2] pt-4">
              <summary className="cursor-pointer list-none text-sm font-bold text-[#666]">
                Paste posts manually instead
              </summary>
              <p className="mt-2 text-xs leading-5 text-[#666]">
                Only needed when the account you write from is not connectable yet. Separate each post
                with a blank line.
              </p>
              <Textarea
                id="samples"
                name="samples"
                placeholder="Paste a few of your best posts here…"
                className="mt-2 min-h-32 bg-white"
              />
            </details>

            <Button className="h-12 w-full rounded-full bg-[#191919] font-black text-white hover:bg-[#0A66C2]">
              Build from my answers
            </Button>
          </form>
        </details>
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
