import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Subprocessors",
  description: "FollowerSpike subprocessors and infrastructure providers.",
};

export default function SubprocessorsPage() {
  return (
    <LegalPage
      eyebrow="Subprocessors"
      title="Infrastructure and processing partners."
      description="This list reflects the planned production architecture and should be kept current as vendors change."
      sections={[
        {
          title: "Supabase",
          body: "Authentication, Postgres, RLS-protected application data, and storage.",
        },
        {
          title: "Vercel",
          body: "Application hosting, serverless functions, and deployment infrastructure.",
        },
        {
          title: "Razorpay",
          body: "Subscription checkout, billing events, and payment metadata.",
        },
        {
          title: "AI, queue, and email providers",
          body: "AI generation, fallback processing, cron dispatch, queue delivery, and transactional email.",
        },
      ]}
    />
  );
}
