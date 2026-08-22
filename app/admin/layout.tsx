import Link from "next/link";
import { redirect } from "next/navigation";
import { ClerkProvider } from "@clerk/nextjs";
import { AlertTriangle, ArrowLeft, ScrollText, ShieldAlert, Users2, UserPlus2 } from "@/components/icons";
import { getAppSession } from "@/lib/session";
import { BRAND } from "@/lib/constants";

// Every admin page is gated here rather than repeating the is_admin check per
// page — a new page under /admin is protected by existing, not by remembering.
const adminNav = [
  { href: "/admin", label: "Control room", icon: ShieldAlert },
  { href: "/admin/users", label: "Users", icon: Users2 },
  { href: "/admin/leads", label: "Leads", icon: UserPlus2 },
  { href: "/admin/logs", label: "Activity log", icon: ScrollText },
  { href: "/admin/errors", label: "Errors", icon: AlertTriangle },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession();

  if (!session?.profile.is_admin) {
    redirect("/app");
  }

  return (
    <ClerkProvider>
      <div className="min-h-screen bg-[#F4F2EE] text-[#191919] md:flex">
        <aside className="hidden w-72 shrink-0 border-r border-[#D6D6D6] bg-white md:flex md:flex-col">
          <div className="flex h-16 items-center gap-2 border-b border-[#D6D6D6] px-6">
            <ShieldAlert className="h-6 w-6 text-red-600" />
            <span className="font-black text-[#191919]">{BRAND.name} admin</span>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-4">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-[#555] hover:bg-[#FEF2F2] hover:text-red-700"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-[#D6D6D6] p-4">
            <Link href="/app" className="flex items-center gap-2 text-sm font-bold text-[#0A66C2]">
              <ArrowLeft className="h-4 w-4" />
              Back to my account
            </Link>
            <p className="mt-3 text-xs text-[#666]">Signed in as {session.email}</p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#D6D6D6] bg-white/95 px-4 backdrop-blur md:hidden">
            <Link href="/admin" className="flex items-center gap-2 font-black">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              Admin
            </Link>
            <Link href="/app" className="text-sm font-bold text-[#0A66C2]">
              My account
            </Link>
          </header>

          <nav className="flex gap-1 overflow-x-auto border-b border-[#D6D6D6] bg-white px-4 py-2 md:hidden">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold text-[#555] hover:bg-[#FEF2F2] hover:text-red-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </ClerkProvider>
  );
}
