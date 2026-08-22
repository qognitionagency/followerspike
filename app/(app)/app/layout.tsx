import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { BarChart3, Link2, ListChecks, MessageSquareText, PenSquare, Recycle, Settings, ShieldAlert, Target, TrendingUp, Zap } from "@/components/icons";
import { requireAppSession } from "@/lib/session";
import { BRAND } from "@/lib/constants";

/**
 * The sidebar shows everything; the mobile bar shows only what is marked
 * primary. A bottom bar wide enough for every page makes each target too narrow
 * to hit, so the long tail lives in the sidebar and on the dashboard instead.
 */
const navItems = [
  { href: "/app", label: "Dashboard", icon: BarChart3, primary: true },
  { href: "/app/composer", label: "Composer", icon: PenSquare, primary: true },
  { href: "/app/queue", label: "Queue", icon: ListChecks, primary: true },
  { href: "/app/growth", label: "Growth", icon: Target, primary: false },
  { href: "/app/evergreen", label: "Evergreen", icon: Recycle, primary: false },
  { href: "/app/automations", label: "Automations", icon: Zap, primary: false },
  { href: "/app/accounts", label: "Accounts", icon: Link2, primary: false },
  { href: "/app/voice", label: "Voice", icon: MessageSquareText, primary: true },
  { href: "/app/settings", label: "Settings", icon: Settings, primary: true },
] as const;

const mobileNavItems = navItems.filter((item) => item.primary);

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAppSession();

  return (
    <ClerkProvider>
    <div className="min-h-screen bg-[#F4F2EE] text-[#191919] md:flex">
      <aside className="hidden w-72 shrink-0 border-r border-[#D6D6D6] bg-white md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-[#D6D6D6] px-6">
          <TrendingUp className="h-6 w-6 text-[#0A66C2]" />
          <span className="font-black text-[#0A66C2]">{BRAND.name}</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-[#555] hover:bg-[#EEF3F8] hover:text-[#0A66C2]"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[#D6D6D6] p-4 text-sm">
          {session.profile.is_admin ? (
            <Link
              href="/admin"
              className="mb-3 flex items-center gap-2 rounded-lg bg-[#FEF2F2] px-3 py-2 text-sm font-bold text-red-700 hover:bg-[#FEE2E2]"
            >
              <ShieldAlert className="h-4 w-4" />
              Admin portal
            </Link>
          ) : null}
          <p className="font-bold text-[#191919]">{session.profile.full_name || session.email}</p>
          <p className="mt-1 capitalize text-[#666]">{session.subscriptionTier} plan</p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#D6D6D6] bg-white/95 px-4 backdrop-blur md:hidden">
          <Link href="/app" className="flex items-center gap-2 font-black text-[#0A66C2]">
            <TrendingUp className="h-5 w-5" />
            {BRAND.name}
          </Link>
          <span className="rounded-full bg-[#EEF3F8] px-3 py-1 text-xs font-black uppercase text-[#0A66C2]">
            {session.subscriptionTier}
          </span>
        </header>

        <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 border-t border-[#D6D6D6] bg-white md:hidden">
          {mobileNavItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 px-2 py-2 text-[11px] font-bold text-[#666]">
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
    </ClerkProvider>
  );
}
