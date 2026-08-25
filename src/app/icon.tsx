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
            borderRadius: "22%",
            background: NAVY,
          }}
        />
        <div style={{ position: "absolute", left: "25%", top: "26%", width: "50%", height: "13%", borderRadius: "8%", background: "white" }} />
        <div style={{ position: "absolute", left: "25%", top: "26%", width: "13%", height: "49%", borderRadius: "8%", background: "white" }} />
        <div style={{ position: "absolute", left: "25%", top: "61%", width: "50%", height: "13%", borderRadius: "8%", background: "white" }} />
        <div style={{ position: "absolute", left: "62%", top: "47%", width: "13%", height: "27%", borderRadius: "8%", background: "white" }} />
        <div style={{ position: "absolute", left: "80%", top: "2%", width: "20%", height: "20%", borderRadius: "50%", background: GREEN }} />
      </div>
    ),
    { ...size },
  );
}
