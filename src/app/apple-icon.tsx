import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const NAVY = "#101827";
const GREEN = "#22c55e";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: NAVY }}>
        <div style={{ position: "absolute", left: "30%", top: "30%", width: "40%", height: "12%", borderRadius: "7%", background: "white" }} />
        <div style={{ position: "absolute", left: "30%", top: "30%", width: "12%", height: "40%", borderRadius: "7%", background: "white" }} />
        <div style={{ position: "absolute", left: "30%", top: "58%", width: "40%", height: "12%", borderRadius: "7%", background: "white" }} />
        <div style={{ position: "absolute", left: "58%", top: "46%", width: "12%", height: "24%", borderRadius: "7%", background: "white" }} />
        <div style={{ position: "absolute", left: "74%", top: "10%", width: "16%", height: "16%", borderRadius: "50%", background: GREEN }} />
      </div>
    ),
    { ...size },
  );
}
