import type { Metadata } from "next";
import { AudienceHub } from "@/components/marketing/AudienceHub";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { buildIndustryPages } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "LinkedIn Growth by Industry",
  description: "Industry-specific LinkedIn growth playbooks for SaaS, fintech, consulting, healthcare, real estate, agencies, coaching, and more.",
  alternates: { canonical: "/industries" },
};

export default function IndustriesHubPage() {
  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <MarketingHeader />
      <AudienceHub
        eyebrow="Industries"
        title="LinkedIn growth playbooks by industry."
        description="Every industry needs different proof, topics, comments, and connection targets. Start with the market you want to win."
        pages={buildIndustryPages()}
        basePath="/industries"
      />
      <MarketingFooter />
    </div>
  );
}
