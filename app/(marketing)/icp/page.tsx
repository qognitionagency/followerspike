import type { Metadata } from "next";
import { AudienceHub } from "@/components/marketing/AudienceHub";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { icpPages } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "LinkedIn ICP Playbooks",
  description: "ICP-based LinkedIn growth playbooks for founder-led SaaS, local service businesses, coaching, consulting, creator-led businesses, and agencies.",
  alternates: { canonical: "/icp" },
};

export default function IcpHubPage() {
  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <MarketingHeader />
      <AudienceHub
        eyebrow="ICP"
        title="LinkedIn growth systems by ideal customer profile."
        description="Choose the audience you want to attract, then use FollowerSpike to shape posts, conversations, connection requests, and follow-ups around that market."
        pages={icpPages}
        basePath="/icp"
      />
      <MarketingFooter />
    </div>
  );
}
