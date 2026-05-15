import Link from "next/link";
import { BarChart3, ListChecks, MessageSquareText, Settings, Target, TrendingUp } from "lucide-react";
import { requireAppSession } from "@/lib/session";
import { BRAND } from "@/lib/constants";

const navItems = [
  { href: "/app", label: "Dashboard", icon: BarChart3 },
  { href: "/app/voice", label: "Voice", icon: MessageSquareText },
  { href: "/app/targets", label: "Targets", icon: Target },
  { href: "/app/queue", label: "Queue", icon: ListChecks },
  { href: "/app/settings", label: "Settings", icon: Settings },
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAppSession();

  return (
    <div className="min-h-screen bg-[#F4F2EE] text-[#191919] md:flex">
      <aside className="hidden w-72 shrink-0 border-r border-[#D6D6D6] bg-white md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-[#D6D6D6] px-6">
          <TrendingUp className="h-6 w-6 text-[#0A66C2]" />
          <span className="font-black tracking-tight text-[#0A66C2]">{BRAND.name}</span>
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
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 px-2 py-2 text-[11px] font-bold text-[#666]">
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
