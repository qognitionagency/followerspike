import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AudiencePage } from "@/lib/marketing/content";

export function AudienceHub({ eyebrow, title, description, pages, basePath }: {
  eyebrow: string;
  title: string;
  description: string;
  pages: AudiencePage[];
  basePath: string;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-black uppercase text-[#0a66c2]">{eyebrow}</p>
        <h1 className="mt-3 text-5xl font-black text-[#111827] sm:text-6xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#4b5563]">{description}</p>
      </section>
      <section className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <Link key={page.slug} href={`${basePath}/${page.slug}`} className="group rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <p className="text-sm font-black uppercase text-[#0a66c2]">{page.eyebrow}</p>
            <h2 className="mt-3 text-2xl font-black text-[#111827]">{page.name}</h2>
            <p className="mt-3 text-sm leading-6 text-[#4b5563]">{page.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#0a66c2]">
              Open playbook
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
