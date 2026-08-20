import { SignIn } from "@clerk/nextjs";
import { ROUTES } from "@/lib/constants";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <SignIn signUpUrl="/signup" fallbackRedirectUrl={ROUTES.app} />
    </main>
  );
}
