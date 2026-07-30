import { ImageResponse } from "next/og";

import { TAGLINE } from "@/lib/constants";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Satori (the renderer behind ImageResponse) can't render the real logo's SVG <feGaussianBlur>
 * filters, so this deliberately uses the simpler solid-chip monogram treatment already proven in
 * mobile/src/lib/pdf.ts's documentHeader() instead of reproducing the actual logomark artwork.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
          padding: 96,
          backgroundColor: "#faf8f4",
          color: "#1a1a17",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: "#A069DA",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            E
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, display: "flex" }}>
            <span style={{ color: "#A069DA" }}>Elikia</span>&nbsp;Fund
          </div>
        </div>
        <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.15, maxWidth: 900, display: "flex" }}>{TAGLINE}</div>
        <div style={{ fontSize: 26, color: "#6B675E", display: "flex" }}>Congo-Brazzaville</div>
      </div>
    ),
    { ...size },
  );
}
