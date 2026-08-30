import { ImageResponse } from "next/og";

// Shared by the icon-*/route.tsx handlers manifest.ts references — same
// indigo-600 badge + white "G" as the in-app sidebar/mobile-nav logo (see
// sidebar.tsx), just full-bleed since OS launchers apply their own
// rounding/masking over a home-screen icon.
export function brandIconResponse(sizePx: number, glyphRatio: number): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4f46e5",
          color: "white",
          fontSize: Math.round(sizePx * glyphRatio),
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        G
      </div>
    ),
    { width: sizePx, height: sizePx },
  );
}
