import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
      </body>
    </html>
  );
}
