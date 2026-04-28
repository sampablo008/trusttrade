import { ImageResponse } from "next/og";

export const alt = "TrustTrade — Crypto Trading Platform";
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
          padding: "72px 88px",
          background:
            "linear-gradient(135deg, #04070e 0%, #07101d 50%, #04070e 100%)",
          color: "#ecf3ff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -240,
            left: -180,
            width: 640,
            height: 640,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(61,156,255,0.55), transparent 65%)",
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -260,
            right: -220,
            width: 720,
            height: 720,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(27,210,141,0.35), transparent 65%)",
            filter: "blur(70px)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #3d9cff, #1bd28d)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
              color: "#04070e",
            }}
          >
            T
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -0.5 }}>
            TrustTrade
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            Trade crypto. Win up to 85%.
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#93a6c7",
              maxWidth: 920,
              lineHeight: 1.3,
            }}
          >
            Live charts, instant payouts, and a 5-level referral program. Join by invitation.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 24,
            color: "#93a6c7",
          }}
        >
          <span style={{ color: "#3d9cff", fontWeight: 700 }}>trusttrade.pro</span>
          <span>•</span>
          <span>BTC · ETH · SOL · 50+ markets</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
