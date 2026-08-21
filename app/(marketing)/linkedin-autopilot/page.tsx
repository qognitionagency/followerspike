import type { Metadata } from "next";
import { PillarPage } from "@/components/marketing/PillarPage";

export const metadata: Metadata = {
  title: "LinkedIn Autopilot for Founders and Experts",
  description:
    "What can honestly be automated on LinkedIn: voice-modelled drafts, scheduled publishing through the official API, a review queue, quiet hours, and daily caps. No likes, no connection requests, no DMs.",
};

/**
 * The pillar page for "LinkedIn autopilot".
 *
 * It used to sell likes, comments, connection requests and follow-up DMs as a
 * daily routine. None of that is built — the browser-automation engine that once
 * did it was retired — so this page now answers the search term with what the
 * product actually does and, just as usefully, what LinkedIn's API will not let
 * anybody do. The distinction is the reason to trust the rest of the page.
 */
export default function LinkedInAutopilotPage() {
  return (
    <PillarPage
      eyebrow="LinkedIn autopilot"
      title="The part of LinkedIn worth automating is the publishing."
      description="FollowerSpike drafts in your own voice, shows you exactly what LinkedIn will receive, and publishes it on a schedule through LinkedIn's official Posts API. Everything else people sell as autopilot — likes, connection requests, follow-up DMs — is browser automation against LinkedIn's terms, and it is deliberately not here."
      bullets={[
        "Posts shaped by a voice profile built from your own writing, not a generic tone setting.",
        "A review queue where every scheduled post can be edited or cancelled before it goes out.",
        "Quiet hours in your timezone, per-plan daily caps, auto-pause after repeated failures, and a global stop.",
      ]}
      sections={[
        {
          title: "What runs on its own",
          body: "Scheduled publishing, evergreen recycling on a cadence you set, and a cross-post relay that mirrors a LinkedIn post onto X and Bluesky. Each one is off by default, simulates by default, and records every decision it makes to an activity log you can read.",
        },
        {
          title: "What LinkedIn does not allow us to do",
          body: "LinkedIn exposes no endpoint we can use to comment on a post, read the comments on one, or send a message, at the permissions available to us. So first comments, keyword capture, and auto-plug work on X and Bluesky and are marked unavailable on LinkedIn rather than quietly failing. An automation that claimed otherwise would be running a browser against your account.",
        },
        {
          title: "Why there is no engagement queue",
          body: "Automated likes, follows, and connection requests carry real account risk and are the reason most LinkedIn autopilot tools get accounts restricted. FollowerSpike publishes and reads only through official APIs, under permissions you grant and can revoke.",
        },
      ]}
      faq={[
        {
          question: "Is LinkedIn autopilot safe?",
          answer:
            "Publishing through the official API on a schedule is ordinary use. The unsafe version is a tool driving a logged-in browser to like, follow, and message on your behalf — that is what gets accounts restricted, and it is not what this does.",
        },
        {
          question: "Will it send connection requests or DMs for me?",
          answer:
            "No. Neither is built, and neither is planned. LinkedIn messaging is Partner-only, and connection requests are only reachable by automating a browser session.",
        },
        {
          question: "Can it post the first comment under my LinkedIn post?",
          answer:
            "Not on LinkedIn. The first comment feature works on X and Bluesky, where replying to your own post is a normal API call. On LinkedIn it is shown as unsupported.",
        },
        {
          question: "Who is this for?",
          answer:
            "Founders, operators, coaches, and consultants who want to publish consistently on LinkedIn alongside X and Bluesky without spending every morning inside three apps.",
        },
      ]}
    />
  );
}
