import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Trust Center",
  description: "FollowerSpike trust, safety, privacy, and automation controls.",
};

export default function TrustPage() {
  return (
    <LegalPage
      eyebrow="Trust Center"
      title="Publishing on your behalf works better with clear controls."
      description="FollowerSpike publishes to X, LinkedIn, and Bluesky under your name, so the safety model is deliberately conservative: consent, review, rate limits, encrypted credentials, audit logs, and pause controls."
      sections={[
        {
          title: "Account-Safety Controls",
          body: "Every automated action passes one gate before it runs. It enforces 9am-6pm windows in your own timezone, per-tier daily limits counted across your workspace, auto-pause after five consecutive failures, and a global stop that halts work already in flight. A post you scheduled yourself is exempt from the quiet-hours check, because honouring the time you picked is not the automation acting on its own.",
        },
        {
          title: "Consent-Based Automation",
          body: "Live execution requires explicit opt-in, risk acknowledgement, and a current consent version. Users can pause automation, switch to Review mode, revoke consent, and delete session data.",
        },
        {
          title: "Security Foundations",
          body: "Platform credentials are encrypted with AES-256-GCM, user records are reachable only through server-side code that scopes every query to the signed-in Clerk session, and webhooks are signature-verified. A post that has already been published is claimed in the database before it is sent, so a retry cannot post twice under your name.",
        },
        {
          title: "No Fake Certification Claims",
          body: "FollowerSpike does not claim LinkedIn endorsement or certification. If a legitimate certification is obtained later, the claim can be added with proof and legal approval.",
        },
      ]}
      relatedLinks={[
        { label: "Multi-platform composer", href: "/features/multi-platform-composer" },
        { label: "Safety controls", href: "/features/safety-controls" },
        { label: "Free profile audit", href: "/free-tools/spike-rank-linkedin" },
      ]}
    />
  );
}
