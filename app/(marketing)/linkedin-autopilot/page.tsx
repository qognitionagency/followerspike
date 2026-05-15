import type { Metadata } from "next";
import { PillarPage } from "@/components/marketing/PillarPage";

export const metadata: Metadata = {
  title: "LinkedIn Autopilot for Founders and Experts",
  description:
    "Learn how FollowerSpike turns LinkedIn into a review-first autopilot for posts, likes, comments, connection requests, follow-up DMs, and daily expert visibility.",
};

export default function LinkedInAutopilotPage() {
  return (
    <PillarPage
      eyebrow="LinkedIn autopilot"
      title="A safer LinkedIn autopilot for people with real reputations."
      description="FollowerSpike turns LinkedIn growth into a daily workflow: draft useful posts, find relevant conversations, queue target connections, prepare accepted-connection follow-ups, and review everything before it goes live."
      bullets={[
        "Daily posts shaped by your profile, ICP, offers, and approved voice notes.",
        "Relevance-scored comments so engagement stays useful instead of random.",
        "Connection requests, follow-up DMs, timing windows, caps, pause controls, and activity logs.",
      ]}
      sections={[
        {
          title: "Review before execution",
          body: "Autopilot starts with approval queues, so founders and teams can prove voice and targeting before allowing more automation.",
        },
        {
          title: "Built for consistency",
          body: "The product reduces blank-page friction by turning positioning, target lists, and content prompts into a repeatable daily cadence.",
        },
        {
          title: "Risk-managed controls",
          body: "FollowerSpike uses consent, caps, timing windows, audit logs, and pause behavior to reduce platform-sensitive risk.",
        },
      ]}
      faq={[
        {
          question: "Is LinkedIn autopilot safe?",
          answer:
            "Automation carries platform risk. FollowerSpike is designed to reduce that risk with review mode, conservative controls, and transparent disclaimers.",
        },
        {
          question: "Who is this for?",
          answer:
            "It is for founders, SMB owners, coaches, consultants, creators, and personal brands who need consistent expert visibility without spending every day inside LinkedIn.",
        },
      ]}
    />
  );
}
