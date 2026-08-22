import Link from "next/link";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AlertTriangle, MessageSquarePlus, MessageSquareText, Radio, Recycle, Repeat2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireAppSession } from "@/lib/session";
import { requireWorkspace } from "@/lib/workspace";
import { activeConnections } from "@/lib/platforms/connect";
import { ALL_PLATFORMS, platformsSupporting } from "@/lib/platforms/registry";
import { platformLabel } from "@/lib/platforms/types";
import {
  CAPTURE_POLL_MINUTES,
  CAPTURE_WINDOW_HOURS,
  EVERGREEN_EVERY_DAYS,
  PLUG_DELAY_HOURS,
  RELAY_DELAY_MINUTES,
  listAutomations,
  saveAutomation,
} from "@/lib/automations/store";
import type { Automation, AutomationKind } from "@/lib/types/db";

export const metadata = { title: "Automations" };

/**
 * Configuring the things that fire on their own.
 *
 * Every automation here is off by default and simulates by default, and the two
 * are separate switches on purpose: `dry_run` is what lets someone watch a plug
 * decide to fire for a week before it is allowed to actually post one. The
 * schema defaults `dry_run` to true, and nothing on this page silently clears
 * it — turning it off is a click the user makes.
 *
 * What is offered here is bounded by what the adapters can do rather than by
 * what would be nice to sell. Replies need `supportsThreads`, capture needs
 * `readReplies`, and the platforms that have neither are named as unsupported
 * instead of quietly accepting a configuration that could never run.
 */

const toggleSchema = z.object({
  kind: z.enum(["first_comment", "auto_plug", "cross_post_relay", "comment_capture", "evergreen"]),
  active: z.enum(["true", "false"]),
  dryRun: z.enum(["true", "false"]),
});

const plugSchema = toggleSchema.extend({
  hoursAfter: z.coerce.number().int().min(PLUG_DELAY_HOURS.min).max(PLUG_DELAY_HOURS.max),
  template: z.string().min(1).max(2000),
  link: z.string().url().max(500).optional().or(z.literal("")),
});

const firstCommentSchema = toggleSchema.extend({
  template: z.string().max(2000).optional(),
});

const relaySchema = toggleSchema.extend({
  platforms: z.array(z.enum(["x", "linkedin", "bluesky"])).min(1),
  delayMinutes: z.coerce.number().int().min(RELAY_DELAY_MINUTES.min).max(RELAY_DELAY_MINUTES.max),
});

const captureSchema = toggleSchema.extend({
  keyword: z.string().min(2).max(60),
  windowHours: z.coerce.number().int().min(CAPTURE_WINDOW_HOURS.min).max(CAPTURE_WINDOW_HOURS.max),
  pollMinutes: z.coerce.number().int().min(CAPTURE_POLL_MINUTES.min).max(CAPTURE_POLL_MINUTES.max),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
  link: z.string().url().max(500).optional().or(z.literal("")),
});

const evergreenSchema = toggleSchema.extend({
  everyDays: z.coerce.number().int().min(EVERGREEN_EVERY_DAYS.min).max(EVERGREEN_EVERY_DAYS.max),
});

/** The two fields every form shares, read the same way each time. */
function switches(formData: FormData) {
  return {
    kind: formData.get("kind"),
    active: formData.get("active"),
    dryRun: formData.get("dryRun"),
  };
}

async function saveFirstComment(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const parsed = firstCommentSchema.safeParse({
    ...switches(formData),
    template: formData.get("template") || undefined,
  });
  if (!parsed.success) return;

  await saveAutomation({
    workspaceId: context.workspace.id,
    userId: session.userId,
    kind: "first_comment",
    trigger: {},
    action: { template: parsed.data.template ?? "" },
    isActive: parsed.data.active === "true",
    dryRun: parsed.data.dryRun === "true",
  });

  revalidatePath("/app/automations");
}

async function savePlug(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const parsed = plugSchema.safeParse({
    ...switches(formData),
    hoursAfter: formData.get("hoursAfter"),
    template: formData.get("template"),
    link: formData.get("link") || "",
  });
  if (!parsed.success) return;

  await saveAutomation({
    workspaceId: context.workspace.id,
    userId: session.userId,
    kind: "auto_plug",
    trigger: { hours_after: parsed.data.hoursAfter },
    action: { template: parsed.data.template, link: parsed.data.link || null },
    isActive: parsed.data.active === "true",
    dryRun: parsed.data.dryRun === "true",
  });

  revalidatePath("/app/automations");
}

async function saveRelay(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const parsed = relaySchema.safeParse({
    ...switches(formData),
    platforms: formData.getAll("platforms"),
    delayMinutes: formData.get("delayMinutes"),
  });
  if (!parsed.success) return;

  await saveAutomation({
    workspaceId: context.workspace.id,
    userId: session.userId,
    kind: "cross_post_relay",
    trigger: { delay_minutes: parsed.data.delayMinutes },
    action: { platforms: parsed.data.platforms },
    isActive: parsed.data.active === "true",
    dryRun: parsed.data.dryRun === "true",
  });

  revalidatePath("/app/automations");
}

async function saveCapture(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const parsed = captureSchema.safeParse({
    ...switches(formData),
    keyword: formData.get("keyword"),
    windowHours: formData.get("windowHours"),
    pollMinutes: formData.get("pollMinutes"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    link: formData.get("link") || "",
  });
  if (!parsed.success) return;

  await saveAutomation({
    workspaceId: context.workspace.id,
    userId: session.userId,
    kind: "comment_capture",
    trigger: {
      keyword: parsed.data.keyword,
      window_hours: parsed.data.windowHours,
      poll_minutes: parsed.data.pollMinutes,
    },
    action: { subject: parsed.data.subject, body: parsed.data.body, link: parsed.data.link || null },
    isActive: parsed.data.active === "true",
    dryRun: parsed.data.dryRun === "true",
  });

  revalidatePath("/app/automations");
}

async function saveEvergreenCadence(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const parsed = evergreenSchema.safeParse({
    ...switches(formData),
    everyDays: formData.get("everyDays"),
  });
  if (!parsed.success) return;

  await saveAutomation({
    workspaceId: context.workspace.id,
    userId: session.userId,
    kind: "evergreen",
    trigger: { every_days: parsed.data.everyDays },
    action: {},
    isActive: parsed.data.active === "true",
    dryRun: parsed.data.dryRun === "true",
  });

  revalidatePath("/app/automations");
}

function find(automations: Automation[], kind: AutomationKind): Automation | null {
  return automations.find((automation) => automation.kind === kind) ?? null;
}

function stringField(automation: Automation | null, source: "trigger" | "action", key: string): string {
  const value = automation?.[source]?.[key];
  return typeof value === "string" ? value : "";
}

function numberField(automation: Automation | null, source: "trigger" | "action", key: string, fallback: number): number {
  const value = automation?.[source]?.[key];
  return typeof value === "number" ? value : fallback;
}

function platformField(automation: Automation | null): string[] {
  const value = automation?.action?.platforms;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function relativeRun(value: string | null | undefined): string {
  if (!value) return "has not fired yet";
  const hours = Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000);
  if (hours < 1) return "fired in the last hour";
  if (hours < 24) return `fired ${hours}h ago`;
  return `fired ${Math.floor(hours / 24)}d ago`;
}

/** The state line every card shows, so "on" and "actually posting" never look the same. */
function StatusPill({ automation }: { automation: Automation | null }) {
  if (!automation || !automation.is_active) {
    return <span className="rounded-full bg-[#F4F2EE] px-2.5 py-1 text-xs font-black text-[#666]">Off</span>;
  }
  if (automation.dry_run) {
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">Simulating</span>;
  }
  return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">Live</span>;
}

function Switches({ automation, kind }: { automation: Automation | null; kind: AutomationKind }) {
  return (
    <>
      <input type="hidden" name="kind" value={kind} />
      <div className="flex flex-wrap items-center gap-5 border-t border-[#F0F0F0] pt-4">
        <label className="flex items-center gap-2 text-sm font-bold text-[#333]">
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked={automation?.is_active ?? false}
            className="h-4 w-4 accent-[#0A66C2]"
          />
          Switched on
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-[#333]">
          <input
            type="checkbox"
            name="dryRun"
            value="true"
            defaultChecked={automation?.dry_run ?? true}
            className="h-4 w-4 accent-[#0A66C2]"
          />
          Simulate only
        </label>
        <span className="text-xs font-bold text-[#999]">{relativeRun(automation?.last_run_at)}</span>
        <Button className="ml-auto h-10 rounded-full bg-[#191919] px-5 font-black text-white hover:bg-black">
          Save
        </Button>
      </div>
    </>
  );
}

function Card({
  icon: Icon,
  title,
  body,
  automation,
  children,
}: {
  icon: typeof MessageSquareText;
  title: string;
  body: string;
  automation: Automation | null;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <Icon className="mt-1 h-5 w-5 shrink-0 text-[#0A66C2]" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-black text-[#191919]">{title}</h2>
            <StatusPill automation={automation} />
          </div>
          <p className="mt-2 text-sm leading-6 text-[#666]">{body}</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export default async function AutomationsPage() {
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const [automations, connected] = await Promise.all([
    listAutomations(context.workspace.id),
    activeConnections(context.workspace.id),
  ]);

  const connectedPlatforms = new Set(connected.map((account) => account.platform));
  const replyPlatforms = platformsSupporting("supportsThreads");
  const capturePlatforms = platformsSupporting("readReplies");

  const firstCommentRow = find(automations, "first_comment");
  const plugRow = find(automations, "auto_plug");
  const relayRow = find(automations, "cross_post_relay");
  const captureRow = find(automations, "comment_capture");
  const evergreenRow = find(automations, "evergreen");

  const consented = session.profile.autopilot_enabled && !session.profile.autopilot_paused;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase text-[#0A66C2]">Automations</p>
        <h1 className="mt-2 text-3xl font-black text-[#191919]">Things that happen after you post.</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#666]">
          Each one is triggered by a post going out and runs through the same queue, safety gate, and daily caps as
          everything else. Leave &ldquo;simulate only&rdquo; on to watch what an automation decides without letting it
          act; the decisions are recorded either way.
        </p>
        {!consented ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Autopilot consent is off, so nothing here will publish even when switched on and taken out of
              simulation. <Link href="/app/settings" className="font-black underline">Enable it in settings</Link> when
              you are ready.
            </span>
          </div>
        ) : null}
      </section>

      <Card
        icon={MessageSquarePlus}
        title="First comment"
        body={`Posts the comment you wrote with the post, once the whole thread is up. Works on ${replyPlatforms
          .map(platformLabel)
          .join(" and ")}. LinkedIn exposes no comment endpoint at the permissions we hold.`}
        automation={firstCommentRow}
      >
        <form action={saveFirstComment} className="space-y-4">
          <label className="block text-sm font-bold text-[#333]">
            Fallback comment
            <Textarea
              name="template"
              defaultValue={stringField(firstCommentRow, "action", "template")}
              placeholder="Used when a post has no first comment of its own. Leave empty to only post the ones you write."
              className="mt-2 min-h-24 bg-white"
            />
          </label>
          <Switches automation={firstCommentRow} kind="first_comment" />
        </form>
      </Card>

      <Card
        icon={MessageSquareText}
        title="Auto-plug"
        body="Replies to your own post with a link, hours later, once it has had time to travel. It cannot wait for a view or like threshold: no connected platform gives us post metrics, and an automation that pretended otherwise would be guessing under your name."
        automation={plugRow}
      >
        <form action={savePlug} className="space-y-4">
          <label className="block text-sm font-bold text-[#333]">
            Plug text
            <Textarea
              name="template"
              required
              defaultValue={stringField(plugRow, "action", "template")}
              placeholder="If this was useful, I wrote the longer version here:"
              className="mt-2 min-h-24 bg-white"
            />
          </label>
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-sm font-bold text-[#333]">
              Link
              <Input
                name="link"
                type="url"
                defaultValue={stringField(plugRow, "action", "link")}
                placeholder="https://"
                className="mt-2 h-10 w-72 bg-white"
              />
            </label>
            <label className="text-sm font-bold text-[#333]">
              Hours after the post
              <Input
                name="hoursAfter"
                type="number"
                min={PLUG_DELAY_HOURS.min}
                max={PLUG_DELAY_HOURS.max}
                defaultValue={numberField(plugRow, "trigger", "hours_after", PLUG_DELAY_HOURS.default)}
                className="mt-2 h-10 w-28 bg-white"
              />
            </label>
          </div>
          <Switches automation={plugRow} kind="auto_plug" />
        </form>
      </Card>

      <Card
        icon={Repeat2}
        title="Cross-post relay"
        body="Mirrors a published post onto the platforms it did not go out on, re-split for each one. A relayed post never relays again."
        automation={relayRow}
      >
        <form action={saveRelay} className="space-y-4">
          <fieldset className="flex flex-wrap items-center gap-4">
            <legend className="text-sm font-bold text-[#333]">Mirror to</legend>
            {ALL_PLATFORMS.map((platform) => (
              <label key={platform} className="flex items-center gap-2 text-sm font-bold text-[#333]">
                <input
                  type="checkbox"
                  name="platforms"
                  value={platform}
                  defaultChecked={platformField(relayRow).includes(platform)}
                  disabled={!connectedPlatforms.has(platform)}
                  className="h-4 w-4 accent-[#0A66C2] disabled:opacity-40"
                />
                {platformLabel(platform)}
                {connectedPlatforms.has(platform) ? null : (
                  <span className="text-xs font-normal text-[#999]">(not connected)</span>
                )}
              </label>
            ))}
          </fieldset>
          <label className="block text-sm font-bold text-[#333]">
            Wait before mirroring (minutes)
            <Input
              name="delayMinutes"
              type="number"
              min={RELAY_DELAY_MINUTES.min}
              max={RELAY_DELAY_MINUTES.max}
              defaultValue={numberField(relayRow, "trigger", "delay_minutes", RELAY_DELAY_MINUTES.default)}
              className="mt-2 h-10 w-28 bg-white"
            />
          </label>
          <Switches automation={relayRow} kind="cross_post_relay" />
        </form>
      </Card>

      <Card
        icon={Radio}
        title="Keyword capture"
        body={`Watches the replies on your posts for a word and emails whoever asks. Replies do not carry email addresses, so only a reply that includes one can be delivered to. Ask for both. Works on ${capturePlatforms
          .map(platformLabel)
          .join(" and ")}.`}
        automation={captureRow}
      >
        <form action={saveCapture} className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-sm font-bold text-[#333]">
              Keyword
              <Input
                name="keyword"
                required
                defaultValue={stringField(captureRow, "trigger", "keyword")}
                placeholder="PLAYBOOK"
                className="mt-2 h-10 w-48 bg-white"
              />
            </label>
            <label className="text-sm font-bold text-[#333]">
              Watch for (hours)
              <Input
                name="windowHours"
                type="number"
                min={CAPTURE_WINDOW_HOURS.min}
                max={CAPTURE_WINDOW_HOURS.max}
                defaultValue={numberField(captureRow, "trigger", "window_hours", CAPTURE_WINDOW_HOURS.default)}
                className="mt-2 h-10 w-28 bg-white"
              />
            </label>
            <label className="text-sm font-bold text-[#333]">
              Check every (minutes)
              <Input
                name="pollMinutes"
                type="number"
                min={CAPTURE_POLL_MINUTES.min}
                max={CAPTURE_POLL_MINUTES.max}
                defaultValue={numberField(captureRow, "trigger", "poll_minutes", CAPTURE_POLL_MINUTES.default)}
                className="mt-2 h-10 w-28 bg-white"
              />
            </label>
          </div>
          <label className="block text-sm font-bold text-[#333]">
            Email subject
            <Input
              name="subject"
              required
              defaultValue={stringField(captureRow, "action", "subject")}
              placeholder="Here's the playbook"
              className="mt-2 h-10 w-full bg-white"
            />
          </label>
          <label className="block text-sm font-bold text-[#333]">
            Email body
            <Textarea
              name="body"
              required
              defaultValue={stringField(captureRow, "action", "body")}
              placeholder="You asked for the playbook under my post, so here it is."
              className="mt-2 min-h-24 bg-white"
            />
          </label>
          <label className="block text-sm font-bold text-[#333]">
            Link
            <Input
              name="link"
              type="url"
              defaultValue={stringField(captureRow, "action", "link")}
              placeholder="https://"
              className="mt-2 h-10 w-72 bg-white"
            />
          </label>
          <Switches automation={captureRow} kind="comment_capture" />
        </form>
      </Card>

      <Card
        icon={Recycle}
        title="Evergreen cadence"
        body="Recycles one item from your evergreen library on a schedule, respecting each item's own cooldown. Without this, the library only recycles when you press the button."
        automation={evergreenRow}
      >
        <form action={saveEvergreenCadence} className="space-y-4">
          <label className="block text-sm font-bold text-[#333]">
            Recycle one post every (days)
            <Input
              name="everyDays"
              type="number"
              min={EVERGREEN_EVERY_DAYS.min}
              max={EVERGREEN_EVERY_DAYS.max}
              defaultValue={numberField(evergreenRow, "trigger", "every_days", EVERGREEN_EVERY_DAYS.default)}
              className="mt-2 h-10 w-28 bg-white"
            />
          </label>
          <p className="text-sm leading-6 text-[#666]">
            Recycled posts are scheduled 30 minutes out, so there is always time to cancel one from{" "}
            <Link href="/app/queue" className="font-black text-[#0A66C2] underline">
              the queue
            </Link>
            .
          </p>
          <Switches automation={evergreenRow} kind="evergreen" />
        </form>
      </Card>
    </div>
  );
}
