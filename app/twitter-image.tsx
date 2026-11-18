import { ImageResponse } from "next/og";
export const alt = "SnapText AI social preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function TwitterImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg, #160d35 0%, #5424a8 55%, #8b5cf6 100%)", color: "white", fontFamily: "Arial" }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#ddd6fe" }}>SNAPTEXT AI</div>
      <div style={{ marginTop: 35, fontSize: 72, lineHeight: 1.08, fontWeight: 800 }}>AI Image &amp; Document Tools</div>
      <div style={{ marginTop: 28, fontSize: 30, color: "#ede9fe" }}>Extract text. Analyze documents. Optimize images.</div>
    </div>, size
  );
}
