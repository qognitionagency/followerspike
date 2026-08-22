import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Subprocessors",
  description: "Every third party that processes FollowerSpike customer data, and what each one receives.",
  alternates: { canonical: "/subprocessors" },
};

export default function SubprocessorsPage() {
  return (
    <LegalPage
      eyebrow="Subprocessors"
      title="Every third party that touches your data."
      description="Named individually rather than grouped, because a category like 'AI providers' does not tell you whose terms your content is subject to. Keep this list current as vendors change."
      sections={[
        {
          title: "Neon: database",
          body: "Serverless Postgres holding every application record: accounts, posts, voice profiles, encrypted access tokens, logs, and billing metadata.",
        },
        {
          title: "Clerk: authentication",
          body: "Identity, sessions, sign-in and sign-up. Holds your name, email address and authentication activity.",
        },
        {
          title: "Vercel: hosting",
          body: "Serves the application and runs its server functions. Processes request metadata including IP addresses in its platform logs.",
        },
        {
          title: "Google (Gemini): AI generation",
          body: "Post generation, profile audits, relevance scoring and voice synthesis. Receives the text being worked on and the voice context needed to produce it.",
        },
        {
          title: "DeepSeek: AI generation",
          body: "The fallback model for the same generation paths, used when the primary provider is unavailable. Receives the same content.",
        },
        {
          title: "Resend: email",
          body: "Transactional and lead-magnet email. Receives your email address and the message body.",
        },
        {
          title: "Upstash (QStash): job scheduling",
          body: "Carries signed scheduling messages that trigger publishing and refresh jobs. Receives job identifiers, not post content.",
        },
        {
          title: "Razorpay: payments",
          body: "Subscription checkout, renewals, cancellation and billing events. Receives your name, email address and payment details, which never reach our own database.",
        },
        {
          title: "Google Analytics: usage measurement",
          body: "Page-view analytics on the marketing site, active only where a measurement id is configured. Receives standard web analytics data including IP address and user agent.",
        },
        {
          title: "X, LinkedIn and Bluesky: publishing destinations",
          body: "Not subprocessors in the usual sense, but worth naming: when you publish, the content and the API call go to the platform you chose, under its own terms and privacy policy.",
        },
      ]}
      relatedLinks={[
        { label: "Privacy", href: "/privacy" },
        { label: "Security", href: "/security" },
        { label: "DPA", href: "/dpa" },
      ]}
    />
  );
}
