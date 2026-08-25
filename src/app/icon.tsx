import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const NAVY = "#101827";
const GREEN = "#22c55e";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: "6%",
            top: "6%",
            width: "88%",
            height: "88%",
            borderRadius: "20%",
            background: NAVY,
          }}
        />
        <div style={{ position: "absolute", left: "26%", top: "26%", width: "48%", height: "14%", borderRadius: "7%", background: "white" }} />
        <div style={{ position: "absolute", left: "26%", top: "26%", width: "14%", height: "48%", borderRadius: "7%", background: "white" }} />
        <div style={{ position: "absolute", left: "26%", top: "60%", width: "48%", height: "14%", borderRadius: "7%", background: "white" }} />
        <div style={{ position: "absolute", left: "60%", top: "46%", width: "14%", height: "28%", borderRadius: "7%", background: "white" }} />
        <div style={{ position: "absolute", left: "80%", top: "2%", width: "20%", height: "20%", borderRadius: "50%", background: GREEN }} />
      </div>
    ),
    { ...size },
  );
}
