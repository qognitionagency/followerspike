"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, Menu, TrendingUp } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SignupButton } from "@/components/marketing/SignupButton";
import { BRAND, ROUTES } from "@/lib/constants";
import { marketingNav } from "@/lib/marketing/nav";

const desktopGroups = marketingNav.filter((group) => group.title !== "Pricing");

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link href={ROUTES.home} className="flex items-center gap-2 text-base font-black text-slate-950">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#2f80ed] text-white shadow-[0_10px_24px_rgba(47,128,237,0.28)]">
            <TrendingUp className="h-4 w-4" />
          </span>
          {BRAND.name}
        </Link>

        <nav className="ml-10 hidden items-center gap-1 lg:flex">
          {desktopGroups.map((group) => (
            <div key={group.title} className="group relative">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-black text-slate-700 transition hover:bg-[#eef6ff] hover:text-[#2f80ed]"
              >
                {group.title}
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="pointer-events-none absolute left-0 top-11 w-[min(560px,calc(100vw-2rem))] opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
                  <div className="grid gap-1 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <Link key={item.href} href={item.href} className="rounded-lg p-3 transition hover:bg-[#f6faff]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-black text-slate-950">{item.label}</span>
                          {item.badge ? (
                            <span className="rounded-full bg-[#eaf3ff] px-2 py-0.5 text-xs font-black text-[#2f80ed]">{item.badge}</span>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Link href={ROUTES.pricing} className="inline-flex h-10 items-center rounded-full px-3 text-sm font-black text-[#2f80ed] hover:bg-[#eef6ff]">
            Pricing
          </Link>
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link href={ROUTES.login} className="inline-flex h-10 items-center rounded-full px-4 text-sm font-black text-slate-700 hover:text-[#2f80ed]">
            Login
          </Link>
          <SignupButton className="h-10 rounded-full bg-[#2f80ed] px-5 font-black text-white shadow-[0_12px_30px_rgba(47,128,237,0.28)] hover:bg-[#176fd6]">
            Start for free
          </SignupButton>
        </div>

        <div className="ml-auto lg:hidden">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-950 shadow-sm"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </DialogTrigger>
            <DialogContent
              className="inset-x-3 top-3 max-h-[calc(100vh-1.5rem)] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-lg border-slate-200 bg-white p-0 text-slate-950 shadow-2xl sm:left-[50%] sm:right-auto sm:top-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%]"
              overlayClassName="bg-slate-950/35"
            >
              <DialogTitle className="sr-only">FollowerSpike navigation</DialogTitle>
              <div className="border-b border-slate-200 p-5">
                <DialogClose asChild>
                  <Link href={ROUTES.home} className="flex items-center gap-2 font-black">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#2f80ed] text-white">
                      <TrendingUp className="h-4 w-4" />
                    </span>
                    {BRAND.name}
                  </Link>
                </DialogClose>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                  LinkedIn growth autopilot for posts, engagement, connections, and follow-ups.
                </p>
              </div>

              <div className="grid gap-5 p-4">
                <section>
                  <h2 className="px-2 text-xs font-black uppercase tracking-wide text-[#2f80ed]">Main</h2>
                  <div className="mt-2 grid gap-1">
                    {[
                      ["Overview", ROUTES.home],
                      ["Pricing", ROUTES.pricing],
                      ["All pages", "/site-map"],
                    ].map(([label, href]) => (
                      <DialogClose key={`${label}-${href}`} asChild>
                        <Link href={href} className="flex items-center justify-between rounded-lg px-3 py-3 text-base font-black text-slate-900 transition hover:bg-[#eef6ff]">
                          {label}
                          <ArrowRight className="h-4 w-4 text-[#2f80ed]" />
                        </Link>
                      </DialogClose>
                    ))}
                  </div>
                </section>

                {desktopGroups.map((group) => (
                  <section key={group.title}>
                    <h2 className="px-2 text-xs font-black uppercase tracking-wide text-[#2f80ed]">{group.title}</h2>
                    <div className="mt-2 grid gap-1">
                      {group.items.slice(0, 8).map((item) => (
                        <DialogClose key={item.href} asChild>
                          <Link href={item.href} className="flex items-start justify-between gap-3 rounded-lg px-3 py-3 text-sm font-bold text-slate-800 transition hover:bg-[#eef6ff]">
                            <span>
                              <span className="block text-base font-black text-slate-950">{item.label}</span>
                              <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>
                            </span>
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#2f80ed]" />
                          </Link>
                        </DialogClose>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="grid gap-3 border-t border-slate-200 p-4">
                <DialogClose asChild>
                  <SignupButton className="h-12 rounded-full bg-[#2f80ed] text-sm font-black text-white hover:bg-[#176fd6]">
                    Start for free
                  </SignupButton>
                </DialogClose>
                <DialogClose asChild>
                  <Link
                    href={ROUTES.login}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-900"
                  >
                    Login
                  </Link>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
