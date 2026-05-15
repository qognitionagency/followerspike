"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SignupButton } from "@/components/marketing/SignupButton";
import { BRAND } from "@/lib/constants";

export function ExitIntentModal() {
  const [open, setOpen] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const handleMouseLeave = (event: MouseEvent) => {
      if (event.clientY <= 0 && !hasTriggered) {
        setOpen(true);
        setHasTriggered(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [hasTriggered]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-[#d6d6d6] bg-white text-[#191919] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#191919]">Do not leave LinkedIn to chance.</DialogTitle>
          <DialogDescription className="text-base text-[#666]">
            Start a {BRAND.trialDays}-day trial and see what your daily founder presence could look like before
            automation is enabled.
          </DialogDescription>
        </DialogHeader>
        <SignupButton className="h-12 w-full rounded-full bg-[#0A66C2] text-base font-semibold text-white hover:bg-[#004182]">
          Start 14-Day Trial
        </SignupButton>
      </DialogContent>
    </Dialog>
  );
}
