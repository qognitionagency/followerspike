import { db, databaseConfigured } from "@/lib/db";
import type { VoiceProfile, VoiceProfileSource } from "@/lib/types/db";
import { normalizeAnswers, type InterviewAnswers } from "@/lib/voice/interview";
import { parseVoiceProfile, type VoiceProfileShape } from "@/lib/voice/types";

/**
 * Reading and writing the voice tables.
 *
 * `voice_profiles`, `voice_interviews` and `voice_calibrations` have existed
 * since the v2 migration with nothing writing to them — the voice form wrote a
 * blob to `users.brand_voice` instead. This module is the only writer, so the
 * "one active profile per workspace" rule below has a single place to hold.
 *
 * Every query is scoped by `workspace_id`. There is no RLS on this database
 * (see lib/workspace.ts), so that predicate is the access control.
 */

export type StoredVoiceProfile = Omit<VoiceProfile, "profile"> & {
  profile: VoiceProfileShape;
};

function hydrate(row: VoiceProfile): StoredVoiceProfile {
  return { ...row, profile: parseVoiceProfile(row.profile) };
}

/** The workspace's active profile, or null before one has been built. */
export async function activeProfile(workspaceId: string): Promise<StoredVoiceProfile | null> {
  if (!databaseConfigured()) return null;

  const sql = db();
  const rows = (await sql`
    select * from voice_profiles
    where workspace_id = ${workspaceId} and is_active
    order by version desc, created_at desc
    limit 1
  `) as VoiceProfile[];

  return rows[0] ? hydrate(rows[0]) : null;
}

/** Every version, newest first. Agency tier keeps a separate saved voice per client workspace. */
export async function profileHistory(workspaceId: string, limit = 20): Promise<StoredVoiceProfile[]> {
  if (!databaseConfigured()) return [];

  const sql = db();
  const rows = (await sql`
    select * from voice_profiles
    where workspace_id = ${workspaceId}
    order by created_at desc
    limit ${limit}::int
  `) as VoiceProfile[];

  return rows.map(hydrate);
}

/**
 * Writes a new version and retires the previous one.
 *
 * Versioned rather than updated in place: `voice_calibrations` point at the
 * profile that produced a draft, so overwriting a profile would silently
 * re-attribute every past correction to a model that never generated it.
 *
 * Done as two statements because the Neon HTTP driver has no transaction. The
 * deactivate runs first: a crash between them leaves a workspace with no active
 * profile, which the UI handles, whereas the reverse order would leave two
 * active profiles and make `activeProfile` non-deterministic.
 */
export async function saveProfile(input: {
  workspaceId: string;
  userId: string;
  profile: VoiceProfileShape;
  source: VoiceProfileSource;
  name?: string;
  presetKey?: string | null;
}): Promise<StoredVoiceProfile | null> {
  if (!databaseConfigured()) return null;

  const sql = db();

  const previous = (await sql`
    select coalesce(max(version), 0)::int as version
    from voice_profiles
    where workspace_id = ${input.workspaceId}
  `) as { version: number }[];
  const nextVersion = (previous[0]?.version ?? 0) + 1;

  await sql`
    update voice_profiles set is_active = false, updated_at = now()
    where workspace_id = ${input.workspaceId} and is_active
  `;

  const rows = (await sql`
    insert into voice_profiles (workspace_id, user_id, name, source, preset_key, profile, version, is_active)
    values (
      ${input.workspaceId},
      ${input.userId},
      ${input.name ?? "My voice"},
      ${input.source},
      ${input.presetKey ?? null},
      ${JSON.stringify(input.profile)}::jsonb,
      ${nextVersion}::int,
      true
    )
    returning *
  `) as VoiceProfile[];

  return rows[0] ? hydrate(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Interviews
// ---------------------------------------------------------------------------

export type StoredInterview = {
  id: string;
  user_id: string;
  voice_profile_id: string | null;
  answers: InterviewAnswers;
  completed_at: string | null;
  created_at: string;
};

/**
 * The interview in progress, or the most recent finished one.
 *
 * Unfinished wins: a founder who half-answered the interview last week should
 * come back to their draft, not to a blank form beside a completed record.
 */
export async function latestInterview(userId: string): Promise<StoredInterview | null> {
  if (!databaseConfigured()) return null;

  const sql = db();
  const rows = (await sql`
    select * from voice_interviews
    where user_id = ${userId}
    order by (completed_at is null) desc, created_at desc
    limit 1
  `) as StoredInterview[];

  const row = rows[0];
  return row ? { ...row, answers: normalizeAnswers((row.answers ?? {}) as Record<string, unknown>) } : null;
}

/**
 * Saves answers, creating the interview row on first write.
 *
 * The whole answer set is replaced rather than merged: the form posts every
 * field it rendered, so a merge would make a cleared answer un-clearable.
 */
export async function saveInterview(input: {
  userId: string;
  interviewId?: string | null;
  answers: InterviewAnswers;
  completed: boolean;
  voiceProfileId?: string | null;
}): Promise<string | null> {
  if (!databaseConfigured()) return null;

  const sql = db();
  const answers = JSON.stringify(normalizeAnswers(input.answers));

  if (input.interviewId) {
    const rows = await sql`
      update voice_interviews
      set
        answers = ${answers}::jsonb,
        completed_at = case when ${input.completed}::boolean then coalesce(completed_at, now()) else null end,
        voice_profile_id = coalesce(${input.voiceProfileId ?? null}, voice_profile_id)
      where id = ${input.interviewId} and user_id = ${input.userId}
      returning id
    `;
    if (rows[0]) return rows[0].id as string;
    // Fall through when the id did not belong to this user — inserting a fresh
    // row is safer than trusting an id that arrived in a form post.
  }

  const rows = await sql`
    insert into voice_interviews (user_id, voice_profile_id, answers, completed_at)
    values (
      ${input.userId},
      ${input.voiceProfileId ?? null},
      ${answers}::jsonb,
      case when ${input.completed}::boolean then now() else null end
    )
    returning id
  `;

  return (rows[0]?.id as string) ?? null;
}

// ---------------------------------------------------------------------------
// Calibrations
// ---------------------------------------------------------------------------

export type CalibrationVerdict = "kept" | "edited" | "rejected";

/**
 * Records what the user did with a generated draft.
 *
 * The schema comment calls an edit "the strongest voice signal available", and
 * it is: it is the only signal that says what the model got *wrong*, which no
 * amount of exemplars provides. Best-effort, like every other audit write here —
 * failing to record a correction must never fail the save the user asked for.
 */
export async function recordCalibration(input: {
  voiceProfileId: string;
  generatedText: string;
  editedText?: string | null;
  verdict: CalibrationVerdict;
}): Promise<void> {
  if (!databaseConfigured()) return;

  try {
    const sql = db();
    await sql`
      insert into voice_calibrations (voice_profile_id, generated_text, edited_text, verdict)
      values (
        ${input.voiceProfileId},
        ${input.generatedText},
        ${input.editedText ?? null},
        ${input.verdict}
      )
    `;
  } catch {
    // Deliberately swallowed.
  }
}

export type CalibrationSummary = {
  total: number;
  kept: number;
  edited: number;
  rejected: number;
  /** 0–1. The share of drafts that went out untouched — the honest measure of whether the voice is right. */
  keptRatio: number;
};

export async function calibrationSummary(voiceProfileId: string): Promise<CalibrationSummary> {
  const empty: CalibrationSummary = { total: 0, kept: 0, edited: 0, rejected: 0, keptRatio: 0 };
  if (!databaseConfigured()) return empty;

  const sql = db();
  const rows = await sql`
    select
      count(*)::int as total,
      count(*) filter (where verdict = 'kept')::int as kept,
      count(*) filter (where verdict = 'edited')::int as edited,
      count(*) filter (where verdict = 'rejected')::int as rejected
    from voice_calibrations
    where voice_profile_id = ${voiceProfileId}
  `;

  const row = rows[0] as Omit<CalibrationSummary, "keptRatio"> | undefined;
  if (!row || row.total === 0) return empty;

  return { ...row, keptRatio: row.kept / row.total };
}

/**
 * The corrections themselves, for feeding a regeneration.
 *
 * Only edits carry information about the gap between what was generated and what
 * the user wanted, so rejections and untouched keeps are left out.
 */
export async function recentEdits(voiceProfileId: string, limit = 20): Promise<Array<{ generated: string; edited: string }>> {
  if (!databaseConfigured()) return [];

  const sql = db();
  const rows = await sql`
    select generated_text, edited_text
    from voice_calibrations
    where voice_profile_id = ${voiceProfileId}
      and verdict = 'edited'
      and edited_text is not null
    order by created_at desc
    limit ${limit}::int
  `;

  return rows.map((row) => ({ generated: row.generated_text as string, edited: row.edited_text as string }));
}
