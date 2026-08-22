import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { BRAND } from "@/lib/constants";
import { appUrl, optionalEnv } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const title = `${BRAND.name} | Post to X, LinkedIn, and Bluesky in Your Own Voice`;
const description =
  "One composer for X, LinkedIn, and Bluesky, AI that writes in your voice, a 0-100 score for every profile, and automations that turn reach into email subscribers.";

export const metadata: Metadata = {
  // Resolved through appUrl() rather than read from APP_URL directly, so an
  // unset variable falls back to the Vercel production domain instead of
  // silently declaring localhost the canonical origin of the site.
  metadataBase: new URL(appUrl()),
  title: {
    default: title,
    template: `%s | ${BRAND.name}`,
  },
  description,
  applicationName: BRAND.name,
  // Inherited by every page that does not set its own, which is what gives the
  // whole site a social card. Individual pages override `title`/`description`
  // and the rest carries through.
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    locale: "en_US",
    url: "/",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

// Analytics only where there is a measurement id to send to. The id used to be
// hardcoded, so every local dev page load and every preview deployment reported
// into the production property.
const analyticsId = optionalEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable} suppressHydrationWarning>
        {children}
        {analyticsId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${analyticsId}');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
