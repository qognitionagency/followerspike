import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { blogPosts } from "@/lib/marketing/content";

const siteUrl = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "LinkedIn Growth Blog",
  description: "FollowerSpike guides for LinkedIn autopilot, safety, ICP, comments, connections, follow-up DMs, and growth workflows.",
  alternates: { canonical: "/blog" },
};

export default function BlogHubPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "LinkedIn growth blog",
    description: metadata.description,
    itemListElement: blogPosts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: post.title,
      url: `${siteUrl}/blog/${post.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#111827]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <MarketingHeader />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase text-[#0a66c2]">Blog</p>
          <h1 className="mt-3 text-5xl font-black sm:text-6xl">LinkedIn growth guides for serious operators.</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#4b5563]">
            Practical articles on review-first automation, ICP, posts, engagement, connections, DMs, and account growth systems.
          </p>
        </section>
        <section className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <article key={post.slug} className="rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm">
              <p className="text-sm font-black uppercase text-[#0a66c2]">{post.category}</p>
              <h2 className="mt-3 text-2xl font-black text-[#111827]">{post.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#4b5563]">{post.description}</p>
              <p className="mt-4 text-xs font-bold uppercase text-[#6b7280]">
                {post.readTime} · {post.author}
              </p>
              <Link href={`/blog/${post.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#0a66c2]">
                Read guide
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
