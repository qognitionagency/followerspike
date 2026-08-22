import type { Metadata } from "next";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { BRAND, ROUTES } from "@/lib/constants";

/**
 * Deliberately noindex. A sign-up form has nothing to rank for, and Clerk's
 * catch-all route means the crawler would otherwise find several thin URLs
 * under this path that all render the same widget.
 */
export const metadata: Metadata = {
  title: "Create your account",
  description: "Start posting to X, LinkedIn, and Bluesky in your own voice.",
  robots: { index: false, follow: true },
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mb-8 text-center">
        <Link href={ROUTES.home} className="text-sm font-black uppercase tracking-wide text-[#0A66C2]">
          {BRAND.name}
        </Link>
        <h1 className="mt-3 text-3xl font-black text-[#191919]">Create your account</h1>
        <p className="mt-2 text-sm leading-6 text-[#666]">
          {BRAND.trialDays} days free. No card until you subscribe, and cancelling takes one click.
        </p>
      </div>
      <SignUp signInUrl="/login" fallbackRedirectUrl={ROUTES.app} />
    </main>
  );
}
