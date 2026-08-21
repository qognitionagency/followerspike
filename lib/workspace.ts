import { auth } from "@clerk/nextjs/server";
import { db, databaseConfigured } from "@/lib/db";
import type { Workspace } from "@/lib/types/db";
import type { AppSession } from "@/lib/types";

/**
 * Resolving the workspace a request acts on.
 *
 * Clerk Organizations owns membership, roles and invitations — this module does
 * not reimplement any of that. It maps the Clerk org on the session to the local
 * `workspaces` row whose uuid every other table foreign-keys to, mirroring how
 * `lib/session.ts` maps a Clerk user to `users.id`.
 *
 * There is no RLS on this database (Neon exposes no PostgREST endpoint, so the
 * app server is the only client). That makes the `where workspace_id = ...`
 * predicate load-bearing on every single query, exactly as `where user_id = ...`
 * is today. Scope through `requireWorkspace`, never by trusting a workspace id
 * that arrived in a request body.
 */

export type WorkspaceRole = "org:admin" | "org:member";

export type WorkspaceContext = {
  workspace: Workspace;
  /** Null for a personal workspace not yet backed by a Clerk organization. */
  clerkOrgId: string | null;
  /** Owner of a personal workspace is treated as its admin. */
  role: WorkspaceRole;
};

/**
 * The active workspace, or null when there is none to resolve.
 *
 * Order matters. A Clerk organization on the session always wins; the personal
 * workspace is the fallback for a solo founder who has never touched an
 * organization switcher, which is most of them.
 */
export async function getWorkspace(session: AppSession): Promise<WorkspaceContext | null> {
  if (!databaseConfigured()) return null;

  const { orgId, orgRole } = await auth();
  const sql = db();

  if (orgId) {
    const rows = (await sql`
      select * from workspaces where clerk_org_id = ${orgId} limit 1
    `) as Workspace[];

    // The org exists in Clerk but its webhook has not landed yet. Create the
    // mirror row now rather than failing the request; the webhook's upsert is
    // idempotent and will simply find it.
    const workspace =
      rows[0] ??
      ((
        await sql`
          insert into workspaces (clerk_org_id, name, owner_user_id)
          values (${orgId}, ${session.profile.full_name || session.email}, ${session.userId})
          on conflict (clerk_org_id) do update set updated_at = now()
          returning *
        `
      )[0] as Workspace);

    return {
      workspace,
      clerkOrgId: orgId,
      role: orgRole === "org:admin" ? "org:admin" : "org:member",
    };
  }

  const personal = (await sql`
    select * from workspaces
    where owner_user_id = ${session.userId} and clerk_org_id is null
    order by created_at asc
    limit 1
  `) as Workspace[];

  if (personal[0]) {
    return { workspace: personal[0], clerkOrgId: null, role: "org:admin" };
  }

  // A user created after the backfill migration and before any org exists.
  const created = (await sql`
    insert into workspaces (name, owner_user_id)
    values (${session.profile.full_name || session.email || "My workspace"}, ${session.userId})
    returning *
  `) as Workspace[];

  return created[0] ? { workspace: created[0], clerkOrgId: null, role: "org:admin" } : null;
}

/**
 * Throws rather than returning null. Callers that cannot proceed without a
 * workspace — every job handler and every mutation — use this.
 */
export async function requireWorkspace(session: AppSession): Promise<WorkspaceContext> {
  const context = await getWorkspace(session);
  if (!context) {
    throw new Error("No workspace is available for this session");
  }
  return context;
}

/** Guard for actions only an org admin may take, such as connecting an account or changing billing. */
export function isWorkspaceAdmin(context: WorkspaceContext): boolean {
  return context.role === "org:admin";
}

/**
 * Resolves a workspace by id for server-side work that has no session — job
 * handlers running under a QStash signature rather than a user.
 */
export async function getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
  if (!databaseConfigured()) return null;
  const sql = db();
  const rows = (await sql`select * from workspaces where id = ${workspaceId} limit 1`) as Workspace[];
  return rows[0] ?? null;
}
