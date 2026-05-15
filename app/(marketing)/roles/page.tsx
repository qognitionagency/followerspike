import type { Metadata } from "next";
import { AudienceHub } from "@/components/marketing/AudienceHub";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { buildRolePages } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "LinkedIn Growth by Role",
  description: "Role-based LinkedIn growth playbooks for founders, SMB owners, coaches, consultants, creators, agencies, and professional operators.",
  alternates: { canonical: "/roles" },
};

export default function RolesHubPage() {
  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <MarketingHeader />
      <AudienceHub
        eyebrow="Roles"
        title="LinkedIn growth playbooks by role."
        description="Choose your role and see how FollowerSpike turns daily posts, engagement, connections, and follow-ups into a focused workflow."
        pages={buildRolePages()}
        basePath="/roles"
      />
      <MarketingFooter />
    </div>
  );
}
