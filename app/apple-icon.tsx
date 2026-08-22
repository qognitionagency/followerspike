import { ImageResponse } from "next/og";

/**
 * The iOS home-screen icon.
 *
 * Generated rather than served as a file because Next's `apple-icon` convention
 * accepts png/jpg only, not svg. An `apple-icon.svg` sitting in this directory
 * is not an error, it is simply ignored, which is what happened: the build
 * emitted no apple icon at all and the tag never appeared in any page head.
 *
 * Drawn from the same marks as `icon.svg` so the two cannot drift.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A66C2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
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
    ),
    size
  );
}
