import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, staticFile, Img } from "remotion";

export const Scene4Calculators = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 20, stiffness: 150 } });
  const phoneIn = spring({ frame: frame - 12, fps, config: { damping: 18, stiffness: 100 } });
  const drift = Math.sin(frame * 0.035) * 4;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 90 }}>
      <div style={{ opacity: titleIn, transform: `translateY(${interpolate(titleIn, [0, 1], [-30, 0])}px)`, textAlign: "center" }}>
        <p style={{ fontFamily: "sans-serif", fontSize: 48, color: "#A855F7", fontWeight: 700, margin: 0 }}>
          SMART CALCULATORS
        </p>
        <p style={{ fontFamily: "sans-serif", fontSize: 30, color: "rgba(180,200,220,0.7)", fontWeight: 400, margin: "8px 0 0" }}>
          Mortgage • Auto • Debt • Safe-to-Spend
        </p>
      </div>
      <div style={{
        marginTop: 40,
        opacity: phoneIn,
        transform: `translateY(${interpolate(phoneIn, [0, 1], [70, 0]) + drift}px) scale(${interpolate(phoneIn, [0, 1], [0.9, 1])})`,
      }}>
        <Img src={staticFile("images/store-ready-4.png")} style={{ width: 700, borderRadius: 24, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }} />
      </div>
    </AbsoluteFill>
  );
};
