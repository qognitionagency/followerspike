import type { Metadata } from "next";
import { PillarPage } from "@/components/marketing/PillarPage";

export const metadata: Metadata = {
  title: "LinkedIn Ghostwriter Alternative",
  description:
    "FollowerSpike is a LinkedIn ghostwriter alternative for founders and experts: drafts written in your own modelled voice, a review queue before anything publishes, and one composer for LinkedIn, X, and Bluesky.",
  alternates: { canonical: "/linkedin-ghostwriter" },
};

export default function LinkedInGhostwriterPage() {
  return (
    <PillarPage
      eyebrow="LinkedIn ghostwriter alternative"
      title="A ghostwriter workflow that keeps the voice yours."
      description="FollowerSpike models how you already write, from your own posts or from a written interview if you have none yet, then drafts in that voice for LinkedIn, X, and Bluesky. Nothing publishes until you approve it."
      bullets={[
        "Your voice modelled from your best posts, or built from a written interview, instead of a writer guessing at how you sound.",
        "One composer, three platforms: native variants for LinkedIn, X, and Bluesky through each official API.",
        "Spike Rank scores your profile out of 100 and lists the specific fixes, so you know what to change and not only what to post.",
        "Post-publish automations no retainer runs for you: first comment, auto-plug, cross-post relay, evergreen recycling, and keyword capture delivered by email.",
        "A monthly price against a monthly retainer, with review, edit, skip, or regenerate on every draft.",
      ]}
      sections={[
        {
          title: "Less blank page",
          body: "The composer starts from your positioning, your offers, and your saved voice profile, so a draft arrives with a point of view rather than an empty box. You can rewrite as many times as you like.",
        },
        {
          title: "More than drafting",
          body: "Spike Rank audits your profile across positioning, proof, cadence, engagement, and conversion path. Growth plans turn those findings into scheduled posts, and evergreen recycling brings a proven post back on a cadence you set.",
        },
        {
          title: "Control stays with you",
          body: "Every draft waits in the review queue. Automations ship off and in simulation mode, and quiet hours, daily caps, a global pause, and a log of every automated action stay in your hands.",
        },
      ]}
      faq={[
        {
          question: "Does this replace a human ghostwriter?",
          answer:
            "It replaces the drafting, scheduling, and publishing loop, and it keeps the voice yours. A human strategist can still be worth the retainer for high-touch executive storytelling or narrative work that involves interviewing other people.",
        },
        {
          question: "Can I edit the drafts?",
          answer:
            "Yes. The product is built around review-first queues, so you can approve, edit, skip, or regenerate drafts.",
        },
        {
          question: "Does it comment on other people or send DMs?",
          answer:
            "No. Automations only act on your own posts: a first comment, a plug, a mirror to your other connected accounts, or a keyword capture that answers by email. There are no likes, follows, connection requests, or direct messages, and no browser automation.",
        },
      ]}
    />
  );
}
