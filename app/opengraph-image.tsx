import { ImageResponse } from "next/og";
import { SITE } from "@/lib/constants";

export const alt = `${SITE.name} — ${SITE.tagline}`;
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
          justifyContent: "center",
          padding: "80px",
          background:
            "radial-gradient(120% 120% at 50% 0%, #fffdf9 0%, #FFF8F0 45%, #fdefe0 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, #7a3f9c, #5b2c6f)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f4c542",
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            R
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: "#2c2c2c" }}>Ratalu</span>
            <span style={{ fontSize: 18, letterSpacing: 6, color: "#e67e22", fontWeight: 700 }}>
              WAFERS
            </span>
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 60 }}>
          <span style={{ fontSize: 84, fontWeight: 800, color: "#2c2c2c", lineHeight: 1 }}>
            Crispy. Natural.
          </span>
          <span
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.1,
              background: "linear-gradient(100deg, #e67e22, #f4c542)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Irresistible.
          </span>
        </div>

        <span style={{ marginTop: 32, fontSize: 30, color: "#5c554f", maxWidth: 800 }}>
          Small-batch purple-yam wafers, kettle-cooked and delivered fresh across India.
        </span>

        <div
          style={{
            marginTop: 44,
            display: "flex",
            gap: 14,
          }}
        >
          {["Original", "Masala", "Peri Peri", "Cheese"].map((f) => (
            <span
              key={f}
              style={{
                fontSize: 22,
                color: "#5b2c6f",
                background: "#f4edf7",
                border: "1px solid #e6d6ee",
                padding: "10px 22px",
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    ),
    size
  );
}
