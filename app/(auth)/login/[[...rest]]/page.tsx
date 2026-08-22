import type { Metadata } from "next";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { BRAND, ROUTES } from "@/lib/constants";

/** Noindex for the same reason as sign-up: nothing here is a search result. */
export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your FollowerSpike account.",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mb-8 text-center">
        <Link href={ROUTES.home} className="text-sm font-black uppercase tracking-wide text-[#0A66C2]">
          {BRAND.name}
        </Link>
        <h1 className="mt-3 text-3xl font-black text-[#191919]">Sign in</h1>
      </div>
      <SignIn signUpUrl="/signup" fallbackRedirectUrl={ROUTES.app} />
    </main>
  );
}
