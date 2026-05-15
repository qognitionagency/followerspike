import Link from "next/link";
import { BRAND, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  sections: Array<{ title: string; body: string }>;
};

export function LegalPage({ eyebrow, title, description, sections }: LegalPageProps) {
  const updatedAt = new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date("2026-05-15T00:00:00.000Z"));

  return (
    <div className="min-h-screen bg-[#F4F2EE] text-[#191919]">
      <header className="border-b border-[#D6D6D6] bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6 lg:px-8">
          <Link href={ROUTES.home} className="font-black text-[#0A66C2]">
            {BRAND.name}
          </Link>
          <Link href={ROUTES.signup} className="ml-auto text-sm font-bold text-[#0A66C2]">
            Start Trial
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-black uppercase tracking-wide text-[#0A66C2]">{eyebrow}</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight">{title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#555]">{description}</p>
        <p className="mt-4 text-sm font-semibold text-[#666]">Last updated: {updatedAt}</p>
        <div className="mt-10 space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-[#191919]">{section.title}</h2>
              <p className="mt-3 leading-7 text-[#555]">{section.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm leading-6 text-[#666]">{TRUST_DISCLAIMER}</p>
      </main>
    </div>
  );
}
