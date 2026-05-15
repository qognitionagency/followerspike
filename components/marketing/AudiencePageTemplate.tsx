import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import type { AudiencePage } from "@/lib/marketing/content";

export function AudiencePageTemplate({ page }: { page: AudiencePage }) {
  const siteUrl = process.env.APP_URL || "http://localhost:3000";
  const basePath = page.type === "role" ? "roles" : page.type === "industry" ? "industries" : "icp";
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: basePath, item: `${siteUrl}/${basePath}` },
        { "@type": "ListItem", position: 3, name: page.name, item: `${siteUrl}/${basePath}/${page.slug}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase text-[#0a66c2]">{page.eyebrow}</p>
          <h1 className="mt-3 text-5xl font-black text-[#111827] sm:text-6xl">{page.title}</h1>
          <p className="mt-5 text-lg leading-8 text-[#4b5563]">{page.description}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href={ROUTES.signup} className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#111827] px-7 text-base font-black text-white hover:bg-[#0a66c2]">
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/free-tools/linkedin-icp-builder" className="inline-flex h-12 items-center justify-center rounded-md border border-[#d8d2c4] bg-white px-7 text-base font-black text-[#111827] hover:text-[#0a66c2]">
              Build ICP
            </Link>
          </div>
        </div>
        <div className="rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase text-[#0a66c2]">Core pain</p>
          <p className="mt-3 text-xl font-black leading-8 text-[#111827]">{page.pain}</p>
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-[#111827]">Growth workflow</h2>
          <div className="mt-5 grid gap-3">
            {page.workflow.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-lg bg-[#f4f2ee] p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white text-sm font-black text-[#0a66c2]">{index + 1}</span>
                <p className="text-sm font-semibold leading-6 text-[#374151]">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-[#d8d2c4] bg-[#111827] p-6 text-white shadow-sm">
          <h2 className="text-2xl font-black">What FollowerSpike handles</h2>
          <div className="mt-5 grid gap-3">
            {page.features.map((item) => (
              <div key={item} className="flex gap-3 text-sm font-semibold leading-6 text-slate-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-14 rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase text-[#0a66c2]">FAQ</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {page.faq.map((faq) => (
            <div key={faq.question} className="rounded-lg bg-[#fbfaf7] p-5">
              <h2 className="font-black text-[#111827]">{faq.question}</h2>
              <p className="mt-2 text-sm leading-6 text-[#4b5563]">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
