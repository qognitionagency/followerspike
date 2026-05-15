import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Data Processing Addendum",
  description: "FollowerSpike DPA summary for GDPR-ready customers.",
};

export default function DpaPage() {
  return (
    <LegalPage
      eyebrow="DPA"
      title="Data Processing Addendum."
      description="A production launch should replace this summary with a counsel-approved DPA."
      sections={[
        {
          title: "Processor Role",
          body: "FollowerSpike acts as a processor for customer-provided LinkedIn workflow data and as a controller for account, billing, and marketing lead data.",
        },
        {
          title: "Security Measures",
          body: "Encryption, access controls, RLS policies, webhook verification, and audit logs are part of the technical and organizational measures.",
        },
        {
          title: "Data Subject Requests",
          body: "The product supports export, deletion, session removal, and consent revocation workflows that can be completed from settings or support.",
        },
        {
          title: "International Transfers",
          body: "Subprocessors may process data across regions. The subprocessors page identifies core providers and their role.",
        },
      ]}
    />
  );
}
