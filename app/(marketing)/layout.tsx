import { ExitIntentModal } from "@/components/marketing/ExitIntentModal";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <ExitIntentModal />
    </>
  );
}
