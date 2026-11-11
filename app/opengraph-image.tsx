import { ImageResponse } from "next/og"

export const alt = "Postup: social publishing, made clear"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column", justifyContent: "center", gap: 32, background: "#F3EEE3", color: "#111111", padding: 96 }}>
        <span style={{ color: "#D9541E", fontSize: 32, fontWeight: 700 }}>POSTUP</span>
        <span style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>Plan it once.<br />Publish everywhere.</span>
        <span style={{ color: "#6B6558", fontSize: 28 }}>A calmer social publishing workspace.</span>
      </div>
    ),
    size
  )
}