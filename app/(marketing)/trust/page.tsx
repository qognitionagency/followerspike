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
      title="LinkedIn growth works better with clear controls."
      description="FollowerSpike is built for daily account growth, but the safety model is deliberately conservative: consent, review, rate limits, encrypted sessions, audit logs, and pause controls."
      sections={[
        {
          title: "Account-Safety Controls",
          body: "The worker enforces human-speed delays, 9am-6pm user-timezone windows, tier-based daily limits, first-week review mode, and auto-pause after repeated errors or LinkedIn challenges.",
        },
        {
          title: "Consent-Based Automation",
          body: "Live execution requires explicit opt-in, risk acknowledgement, and a current consent version. Users can pause automation, switch to Review mode, revoke consent, and delete session data.",
        },
        {
          title: "Security Foundations",
          body: "Sensitive payloads are encrypted with AES-256-GCM, user records are reachable only through server-side code that scopes every query to the signed-in Clerk session, and webhooks are signature-verified.",
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
