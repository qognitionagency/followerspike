import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AlertTriangle, CheckCircle2, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAppSession } from "@/lib/session";
import { requireWorkspace } from "@/lib/workspace";
import { canConnectAccount, connectedAccountLimit } from "@/lib/entitlements";
import { activeConnections, disconnectAccount, listConnections, saveConnection } from "@/lib/platforms/connect";
import { verifyAppPassword } from "@/lib/platforms/bluesky-write";
import { ALL_PLATFORMS, platformCapabilities } from "@/lib/platforms/registry";
import { platformLabel } from "@/lib/platforms/types";
import { optionalEnv } from "@/lib/env";
import type { Platform } from "@/lib/types/db";

export const metadata = { title: "Accounts" };

const connectBlueskySchema = z.object({
  handle: z.string().min(3).max(253),
  appPassword: z.string().min(8).max(200),
});

const disconnectSchema = z.object({ accountId: z.string().uuid() });

/**
 * Bluesky is the one platform that connects with no OAuth app behind it: the
 * member generates an app password and hands it over. X and LinkedIn need a
 * registered application, so they stay unavailable until those exist rather
 * than offering a button that throws.
 */
function oauthConfigured(platform: Platform): boolean {
  if (platform === "bluesky") return true;
  if (platform === "x") return Boolean(optionalEnv("X_CLIENT_ID") && optionalEnv("X_CLIENT_SECRET"));
  return Boolean(optionalEnv("LINKEDIN_CLIENT_ID") && optionalEnv("LINKEDIN_CLIENT_SECRET"));
}

async function connectBluesky(formData: FormData) {
  "use server";
  // A server action is its own entry point and re-authorizes even though the
  // layout already gated the page.
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const parsed = connectBlueskySchema.safeParse({
    handle: formData.get("handle"),
    appPassword: formData.get("appPassword"),
  });
  if (!parsed.success) return;

  const seat = await canConnectAccount(context.workspace.id, session.subscriptionTier);
  if (!seat.allowed) return;

  try {
    // Proves the credential works before it is stored, so a typo surfaces here
    // rather than as a failed publish hours later.
    const profile = await verifyAppPassword(parsed.data.handle, parsed.data.appPassword);
    await saveConnection({
      workspaceId: context.workspace.id,
      userId: session.userId,
      profile,
      accessToken: parsed.data.appPassword,
    });
  } catch {
    // Deliberately no detail: an error here could otherwise echo the submitted
    // credential back into the page.
    return;
  }

  revalidatePath("/app/accounts");
}

async function disconnect(formData: FormData) {
  "use server";
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const parsed = disconnectSchema.safeParse({ accountId: formData.get("accountId") });
  if (!parsed.success) return;

  await disconnectAccount({ workspaceId: context.workspace.id, accountId: parsed.data.accountId });
  revalidatePath("/app/accounts");
}

export default async function AccountsPage() {
  const session = await requireAppSession();
  const context = await requireWorkspace(session);

  const [accounts, active] = await Promise.all([
    listConnections(context.workspace.id),
    activeConnections(context.workspace.id),
  ]);
  const limit = connectedAccountLimit(session.subscriptionTier);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase text-[#0A66C2]">Accounts</p>
        <h1 className="mt-2 text-3xl font-black text-[#191919]">Connect the platforms you post to.</h1>
        <p className="mt-2 text-sm leading-6 text-[#666]">
          Nothing publishes anywhere until an account is connected here. Credentials are encrypted
          before they are stored and are never shown again.
        </p>
        <p className="mt-4 inline-flex rounded-full bg-[#EEF3F8] px-3 py-1 text-xs font-black text-[#0A66C2]">
          {active.length} of {limit} seats used on the {session.subscriptionTier} plan
        </p>
      </section>

      {accounts.length > 0 ? (
        <section className="rounded-xl border border-[#D6D6D6] bg-white shadow-sm">
          <h2 className="border-b border-[#D6D6D6] px-6 py-4 text-lg font-black">Connected</h2>
          <ul className="divide-y divide-[#EEE]">
            {accounts.map((account) => (
              <li key={account.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <p className="font-black text-[#191919]">
                    {account.display_name || account.handle}
                    <span className="ml-2 rounded-full bg-[#EEF3F8] px-2 py-0.5 text-xs font-black text-[#0A66C2]">
                      {platformLabel(account.platform)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-[#666]">@{account.handle}</p>
                </div>
                <div className="flex items-center gap-3">
                  {account.is_active && account.has_credentials ? (
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Active
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-[#666]">Disconnected</span>
                  )}
                  {account.is_active ? (
                    <form action={disconnect}>
                      <input type="hidden" name="accountId" value={account.id} />
                      <Button className="h-9 rounded-full bg-[#F4F2EE] px-4 text-sm font-bold text-[#191919] hover:bg-[#E6E2DA]">
                        <Unlink className="h-4 w-4" />
                        Disconnect
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {ALL_PLATFORMS.map((platform) => {
          const configured = oauthConfigured(platform);
          const capabilities = platformCapabilities(platform);

          return (
            <article key={platform} className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-[#191919]">{platformLabel(platform)}</h2>
              <p className="mt-2 text-sm text-[#666]">
                Up to {capabilities.maxChars.toLocaleString()} characters
                {capabilities.supportsThreads ? ", threads supported" : ", single posts only"}.
              </p>

              {platform === "bluesky" ? (
                <form action={connectBluesky} className="mt-5 space-y-3">
                  <Input name="handle" placeholder="yourname.bsky.social" required className="h-11 bg-white" />
                  <Input
                    name="appPassword"
                    type="password"
                    placeholder="App password"
                    required
                    className="h-11 bg-white"
                  />
                  <p className="text-xs leading-5 text-[#666]">
                    This is an <strong>app password</strong> from Bluesky Settings → Privacy and
                    security → App passwords — never your account password. It can be revoked from
                    there at any time without changing your login.
                  </p>
                  <Button className="h-11 w-full rounded-full bg-[#0A66C2] font-bold text-white hover:bg-[#004182]">
                    <Link2 className="h-4 w-4" />
                    Connect Bluesky
                  </Button>
                </form>
              ) : configured ? (
                <a
                  href={`/api/connect/${platform}/start`}
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0A66C2] font-bold text-white hover:bg-[#004182]"
                >
                  <Link2 className="h-4 w-4" />
                  Connect {platformLabel(platform)}
                </a>
              ) : (
                <div className="mt-5 flex items-start gap-2 rounded-lg bg-[#FEF9EC] p-4 text-sm leading-6 text-[#7A5B00]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Not available yet — {platformLabel(platform)} needs a registered application
                    before an account can be authorized.
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
