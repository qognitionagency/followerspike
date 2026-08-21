import type { Metadata } from "next";
import { AudienceHub } from "@/components/marketing/AudienceHub";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { icpPages } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "LinkedIn ICP Playbooks",
  description: "ICP-based publishing playbooks for founder-led SaaS, local service businesses, coaching, consulting, creator-led businesses, and agencies.",
  alternates: { canonical: "/icp" },
};

export default function IcpHubPage() {
  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <MarketingHeader />
      <AudienceHub
        eyebrow="ICP"
        title="Publishing systems by ideal customer profile."
        description="Choose the audience you want to attract, then use FollowerSpike to shape what you publish — and what happens under each post — around that market."
        pages={icpPages}
        basePath="/icp"
      />
      <MarketingFooter />
    </div>
  );
}
