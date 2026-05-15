"use client";

import Link from "next/link";
import { ChevronDown, Menu, TrendingUp } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SignupButton } from "@/components/marketing/SignupButton";
import { BRAND, ROUTES } from "@/lib/constants";
import { marketingNav } from "@/lib/marketing/nav";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#ded7c8] bg-[#fbfaf7]/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link href={ROUTES.home} className="flex items-center gap-2 font-black text-[#111827]">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-[#111827] text-white">
            <TrendingUp className="h-4 w-4" />
          </span>
          {BRAND.name}
        </Link>

        <nav className="ml-10 hidden items-center gap-1 lg:flex">
          {marketingNav.map((group) => (
            <div key={group.title} className="group relative">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-1 rounded-md px-3 text-sm font-black text-[#374151] transition hover:bg-white hover:text-[#111827]"
              >
                {group.title}
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="pointer-events-none absolute left-0 top-11 w-[440px] opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                <div className="rounded-lg border border-[#d8d2c4] bg-white p-3 shadow-[0_24px_70px_rgba(17,24,39,0.16)]">
                  <div className="grid gap-1">
                    {group.items.map((item) => (
                      <Link key={item.href} href={item.href} className="rounded-md p-3 transition hover:bg-[#f4f2ee]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-black text-[#111827]">{item.label}</span>
                          {item.badge ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700">{item.badge}</span>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#6b7280]">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link href={ROUTES.login} className="text-sm font-black text-[#4b5563] hover:text-[#111827]">
            Sign in
          </Link>
          <SignupButton className="h-10 rounded-md bg-[#111827] px-5 font-black text-white hover:bg-[#0a66c2]">
            Start for free
          </SignupButton>
        </div>

        <div className="ml-auto lg:hidden">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-md border border-[#d8d2c4] bg-white text-[#111827] shadow-sm"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </DialogTrigger>
            <DialogContent
              className="inset-3 left-3 right-3 top-3 max-h-[calc(100vh-1.5rem)] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-lg border-[#d8d2c4] bg-[#fbfaf7] p-0 text-[#111827] shadow-2xl sm:left-[50%] sm:right-auto sm:top-[50%] sm:max-w-xl sm:translate-x-[-50%] sm:translate-y-[-50%]"
              overlayClassName="bg-[#111827]/45"
            >
              <DialogTitle className="sr-only">FollowerSpike navigation</DialogTitle>
              <div className="border-b border-[#d8d2c4] p-5">
                <Link href={ROUTES.home} className="flex items-center gap-2 font-black">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-[#111827] text-white">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  {BRAND.name}
                </Link>
                <p className="mt-3 max-w-md text-sm leading-6 text-[#4b5563]">
                  Premium LinkedIn growth autopilot for posts, comments, connections, and accepted-connection follow-ups.
                </p>
              </div>

              <div className="grid gap-5 p-4">
                {marketingNav.map((group) => (
                  <section key={group.title}>
                    <h2 className="px-2 text-xs font-black uppercase text-[#0a66c2]">{group.title}</h2>
                    <div className="mt-2 grid gap-1">
                      {group.items.map((item) => (
                        <DialogClose key={item.href} asChild>
                          <Link href={item.href} className="rounded-md bg-white p-3 shadow-sm transition hover:bg-[#eef3f8]">
                            <span className="font-black text-[#111827]">{item.label}</span>
                            <span className="mt-1 block text-sm leading-5 text-[#6b7280]">{item.description}</span>
                          </Link>
                        </DialogClose>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="grid gap-3 border-t border-[#d8d2c4] p-4">
                <DialogClose asChild>
                  <Link
                    href={ROUTES.login}
                    className="inline-flex h-11 items-center justify-center rounded-md border border-[#d8d2c4] bg-white text-sm font-black text-[#111827]"
                  >
                    Sign in
                  </Link>
                </DialogClose>
                <SignupButton className="h-11 rounded-md bg-[#111827] text-sm font-black text-white hover:bg-[#0a66c2]">
                  Start for free
                </SignupButton>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
