import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CheckCircle2, ChevronRight, FileSearch, ShieldCheck, Sparkles } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MotionReveal } from "@/components/marketing/MotionReveal";
import { SandboxDemo } from "@/components/marketing/SandboxDemo";
import { SignupButton } from "@/components/marketing/SignupButton";
import { BRAND, PRICING, ROUTES, TRUST_DISCLAIMER } from "@/lib/constants";
import { blogPosts, featurePages, freeTools, buildIndustryPages, buildRolePages, icpPages } from "@/lib/marketing/content";

const siteUrl = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    absolute: "FollowerSpike | Premium LinkedIn Growth Autopilot",
  },
  description:
    "FollowerSpike is a premium LinkedIn growth autopilot for founders, SMB owners, coaches, consultants, creators, and personal brands: posts, engagement, connection requests, follow-ups, and safety controls.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "FollowerSpike | Premium LinkedIn Growth Autopilot",
    description:
      "A product-led LinkedIn growth assistant for daily posts, comments, connections, follow-ups, review controls, and Pro autopilot.",
    url: siteUrl,
    siteName: BRAND.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FollowerSpike | Premium LinkedIn Growth Autopilot",
    description: "Grow your LinkedIn account with one reviewable daily queue.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const heroStats = [
  ["Posts", "Voice-aware drafts"],
  ["Engage", "Relevant comments"],
  ["Connect", "ICP profiles"],
  ["Follow up", "Accepted DMs"],
] as const;

const workflow = [
  ["Teach the system", "Add profile context, niche, ICP, target roles, industries, and seed leaders."],
  ["Review the queue", "Inspect posts, comments, connection requests, and follow-up DMs before anything runs."],
  ["Run carefully", "Pro autopilot runs only after consent, inside timing windows, limits, logs, and pause controls."],
] as const;

const proofExamples = [
  ["Example queue", "A founder can review one post, three comments, six connection targets, and two accepted-connection follow-ups in one workspace."],
  ["Founder workflow", "Spend fifteen minutes on Monday shaping the ICP, then approve daily growth actions instead of starting from a blank page."],
  ["Positioning example", "Move from generic expertise to a concrete audience, trigger problem, and repeatable content angle."],
] as const;

function JsonLd() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: BRAND.name,
      url: siteUrl,
      description: BRAND.promise,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: BRAND.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description:
        "LinkedIn growth autopilot for posts, engagement queues, connection requests, accepted-connection follow-ups, review controls, and safety controls.",
      offers: PRICING.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: plan.monthlyUsd.replace("$", ""),
        priceCurrency: "USD",
        url: `${siteUrl}${ROUTES.pricing}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "FollowerSpike free LinkedIn tools",
      itemListElement: freeTools.slice(0, 6).map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.name,
        url: `${siteUrl}/free-tools/${tool.slug}`,
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}

export default function MarketingPage() {
  const featuredRoles = buildRolePages().slice(0, 6);
  const featuredIndustries = buildIndustryPages().slice(0, 6);

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#141414]">
      <JsonLd />
      <MarketingHeader />

      <main>
        <section className="border-b border-[#d8d2c4] bg-[#fbfaf7]">
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
            <MotionReveal className="mx-auto max-w-5xl text-center">
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#d8d2c4] bg-white px-3 py-1 text-sm font-black text-[#0a66c2] shadow-sm">
                <BadgeCheck className="h-4 w-4" />
                Premium LinkedIn growth autopilot
              </div>
              <h1 className="mx-auto max-w-5xl text-5xl font-black leading-[0.96] text-[#111827] sm:text-6xl lg:text-7xl">
                Grow your LinkedIn account with one daily autopilot queue.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#3f3f46]">
                FollowerSpike creates posts, finds relevant conversations, queues right-fit connection requests, and
                prepares follow-ups so founders and experts stay visible without living inside LinkedIn.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <SignupButton className="h-12 rounded-md bg-[#111827] px-7 text-base font-black text-white hover:bg-[#0a66c2]">
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </SignupButton>
                <Link
                  href="/free-tools/linkedin-profile-audit"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[#d8d2c4] bg-white px-7 text-base font-black text-[#111827] shadow-sm transition hover:border-[#0a66c2]/30 hover:text-[#0a66c2]"
                >
                  Run a free tool
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
                {heroStats.map(([value, label]) => (
                  <div key={value} className="rounded-lg border border-[#d8d2c4] bg-white p-3 shadow-sm">
                    <p className="text-lg font-black text-[#111827]">{value}</p>
                    <p className="mt-1 text-xs font-bold uppercase text-[#5b5b5b]">{label}</p>
                  </div>
                ))}
              </div>
            </MotionReveal>
            <MotionReveal delay={0.08} className="mt-12">
              <SandboxDemo />
            </MotionReveal>
          </div>
        </section>

        <section id="product" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <MotionReveal className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase text-[#0a66c2]">Product</p>
            <h2 className="mt-3 text-4xl font-black text-[#111827] sm:text-5xl">
              Built like an assistant. Controlled like software.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#4b5563]">
              A polished product workflow for the work behind LinkedIn growth: writing, engaging, connecting, following
              up, reviewing, and pausing.
            </p>
          </MotionReveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featurePages.map((item, index) => (
              <MotionReveal key={item.slug} delay={index * 0.04} className="rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm">
                <item.icon className="h-6 w-6 text-[#0a66c2]" />
                <h3 className="mt-5 text-xl font-black text-[#111827]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#4b5563]">{item.description}</p>
                <Link href={`/features/${item.slug}`} className="mt-5 inline-flex text-sm font-black text-[#0a66c2]">
                  Learn more
                </Link>
              </MotionReveal>
            ))}
          </div>
        </section>

        <section className="border-y border-[#d8d2c4] bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <MotionReveal className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="text-sm font-black uppercase text-[#0a66c2]">How it works</p>
                <h2 className="mt-3 text-4xl font-black text-[#111827] sm:text-5xl">
                  Review first. Autopilot only when the queue earns trust.
                </h2>
                <p className="mt-5 text-lg leading-8 text-[#4b5563]">
                  FollowerSpike should feel ambitious, not reckless. That is why the product keeps review, limits, logs,
                  and consent close to the core workflow.
                </p>
                <Link href={ROUTES.trust} className="mt-7 inline-flex h-12 items-center justify-center rounded-md bg-[#111827] px-7 text-base font-black text-white hover:bg-[#0a66c2]">
                  Read the trust model
                </Link>
              </div>
              <div className="grid gap-3">
                {workflow.map(([title, body], index) => (
                  <div key={title} className="grid grid-cols-[auto_1fr] gap-4 rounded-lg border border-[#d8d2c4] bg-[#f4f2ee] p-5">
                    <span className="grid h-10 w-10 place-items-center rounded-md bg-white text-sm font-black text-[#0a66c2]">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-black text-[#111827]">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#4b5563]">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </MotionReveal>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <MotionReveal>
              <p className="text-sm font-black uppercase text-[#0a66c2]">Free tools</p>
              <h2 className="mt-3 text-4xl font-black text-[#111827] sm:text-5xl">
                Useful tools before signup.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#4b5563]">
                Each tool returns an instant result. Email capture is optional for the full report or save-to-app flow.
              </p>
              <Link href="/free-tools" className="mt-7 inline-flex h-12 items-center justify-center rounded-md bg-[#111827] px-7 text-base font-black text-white hover:bg-[#0a66c2]">
                Browse all tools
              </Link>
            </MotionReveal>
            <div className="grid gap-3 sm:grid-cols-2">
              {freeTools.slice(0, 6).map((tool, index) => (
                <MotionReveal key={tool.slug} delay={index * 0.04} className="rounded-lg border border-[#d8d2c4] bg-white p-5 shadow-sm">
                  <tool.icon className="h-5 w-5 text-[#0a66c2]" />
                  <h3 className="mt-4 font-black text-[#111827]">{tool.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4b5563]">{tool.description}</p>
                  <Link href={`/free-tools/${tool.slug}`} className="mt-4 inline-flex text-sm font-black text-[#0a66c2]">
                    Run tool
                  </Link>
                </MotionReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#d8d2c4] bg-[#111827] py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <MotionReveal className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase text-cyan-200">Solutions</p>
              <h2 className="mt-3 text-4xl font-black sm:text-5xl">
                Pages for roles, industries, and ICPs.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                The site now acts like a SaaS acquisition system, not a single landing page. Every hub points to focused,
                indexable playbooks.
              </p>
            </MotionReveal>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {[
                ["Roles", "/roles", featuredRoles.map((item) => item.name)],
                ["Industries", "/industries", featuredIndustries.map((item) => item.name)],
                ["ICP", "/icp", icpPages.slice(0, 6).map((item) => item.name)],
              ].map(([title, href, items]) => (
                <div key={String(title)} className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
                  <h3 className="text-2xl font-black">{title}</h3>
                  <div className="mt-5 grid gap-2">
                    {(items as string[]).map((item) => (
                      <span key={item} className="rounded-md bg-white/[0.08] px-3 py-2 text-sm font-semibold text-slate-200">
                        {item}
                      </span>
                    ))}
                  </div>
                  <Link href={String(href)} className="mt-5 inline-flex text-sm font-black text-cyan-200">
                    Open hub
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <MotionReveal className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase text-[#0a66c2]">Real-world examples</p>
            <h2 className="mt-3 text-4xl font-black text-[#111827] sm:text-5xl">
              Proof without fake claims.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#4b5563]">
              Until real customer proof is approved, the site uses labeled workflow examples and product evidence instead
              of invented testimonials.
            </p>
          </MotionReveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {proofExamples.map(([title, body]) => (
              <div key={title} className="rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm">
                <FileSearch className="h-6 w-6 text-[#0a66c2]" />
                <h3 className="mt-5 text-xl font-black text-[#111827]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#4b5563]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="border-y border-[#d8d2c4] bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <MotionReveal className="rounded-lg border border-[#d8d2c4] bg-[#111827] p-6 text-white md:p-10">
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm font-black uppercase text-cyan-200">Pricing</p>
                  <h2 className="mt-3 max-w-3xl text-4xl font-black sm:text-5xl">
                    Start with posts. Upgrade to growth. Turn on autopilot in Pro.
                  </h2>
                  <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                    Essentials is $9. Growth is $29. Pro is $49 and unlocks live autopilot execution.
                  </p>
                </div>
                <Link href={ROUTES.pricing} className="inline-flex h-12 items-center justify-center rounded-md bg-white px-7 text-base font-black text-[#111827] hover:bg-cyan-100">
                  View Pricing
                </Link>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {PRICING.map((plan) => (
                  <div key={plan.tier} className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
                    <p className="font-black">{plan.name}</p>
                    <p className="mt-3 text-3xl font-black">
                      {plan.monthlyUsd}<span className="text-sm text-slate-300">/mo</span>
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{plan.description}</p>
                  </div>
                ))}
              </div>
            </MotionReveal>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <MotionReveal>
              <p className="text-sm font-black uppercase text-[#0a66c2]">Blog</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black text-[#111827] sm:text-5xl">
                Guides for LinkedIn growth operators.
              </h2>
            </MotionReveal>
            <Link href="/blog" className="inline-flex h-12 items-center justify-center rounded-md border border-[#d8d2c4] bg-white px-6 text-sm font-black text-[#111827] hover:text-[#0a66c2]">
              Read the blog
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {blogPosts.slice(0, 3).map((post) => (
              <article key={post.slug} className="rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm">
                <p className="text-sm font-black uppercase text-[#0a66c2]">{post.category}</p>
                <h3 className="mt-3 text-xl font-black text-[#111827]">{post.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#4b5563]">{post.description}</p>
                <Link href={`/blog/${post.slug}`} className="mt-5 inline-flex text-sm font-black text-[#0a66c2]">
                  Read guide
                </Link>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-12 max-w-3xl text-center text-sm leading-6 text-[#666]">{TRUST_DISCLAIMER}</p>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
