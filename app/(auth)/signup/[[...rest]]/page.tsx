import { SignUp } from "@clerk/nextjs";
import { ROUTES } from "@/lib/constants";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <SignUp signInUrl="/login" fallbackRedirectUrl={ROUTES.app} />
    </main>
  );
}
