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
          body: "User-facing reads and writes go through Supabase RLS. Subscription, webhook, audit lead, and automation log writes use service-role code paths only.",
        },
        {
          title: "Verified Integrations",
          body: "Razorpay and QStash requests are verified before processing. Worker dispatch payloads are signed with a shared secret.",
        },
        {
          title: "Audit Trail",
          body: "Every attempted, skipped, paused, failed, and successful automation action is stored with a reason code and timestamp.",
        },
      ]}
    />
  );
}
