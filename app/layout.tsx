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
    default: "FollowerSpike | LinkedIn Growth Autopilot for Founders",
    template: "%s | FollowerSpike",
  },
  description:
    "AI LinkedIn growth autopilot for posts, relevant engagement, connection requests, follow-up DMs, profile audits, and safety controls.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable} suppressHydrationWarning>
        {children}
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
