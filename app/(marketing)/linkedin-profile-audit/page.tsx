import type { Metadata } from "next";
import { PillarPage } from "@/components/marketing/PillarPage";

export const metadata: Metadata = {
  title: "LinkedIn Profile Audit Tool",
  description:
    "Use FollowerSpike's LinkedIn profile audit workflow to find positioning gaps, headline fixes, keyword gaps, and a 7-day activation plan.",
};

export default function LinkedInProfileAuditPage() {
  return (
    <PillarPage
      eyebrow="LinkedIn profile audit"
      title="Find the profile gaps costing you visibility."
      description="The FollowerSpike audit turns your profile into a practical rebuild plan: sharper headline, clearer positioning, keyword gaps, and content prompts that feed your first growth queue."
      bullets={[
        "Audit score, profile summary, headline suggestion, and about-section direction.",
        "Keyword gaps and content prompts for founder-led LinkedIn positioning.",
        "Empty-profile recovery when the public profile has little usable signal.",
      ]}
      sections={[
        {
          title: "Positioning first",
          body: "The audit focuses on who you help, what you are known for, and why the right audience should care.",
        },
        {
          title: "From audit to queue",
          body: "Profile insights can become draft posts, comment angles, and connection targets inside FollowerSpike.",
        },
        {
          title: "Lead-ready workflow",
          body: "The audit is also a conversion path for users who want value before starting a trial.",
        },
      ]}
      faq={[
        {
          question: "Do I need a complete profile?",
          answer:
            "No. If the profile has little public signal, the audit focuses on foundation rebuild steps rather than returning a blank error.",
        },
        {
          question: "What happens after the audit?",
          answer:
            "You can use the audit to personalize your first FollowerSpike session and start with a clearer daily content and engagement workflow.",
        },
      ]}
    />
  );
}
