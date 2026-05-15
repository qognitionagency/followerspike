import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { blogPosts, getBlogPost } from "@/lib/marketing/content";
import { ROUTES } from "@/lib/constants";

type PageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

function BlogJsonLd({ slug }: { slug: string }) {
  const post = getBlogPost(slug);
  if (!post) return null;
  const siteUrl = process.env.APP_URL || "http://localhost:3000";
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      author: { "@type": "Organization", name: post.author },
      publisher: { "@type": "Organization", name: "FollowerSpike" },
      mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faq.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />;
}

export default function BlogPostPage({ params }: PageProps) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#111827]">
      <BlogJsonLd slug={post.slug} />
      <MarketingHeader />
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <article className="rounded-lg border border-[#d8d2c4] bg-white p-6 shadow-sm md:p-10">
          <p className="text-sm font-black uppercase text-[#0a66c2]">{post.category}</p>
          <h1 className="mt-3 text-5xl font-black leading-tight sm:text-6xl">{post.title}</h1>
          <p className="mt-5 text-lg leading-8 text-[#4b5563]">{post.description}</p>
          <p className="mt-5 text-sm font-bold text-[#6b7280]">
            {post.date} · {post.readTime} · {post.author}
          </p>
          <div className="mt-10 grid gap-8">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl font-black text-[#111827]">{section.heading}</h2>
                <p className="mt-3 text-base leading-8 text-[#374151]">{section.body}</p>
              </section>
            ))}
          </div>
          <section className="mt-10 rounded-lg bg-[#f4f2ee] p-6">
            <h2 className="text-xl font-black text-[#111827]">FAQ</h2>
            <div className="mt-4 grid gap-4">
              {post.faq.map((faq) => (
                <div key={faq.question}>
                  <h3 className="font-black text-[#111827]">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4b5563]">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </article>

        <section className="mt-8 rounded-lg border border-[#d8d2c4] bg-[#111827] p-6 text-white shadow-sm">
          <h2 className="text-2xl font-black">Turn this strategy into a daily queue.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            FollowerSpike helps convert positioning, ICP, content, comments, connection requests, and follow-ups into one reviewable workflow.
          </p>
          <Link href={ROUTES.signup} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-[#111827]">
            Start for free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
