import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/constants";

/**
 * The site-wide social card.
 *
 * Every marketing page inherits this unless it exports its own, which is the
 * point: before this existed, a link to any FollowerSpike page unfurled on X,
 * LinkedIn and Slack as a bare title with no image at all.
 *
 * Drawn rather than served from a file so it stays in sync with the brand
 * constants and needs no binary asset in the repo.
 */
export const runtime = "edge";
export const alt = "FollowerSpike: post to X, LinkedIn, and Bluesky in your own voice";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F4F2EE",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#0A66C2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="46" height="46" viewBox="0 0 32 32">
              <path
                d="M6 22.5 L12.5 16 L17 20.5 L25.5 10"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="25.5" cy="10" r="2.7" fill="#FFFFFF" />
            </svg>
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, color: "#191919" }}>{BRAND.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 800, color: "#191919", lineHeight: 1.1, maxWidth: 940 }}>
            Post to X, LinkedIn, and Bluesky in your own voice.
          </div>
          <div style={{ fontSize: 30, color: "#555555", maxWidth: 900 }}>
            One composer, a voice model trained on your writing, and a 0-100 Spike Rank for every profile.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: "#0A66C2", fontWeight: 700 }}>
          <div style={{ width: 44, height: 5, background: "#0A66C2", borderRadius: 3 }} />
          followerspike.com
        </div>
      </div>
    ),
    size
  );
}
