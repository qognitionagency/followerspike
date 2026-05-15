"use client";

import Link from "next/link";
import { BarChart3, Home, LockKeyhole, Menu, ShieldCheck, Tags, TrendingUp, UserRoundCheck } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { SignupButton } from "@/components/marketing/SignupButton";
import { BRAND, ROUTES } from "@/lib/constants";

const desktopLinks = [
  { label: "Product", href: "/#product" },
  { label: "Pricing", href: ROUTES.pricing },
  { label: "Free Audit", href: ROUTES.audit },
  { label: "Trust", href: ROUTES.trust },
];

const mobileLinks = [
  { label: "Home", href: ROUTES.home, icon: Home },
  { label: "Product", href: "/#product", icon: BarChart3 },
  { label: "Pricing", href: ROUTES.pricing, icon: Tags },
  { label: "Free Audit", href: ROUTES.audit, icon: UserRoundCheck },
  { label: "Trust", href: ROUTES.trust, icon: ShieldCheck },
  { label: "Security", href: ROUTES.security, icon: LockKeyhole },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f7f4ee]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link href={ROUTES.home} className="flex items-center gap-2 font-black tracking-tight text-[#121212]">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#111827] text-white">
            <TrendingUp className="h-4 w-4" />
          </span>
          {BRAND.name}
        </Link>

        <nav className="ml-10 hidden items-center gap-6 text-sm font-bold text-[#525252] md:flex">
          {desktopLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[#111827]">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link href={ROUTES.login} className="text-sm font-bold text-[#525252] hover:text-[#111827]">
            Login
          </Link>
          <SignupButton className="h-10 rounded-full bg-[#111827] px-5 font-black text-white hover:bg-[#0a66c2]">
            Start Trial
          </SignupButton>
        </div>

        <div className="ml-auto md:hidden">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white text-[#111827] shadow-sm"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </DialogTrigger>
            <DialogContent
              className="top-4 left-4 right-4 max-w-none translate-x-0 translate-y-0 rounded-2xl border-black/10 bg-[#f7f4ee] p-0 text-[#111827] shadow-2xl sm:left-[50%] sm:right-auto sm:top-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%]"
              overlayClassName="bg-[#111827]/45"
            >
              <div className="border-b border-black/10 p-5">
                <Link href={ROUTES.home} className="flex items-center gap-2 font-black">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#111827] text-white">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  {BRAND.name}
                </Link>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#4b5563]">
                  LinkedIn growth autopilot for people whose reputation matters.
                </p>
              </div>

              <nav className="grid gap-2 p-4">
                {mobileLinks.map((link) => (
                  <DialogClose key={link.href} asChild>
                    <Link
                      href={link.href}
                      className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-black text-[#111827] transition hover:bg-white"
                    >
                      <link.icon className="h-5 w-5 text-[#0a66c2]" />
                      {link.label}
                    </Link>
                  </DialogClose>
                ))}
              </nav>

              <div className="grid gap-3 border-t border-black/10 p-4">
                <DialogClose asChild>
                  <Link
                    href={ROUTES.login}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-black text-[#111827]"
                  >
                    Login
                  </Link>
                </DialogClose>
                <SignupButton className="h-11 rounded-full bg-[#111827] text-sm font-black text-white hover:bg-[#0a66c2]">
                  Start Trial
                </SignupButton>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
