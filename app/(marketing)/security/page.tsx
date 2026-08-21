import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Security",
  description: "FollowerSpike security controls for sessions, data, webhooks, and automation logs.",
};

export default function SecurityPage() {
  return (
    <LegalPage
      eyebrow="Security"
      title="Security controls for a sensitive workflow."
      description="FollowerSpike handles identity, billing, AI output, and LinkedIn session material as sensitive data."
      sections={[
        {
          title: "Encrypted Sessions",
          body: "LinkedIn session payloads are encrypted server-side with AES-256-GCM and are never exposed to client components.",
        },
        {
          title: "Least Privilege",
          body: "The database is reachable only by the application server; there is no public data endpoint and no browser-held database key. Every query is scoped to the signed-in user in server code, and Clerk verifies the session before any of it runs.",
        },
        {
          title: "Verified Integrations",
          body: "Clerk, Razorpay, and QStash requests are all signature-verified before processing, and every one of them fails closed: a missing header, an absent signing key, or a body that does not match is rejected rather than trusted. The job runner is reachable only with a valid QStash signature, so a deployment with no signing keys configured cannot be driven over HTTP at all.",
        },
        {
          title: "Audit Trail",
          body: "Every attempted, skipped, paused, failed, and successful automation action is stored with a reason code and timestamp.",
        },
      ]}
    />
  );
}
