import { ImageResponse } from "next/og";

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
          alignItems: "center",
          justifyContent: "center",
          background: "#18120e",
          color: "#f5efe8",
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            color: "#B6754A",
            letterSpacing: -4,
          }}
        >
          Arca
        </div>
        <div style={{ fontSize: 32, fontFamily: "Georgia, serif", marginTop: 8, color: "#d8cdc2" }}>
          Your words, preserved with care.
        </div>
      </div>
    ),
    { ...size }
  );
}
