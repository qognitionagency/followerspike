import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: {
    default: "FollowerSpike | Post to X, LinkedIn, and Bluesky in Your Own Voice",
    template: "%s | FollowerSpike",
  },
  description:
    "One composer for X, LinkedIn, and Bluesky, AI that writes in your voice, a 0-100 score for every profile, and automations that turn reach into email subscribers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable} suppressHydrationWarning>
        <ClerkProvider>{children}</ClerkProvider>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-NZJYJ25CW4" strategy="afterInteractive" />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-NZJYJ25CW4');
            `,
          }}
        />
      </body>
    </html>
  );
}
