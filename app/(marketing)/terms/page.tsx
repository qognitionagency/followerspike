import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "FollowerSpike terms and responsible automation boundaries.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Responsible use terms."
      description="These terms are draft implementation copy. Legal counsel should approve them before production launch."
      sections={[
        {
          title: "User Responsibility",
          body: "Users are responsible for ensuring their LinkedIn activity, content, and use of automation comply with laws, platform rules, and professional standards.",
        },
        {
          title: "No Guaranteed Outcomes",
          body: "FollowerSpike does not guarantee leads, engagement, platform safety, account standing, or revenue outcomes.",
        },
        {
          title: "Automation Risk",
          body: "Live execution can carry platform risk. Users must explicitly acknowledge that risk before enabling autopilot.",
        },
        {
          title: "Prohibited Use",
          body: "Users may not use FollowerSpike for spam, harassment, fake identity, deceptive claims, inauthentic engagement, unlawful activity, or mass irrelevant outreach.",
        },
      ]}
    />
  );
}
