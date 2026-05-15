import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/env";
import { BRAND, ROUTES } from "@/lib/constants";

type AuthPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function LoginPage({ searchParams = {} }: AuthPageProps) {
  const next = typeof searchParams.next === "string" ? searchParams.next : ROUTES.app;

  const login = async (formData: FormData) => {
    "use server";
    const email = String(formData.get("email") ?? "");
    const nextPath = String(formData.get("next") ?? ROUTES.app);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl()}${ROUTES.callback}?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      redirect("/login?error=1");
    }

    redirect("/login?message=1");
  };

  const loginWithGoogle = async () => {
    "use server";
    const supabase = await createClient();
    const { data } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${appUrl()}${ROUTES.callback}?next=${encodeURIComponent(next)}`,
      },
    });

    if (data.url) {
      redirect(data.url);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F2EE] p-4 text-[#191919]">
      <section className="w-full max-w-md rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-sm">
        <Link href={ROUTES.home} className="font-black text-[#0A66C2]">
          {BRAND.name}
        </Link>
        <h1 className="mt-8 text-3xl font-black">Welcome back.</h1>
        <p className="mt-2 text-sm text-[#666]">Sign in with a magic link or Google.</p>
        <form action={login} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <Input name="email" type="email" placeholder="founder@company.com" required className="h-12 bg-white" />
          <Button className="h-12 w-full rounded-full bg-[#0A66C2] font-black text-white hover:bg-[#004182]">
            Send Magic Link
          </Button>
        </form>
        <form action={loginWithGoogle} className="mt-3">
          <Button variant="outline" className="h-12 w-full rounded-full border-[#D6D6D6] bg-white font-black text-[#191919]">
            Continue with Google
          </Button>
        </form>
        {searchParams.error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Sign-in failed. Try again.</p> : null}
        {searchParams.message ? <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">Check your email for the magic link.</p> : null}
        <p className="mt-6 text-center text-sm text-[#666]">
          New here?{" "}
          <Link href={ROUTES.signup} className="font-bold text-[#0A66C2]">
            Start a trial
          </Link>
        </p>
      </section>
    </main>
  );
}
