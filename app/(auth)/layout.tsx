import { ClerkProvider } from "@clerk/nextjs";

/**
 * Clerk's context lives here rather than in the root layout.
 *
 * SignIn and SignUp are client components and need the provider, but the
 * marketing site does not — and with the provider at the root every one of the
 * ~1300 prerendered marketing pages required a Clerk publishable key at build
 * time. Scoping it to the routes that actually render Clerk UI keeps the
 * marketing build independent of Clerk entirely.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
