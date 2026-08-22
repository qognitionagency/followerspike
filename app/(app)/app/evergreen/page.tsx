import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Recycle, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireAppSession } from "@/lib/session";
import { requireWorkspace } from "@/lib/workspace";
import { addItem, deleteItem, dueCount, listItems, setActive } from "@/lib/evergreen/store";
import { activeConnections } from "@/lib/platforms/connect";
import { enqueue } from "@/lib/jobs/queue";
import { platformLabel } from "@/lib/platforms/types";
import { ALL_PLATFORMS } from "@/lib/platforms/registry";
import type { Platform } from "@/lib/types/db";

export const metadata = { title: "Evergreen" };

/**
 * The evergreen library.
 *
 * Recycling is queued, never published from here: "Queue one now" enqueues an
 * `evergreen_refill` job, which creates a scheduled post that goes out through
 * the same publish path as everything else. That indirection is what keeps the
 * safety gate and the double-post claim on the only path that publishes.
 */

const addSchema = z.object({
  content: z.string().min(20).max(5000),
  platforms: z.array(z.enum(["x", "linkedin", "bluesky"])).min(1),
  cooldownDays: z.coerce.number().int().min(7).max(365).optional(),
});

const itemSchema = z.object({ itemId: z.string().uuid() });

async function addEvergreen(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const parsed = addSchema.safeParse({
    content: formData.get("content"),
    platforms: formData.getAll("platforms"),
    cooldownDays: formData.get("cooldownDays") || undefined,
  });
  if (!parsed.success) return;

  await addItem({
    workspaceId: context.workspace.id,
    userId: session.userId,
    content: parsed.data.content,
    platforms: parsed.data.platforms as Platform[],
    cooldownDays: parsed.data.cooldownDays,
  });

  revalidatePath("/app/evergreen");
}

async function toggleEvergreen(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const parsed = itemSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) return;

  await setActive(context.workspace.id, parsed.data.itemId, formData.get("next") === "active");
  revalidatePath("/app/evergreen");
}

async function removeEvergreen(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const parsed = itemSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) return;

  await deleteItem(context.workspace.id, parsed.data.itemId);
  revalidatePath("/app/evergreen");
}

async function queueRefill() {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  // No idempotency key: asking for a second recycle is a legitimate repeat, and
  // a key would make the second click silently do nothing.
  await enqueue({ kind: "evergreen_refill", workspaceId: context.workspace.id });
  revalidatePath("/app/evergreen");
}

function relativeDay(value: string | null): string {
  if (!value) return "never used";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "used today";
  return `used ${days} day${days === 1 ? "" : "s"} ago`;
}

export default async function EvergreenPage() {
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const [items, due, connected] = await Promise.all([
    listItems(context.workspace.id),
    dueCount(context.workspace.id),
    activeConnections(context.workspace.id),
  ]);

  const connectedPlatforms = new Set(connected.map((account) => account.platform));

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-[#0A66C2]">Evergreen</p>
            <h1 className="mt-2 text-3xl font-black text-[#191919]">Posts worth sending more than once.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#666]">
              Each item waits out its cooldown before it can be recycled, so the same post never reappears twice in
              a row. Recycled posts are scheduled for review, not published straight away.
            </p>
          </div>
          <form action={queueRefill}>
            <Button
              disabled={due === 0}
              className="h-11 rounded-full bg-[#0A66C2] font-black text-white hover:bg-[#004182] disabled:opacity-50"
            >
              <Recycle className="mr-2 h-4 w-4" />
              Queue one now
            </Button>
          </form>
        </div>
        <p className="mt-4 text-sm font-bold text-[#666]">
          {items.length} item{items.length === 1 ? "" : "s"} · {due} due for recycling
        </p>
      </section>

      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-[#191919]">Add an item</h2>
        <form action={addEvergreen} className="mt-4 space-y-4">
          <Textarea
            name="content"
            required
            minLength={20}
            placeholder="Paste a post that worked and is still true in six months…"
            className="min-h-32 bg-white"
          />
          <div className="flex flex-wrap items-center gap-4">
            <fieldset className="flex flex-wrap items-center gap-3">
              <legend className="sr-only">Platforms</legend>
              {ALL_PLATFORMS.map((platform) => (
                <label key={platform} className="flex items-center gap-2 text-sm font-bold text-[#333]">
                  <input
                    type="checkbox"
                    name="platforms"
                    value={platform}
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
            <label className="flex items-center gap-2 text-sm font-bold text-[#333]">
              Cooldown
              <Input
                type="number"
                name="cooldownDays"
                min={7}
                max={365}
                defaultValue={30}
                className="h-10 w-24 bg-white"
              />
              days
            </label>
          </div>
          <Button className="h-11 rounded-full bg-[#191919] font-black text-white hover:bg-black">
            Add to library
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-xl border border-[#D6D6D6] bg-white p-6 text-sm leading-6 text-[#666]">
            Nothing in the library yet. Add a post above and it becomes eligible for recycling straight away.
          </p>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className={`rounded-xl border border-[#D6D6D6] bg-white p-5 shadow-sm ${item.is_active ? "" : "opacity-60"}`}
            >
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#333]">{item.content}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#F0F0F0] pt-3 text-xs font-bold text-[#666]">
                <span className="rounded-full bg-[#EEF3F8] px-2.5 py-1 text-[#0A66C2]">
                  {(item.platforms ?? []).map(platformLabel).join(", ") || "no platform"}
                </span>
                <span>{relativeDay(item.last_used_at)}</span>
                <span>·</span>
                <span>{item.use_count} use{item.use_count === 1 ? "" : "s"}</span>
                <span>·</span>
                <span>{item.cooldown_days}d cooldown</span>

                <div className="ml-auto flex items-center gap-2">
                  <form action={toggleEvergreen}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="next" value={item.is_active ? "paused" : "active"} />
                    <button className="rounded-full border border-[#D6D6D6] px-3 py-1 font-bold text-[#333] hover:bg-[#F4F2EE]">
                      {item.is_active ? "Pause" : "Resume"}
                    </button>
                  </form>
                  <form action={removeEvergreen}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <button
                      aria-label="Delete item"
                      className="rounded-full border border-[#D6D6D6] p-1.5 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
