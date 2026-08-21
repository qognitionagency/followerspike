/**
 * What a job actually does.
 *
 * The registry below is the source of truth for which job kinds exist — there
 * is deliberately no check constraint on `jobs.kind` mirroring it, so adding a
 * handler is a code change and not a migration. A kind whose slot is still null
 * is a kind nothing may enqueue yet: `runJob` parks such a job as a permanent
 * failure rather than retrying it five times against a handler that does not
 * exist.
 */
import { db, databaseConfigured } from "@/lib/db";
import { complete, defer, fail, type Job } from "@/lib/jobs/queue";
import { getAutomationGlobalPause } from "@/lib/admin/settings";
import { publishVariant } from "@/lib/jobs/publish";
import { evergreenRefill } from "@/lib/jobs/evergreen";

/**
 * A handler does the work and throws on failure. It does not touch job state:
 * `runJob` owns the transition to succeeded/failed/dead, so a handler cannot
 * accidentally mark a job done that it did not finish.
 */
export type JobHandler = (job: Job) => Promise<void>;

/** Thrown by a handler whose failure retrying cannot fix — a bad payload, a revoked token, a deleted post. */
export class PermanentJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentJobError";
  }
}

export const JOB_KINDS = [
  "noop",
  "publish_variant",
  "auto_plug",
  "first_comment",
  "evergreen_refill",
  "cross_post_relay",
  "lead_poll",
  "deliver_lead_email",
  "rank_refresh",
] as const;

export type JobKind = (typeof JOB_KINDS)[number];

/**
 * Proves the whole path — enqueue, claim, sign, dispatch, execute, log — with
 * no external dependency to blame when it does not work. Writes the one row
 * that makes a successful run visible in the activity log.
 */
const noop: JobHandler = async (job) => {
  if (!databaseConfigured()) return;

  const sql = db();
  await sql`
    insert into automation_log (workspace_id, action, outcome, reason, meta)
    values (
      ${job.workspace_id},
      'job.noop',
      'success',
      ${`Job ${job.id} executed on attempt ${job.attempts}`},
      ${JSON.stringify({ job_id: job.id, kind: job.kind, payload: job.payload })}::jsonb
    )
  `;
};

/**
 * Every kind the queue knows about. A null slot is a reserved name with no
 * implementation behind it yet — filled in by the wave that builds the feature.
 */
export const jobHandlers: Record<JobKind, JobHandler | null> = {
  noop,

  // --- Publishing -----------------------------------------------------------
  publish_variant: (job) => publishVariant(job),
  /** TODO(automation wave): post the plug reply once the parent post clears its threshold. */
  auto_plug: null,
  /** TODO(automation wave): drop the prepared first comment under a published post. */
  first_comment: null,
  evergreen_refill: (job) => evergreenRefill(job),
  /** TODO(automation wave): mirror a published post to the other connected platforms. */
  cross_post_relay: null,

  // --- Leads ----------------------------------------------------------------
  /** TODO(leads wave): poll a source post for keyword comments and capture them into leads. */
  lead_poll: null,
  /** TODO(leads wave): send the captured lead its promised delivery via Resend. */
  deliver_lead_email: null,

  // --- Spike Rank -----------------------------------------------------------
  /** TODO(rank wave): re-score a connected account and append to profile_scores. */
  rank_refresh: null,
};

/** Null for an unknown kind and for a reserved kind that has no implementation yet. */
export function getHandler(kind: string): JobHandler | null {
  return jobHandlers[kind as JobKind] ?? null;
}

/** How long a job waits before asking again whether the pause is still on. */
const PAUSE_RETRY_SECONDS = 5 * 60;

/**
 * A blocked run is written to the same log a successful one is. The table's
 * whole point is that "nothing the product does on a user's behalf is invisible
 * to them", and a pause that silently swallows work would defeat that.
 */
async function logBlocked(job: Job, reason: string | null): Promise<void> {
  if (!databaseConfigured()) return;
  try {
    const sql = db();
    await sql`
      insert into automation_log (workspace_id, action, outcome, reason, meta)
      values (
        ${job.workspace_id},
        ${`job.${job.kind}`},
        'blocked',
        ${reason || "automation_global_pause"},
        ${JSON.stringify({ job_id: job.id, kind: job.kind })}::jsonb
      )
    `;
  } catch {
    // Never let an audit write turn a deferral into a failure.
  }
}

export type JobRunResult = { ok: true } | { ok: false; error: string };

/**
 * Runs one claimed job and records its outcome.
 *
 * Never throws: the dispatcher fans out a batch and one poisonous job must not
 * take the rest of the batch down with it. The failure is already durable in
 * `jobs.last_error` by the time this returns.
 */
export async function runJob(job: Job): Promise<JobRunResult> {
  // The kill switch is checked here rather than at claim time, so a pause that
  // lands mid-tick still stops work that has already been handed out. The admin
  // console, /trust and /security all promise this stops everything; until the
  // full safety gate arrives this is the whole of that promise.
  const pause = await getAutomationGlobalPause();
  if (pause.paused) {
    await logBlocked(job, pause.reason);
    // Deferred, not failed: the work is still wanted once someone resumes.
    await defer(job.id, PAUSE_RETRY_SECONDS);
    return { ok: false, error: "Automation is globally paused" };
  }

  const handler = getHandler(job.kind);

  if (!handler) {
    const error = `No handler registered for job kind "${job.kind}"`;
    await fail(job.id, error, { permanent: true });
    return { ok: false, error };
  }

  try {
    await handler(job);
    await complete(job.id);
    return { ok: true };
  } catch (error) {
    await fail(job.id, error, { permanent: error instanceof PermanentJobError });
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
