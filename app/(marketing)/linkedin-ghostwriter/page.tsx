import type { Metadata } from "next";
import { PillarPage } from "@/components/marketing/PillarPage";

export const metadata: Metadata = {
  title: "LinkedIn Ghostwriter Alternative",
  description:
    "FollowerSpike is a LinkedIn ghostwriter alternative for founders and experts who want AI-assisted posts, review queues, and engagement workflows.",
};

export default function LinkedInGhostwriterPage() {
  return (
    <PillarPage
      eyebrow="LinkedIn ghostwriter alternative"
      title="A ghostwriter workflow with more control and daily momentum."
      description="FollowerSpike helps you create founder-tone LinkedIn posts and engagement actions without committing to a heavy human retainer or losing control of your voice."
      bullets={[
        "AI-assisted drafts that learn from your positioning, offers, and approved voice notes.",
        "Review, edit, skip, or regenerate before anything is used.",
        "Comments and connection workflows that most ghostwriting retainers do not include.",
      ]}
      sections={[
        {
          title: "Less blank page",
          body: "The system turns your profile, niche, and target audience into repeatable post and comment ideas.",
        },
        {
          title: "More than posts",
          body: "FollowerSpike pairs content with relevant comments and connection workflows so growth is not just publishing.",
        },
        {
          title: "Control stays with you",
          body: "Approval mode, pause controls, and audit logs keep the workflow accountable.",
        },
      ]}
      faq={[
        {
          question: "Does this replace a human ghostwriter?",
          answer:
            "It can replace parts of the workflow for many users, but high-touch executive storytelling may still benefit from a human strategist.",
        },
        {
          question: "Can I edit the drafts?",
          answer:
            "Yes. The product is built around review-first queues, so you can approve, edit, skip, or regenerate drafts.",
        },
      ]}
    />
  );
}
