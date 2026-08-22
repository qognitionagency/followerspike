import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What FollowerSpike collects, which third parties process it, how AI is used, and how to export or delete everything.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="What we collect, who processes it, and how to get it back."
      description="Written against what the product actually stores rather than a template. It is still product copy and should be reviewed by counsel before you rely on it as a legal notice."
      sections={[
        {
          title: "Yes, we collect your data",
          body:
            "Using FollowerSpike means we store data about you. Specifically: your name and email address from sign-up; the posts, drafts and threads you write; the voice profile built from your writing samples and the interview answers behind it; the social accounts you connect and their access tokens; the public profile metrics behind your Spike Rank; your approval decisions and every automated action taken on your behalf; and your subscription and billing metadata. If you use a free tool without an account, we store what you typed into it, the result, your email address if you gave us one, and the UTM parameters on the link that brought you.",
        },
        {
          title: "We use AI, and here is what it sees",
          body:
            "Post generation, profile audits, relevance scoring and voice synthesis are performed by third-party AI models. What we send them is the text you asked us to work on plus the context needed to do it: your topic, your voice profile, your prior posts as style examples, and, for an audit, the profile text you pasted. We do not send your access tokens, your password, your payment details, or another member's content. Every AI call is logged with its provider, model, token count and cost so we can show you what ran. Generated text is never published without a human approval step unless you have explicitly enabled autopilot and accepted the consent notice.",
        },
        {
          title: "Third parties that process your data",
          body:
            "We are not the only company that touches this data. Clerk handles authentication and stores your identity and sign-in activity. Neon hosts the Postgres database holding everything above. Vercel hosts and serves the application and processes request logs including your IP address. Google (Gemini) and DeepSeek process the AI requests described above. Resend sends transactional and lead-magnet email and processes your address. Upstash (QStash) carries scheduling messages for the job queue. Razorpay processes subscription checkout and payment metadata. Google Analytics records page views when a measurement id is configured. X, LinkedIn and Bluesky receive the content you choose to publish and the API calls that publish it. The current list is maintained on the subprocessors page.",
        },
        {
          title: "Access tokens and connected accounts",
          body:
            "Tokens for connected X, LinkedIn and Bluesky accounts are encrypted before they are written to the database and are never returned to the browser or shown to you again. Disconnecting an account erases its stored credentials immediately while keeping the history of what was published through it, because deleting that history would break the posts and logs that reference it. You can also revoke our access from the platform's own settings at any time, which works whether or not you disconnect here.",
        },
        {
          title: "Files and uploads",
          body:
            "FollowerSpike does not accept file uploads and operates no object storage. There is no bucket, public or private, and no image or document of yours is stored anywhere in the system. Everything we hold is text and structured records in the database described above.",
        },
        {
          title: "Operational data",
          body:
            "We record failures in an error log to diagnose outages. Those entries hold the error, where it happened, and the account id it relates to. They never hold request bodies, which is where credentials would be. They are deleted automatically after 30 days. We also count requests per account and per IP address to enforce rate limits; those counters hold no content and expire within a day.",
        },
        {
          title: "Exporting and deleting everything",
          body:
            "Account settings has a one-click JSON export of every record we hold about you, and a delete control that removes the account outright. Deletion removes your Clerk identity and cascades through every table keyed to your account: posts, variants, voice profiles and embeddings, connected accounts and their tokens, Spike Rank history, growth plans, automations and their logs. It is immediate and it is not reversible. Billing records are retained where tax and accounting law requires it. Cancelling a subscription takes one click and does not delete anything.",
        },
        {
          title: "Retention",
          body:
            "Content and profile data are kept until you delete them or delete your account. Error log entries are kept 30 days. Rate limit counters are kept under a day. Automation logs are kept for the life of the account, because they are the record of what was published under your name. Billing records are kept as long as law requires.",
        },
        {
          title: "Contact",
          body:
            "For a data request, a correction, or a question about anything on this page, email the address on the trust page and we will answer it.",
        },
      ]}
      relatedLinks={[
        { label: "Subprocessors", href: "/subprocessors" },
        { label: "Security", href: "/security" },
        { label: "Terms", href: "/terms" },
      ]}
    />
  );
}
