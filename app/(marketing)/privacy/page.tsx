import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "FollowerSpike privacy and GDPR-ready data controls.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy built for founder workflows."
      description="This page is implementation-ready product copy and should be reviewed by counsel before launch."
      sections={[
        {
          title: "Data We Process",
          body: "We process account identity, LinkedIn profile inputs, generated content, approval decisions, subscription metadata, audit leads, and automation logs.",
        },
        {
          title: "GDPR-Ready Controls",
          body: "Users can download a JSON data export, delete their account, revoke consent, and delete LinkedIn session material from app settings. Lead magnet email consent is tracked with audit lead records.",
        },
        {
          title: "AI Processing",
          body: "Profile context and content prompts may be sent to trusted AI processing providers to generate audits, posts, comments, and relevance scores.",
        },
        {
          title: "Retention",
          body: "Automation logs and billing records are retained for operational and legal reasons. Session data can be deleted independently from the account.",
        },
      ]}
    />
  );
}
