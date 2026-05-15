"use client";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { forwardRef, Suspense } from "react";

const SignupButtonInner = forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>((props, ref) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (props.onClick) {
      props.onClick(e);
    }
    const qs = searchParams.toString();
    router.push(`/signup${qs ? `?${qs}` : ""}`);
  };

  return (
    <Button ref={ref} {...props} onClick={handleClick}>
      {props.children}
    </Button>
  );
});

SignupButtonInner.displayName = "SignupButtonInner";

export const SignupButton = forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>((props, ref) => {
  return (
    <Suspense fallback={<Button ref={ref} {...props}>{props.children}</Button>}>
      <SignupButtonInner ref={ref} {...props} />
    </Suspense>
  );
});

SignupButton.displayName = "SignupButton";

