"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, PenLine, Send, X } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORM_LIMIT, THREADABLE, splitIntoThread, type ThreadPlatform } from "@/lib/compose/thread";

/**
 * The editor.
 *
 * The preview calls the same `splitIntoThread` the save path calls — importing
 * it here is safe because the module is pure, with no server-only dependency. A
 * preview computed by different code than the publisher would eventually
 * disagree with it, and the author would only find out after posting.
 */

export type ComposerPlatformOption = {
  platform: ThreadPlatform;
  label: string;
  handle: string;
  connected: boolean;
};

/** What the generate server action hands back. Failure is reported, never a canned post. */
export type GenerateResult =
  | { ok: true; content: string; rationale: string; voiceProfileId: string }
  | { ok: false; error: string };

export function ComposerForm({
  options,
  action,
  generate,
  discard,
  hasVoice,
  voiceName,
  error,
}: {
  options: ComposerPlatformOption[];
  action: (formData: FormData) => void;
  generate: (input: { topic: string; platform?: ThreadPlatform }) => Promise<GenerateResult>;
  discard: (formData: FormData) => void;
  hasVoice: boolean;
  voiceName: string | null;
  error?: string;
}) {
  const connected = options.filter((option) => option.connected);
  const [content, setContent] = useState("");
  const [numbered, setNumbered] = useState(false);
  const [selected, setSelected] = useState<ThreadPlatform[]>(
    connected.length > 0 ? [connected[0].platform] : []
  );

  const [topic, setTopic] = useState("");
  const [pending, startGenerating] = useTransition();
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  // The exact text the model produced, held so the save path can tell whether
  // the author changed it. Cleared the moment the draft stops being a
  // generation, or a later edit would be attributed to a profile that did not
  // write this text.
  const [generated, setGenerated] = useState<{ text: string; voiceProfileId: string } | null>(null);

  function runGenerate() {
    setGenerateError(null);
    startGenerating(async () => {
      const result = await generate({ topic, platform: selected[0] });
      if (!result.ok) {
        setGenerateError(result.error);
        return;
      }
      setContent(result.content);
      setRationale(result.rationale || null);
      setGenerated({ text: result.content, voiceProfileId: result.voiceProfileId });
    });
  }

  function clearGeneration() {
    setGenerated(null);
    setRationale(null);
    setContent("");
  }

  const previews = useMemo(
    () =>
      selected.map((platform) => {
        const limit = PLATFORM_LIMIT[platform];
        const items = splitIntoThread(content, { platform, numbered });
        const longest = items.reduce((max, item) => Math.max(max, Array.from(item).length), 0);
        return {
          platform,
          items,
          limit,
          threadable: THREADABLE[platform],
          overLimit: !THREADABLE[platform] && longest > limit,
          longest,
        };
      }),
    [content, numbered, selected]
  );

  const blocked = previews.some((preview) => preview.overLimit);

  function toggle(platform: ThreadPlatform) {
    setSelected((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]
    );
  }

  if (connected.length === 0) {
    return (
      <div className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#191919]">Connect an account first</h2>
        <p className="mt-2 text-sm leading-6 text-[#666]">
          The composer publishes through a connected account, so there is nothing for it to write to
          yet. Bluesky connects in under a minute with an app password.
        </p>
        <a
          href="/app/accounts"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#0A66C2] px-6 font-bold text-white hover:bg-[#004182]"
        >
          Connect an account
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <input type="hidden" name="content" value={content} />
      <input type="hidden" name="platforms" value={selected.join(",")} />
      <input type="hidden" name="numbered" value={numbered ? "true" : "false"} />
      <input type="hidden" name="generatedText" value={generated?.text ?? ""} />
      <input type="hidden" name="voiceProfileId" value={generated?.voiceProfileId ?? ""} />

      <div className="space-y-4">
        <div className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
          <label htmlFor="composer-topic" className="text-sm font-black uppercase text-[#0A66C2]">
            Write in your voice
          </label>
          {hasVoice ? (
            <p className="mt-2 text-sm leading-6 text-[#666]">
              Drafted against {voiceName}. Everything it produces is editable before it goes
              anywhere, and your edits are what the profile learns from.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[#666]">
              No voice profile yet.{" "}
              <a href="/app/voice" className="font-bold text-[#0A66C2] underline">
                Build one
              </a>{" "}
              and the composer can draft as you rather than guessing.
            </p>
          )}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              id="composer-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="What should this post be about?"
              disabled={!hasVoice}
              className="h-11 bg-white"
            />
            <Button
              type="button"
              onClick={runGenerate}
              disabled={!hasVoice || pending || topic.trim().length === 0}
              className="h-11 shrink-0 rounded-full bg-[#0A66C2] px-6 font-bold text-white hover:bg-[#004182] disabled:opacity-60"
            >
              <PenLine className="h-4 w-4" />
              {pending ? "Drafting" : "Draft it"}
            </Button>
          </div>

          {generateError ? (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-[#FEF2F2] p-3 text-sm font-bold text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {generateError}
            </p>
          ) : null}

          {generated ? (
            <div className="mt-4 rounded-lg border border-[#D6D6D6] bg-[#F8FAFC] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm font-black text-[#191919]">Drafted in your voice</p>
                <Button
                  name="generatedText"
                  value={generated.text}
                  formAction={discard}
                  onClick={clearGeneration}
                  className="h-8 rounded-full bg-white px-3 text-xs font-bold text-[#555] hover:bg-[#EEE]"
                >
                  <X className="h-3 w-3" />
                  Discard
                </Button>
              </div>
              {rationale ? (
                <p className="mt-2 text-sm leading-6 text-[#666]">{rationale}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
          <label htmlFor="composer-body" className="text-sm font-black uppercase text-[#0A66C2]">
            Write once
          </label>
          <Textarea
            id="composer-body"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={12}
            placeholder="What did you learn this week that your audience would act on?"
            className="mt-3 bg-white text-base"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {options.map((option) => (
              <button
                key={option.platform}
                type="button"
                disabled={!option.connected}
                onClick={() => toggle(option.platform)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  selected.includes(option.platform)
                    ? "bg-[#0A66C2] text-white"
                    : option.connected
                      ? "bg-[#F4F2EE] text-[#191919] hover:bg-[#E6E2DA]"
                      : "cursor-not-allowed bg-[#F4F2EE] text-[#AAA]"
                }`}
                title={option.connected ? `@${option.handle}` : "Not connected"}
              >
                {option.label}
              </button>
            ))}

            <label className="ml-auto flex items-center gap-2 text-sm font-bold text-[#555]">
              <input
                type="checkbox"
                checked={numbered}
                onChange={(event) => setNumbered(event.target.checked)}
                className="h-4 w-4"
              />
              Number the thread
            </label>
          </div>
        </div>

        {error ? (
          <p className="flex items-start gap-2 rounded-xl bg-[#FEF2F2] p-4 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button
            name="intent"
            value="draft"
            disabled={!content.trim() || selected.length === 0 || blocked}
            className="h-12 rounded-full bg-[#191919] px-7 font-bold text-white hover:bg-[#0A66C2]"
          >
            Save draft
          </Button>
          <Button
            name="intent"
            value="schedule"
            disabled={!content.trim() || selected.length === 0 || blocked}
            className="h-12 rounded-full bg-[#0A66C2] px-7 font-bold text-white hover:bg-[#004182]"
          >
            <Send className="h-4 w-4" />
            Schedule
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {previews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#D6D6D6] p-6 text-sm text-[#666]">
            Pick a platform to see how it will read.
          </p>
        ) : null}

        {previews.map((preview) => (
          <article key={preview.platform} className="rounded-xl border border-[#D6D6D6] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black uppercase text-[#0A66C2]">{preview.platform}</p>
              <span
                className={`text-xs font-black ${
                  preview.overLimit ? "text-red-700" : "text-[#666]"
                }`}
              >
                {preview.longest}/{preview.limit.toLocaleString()}
                {preview.threadable && preview.items.length > 1 ? ` · ${preview.items.length} posts` : ""}
              </span>
            </div>

            {preview.overLimit ? (
              <p className="mt-3 rounded-lg bg-[#FEF2F2] p-3 text-sm font-bold text-red-700">
                Too long, and {preview.platform} has no threads, so trim it to {preview.limit.toLocaleString()}{" "}
                characters.
              </p>
            ) : null}

            <div className="mt-3 space-y-2">
              {preview.items.map((item, index) => (
                <p
                  key={`${preview.platform}-${index}`}
                  className="whitespace-pre-line rounded-lg bg-[#F8FAFC] p-3 text-sm leading-6 text-[#333]"
                >
                  {item}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </form>
  );
}
