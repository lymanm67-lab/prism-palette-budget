import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, staticFile, Img } from "remotion";

export const Scene2Dashboard = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 20, stiffness: 150 } });
  const phoneIn = spring({ frame: frame - 15, fps, config: { damping: 18, stiffness: 100 } });
  const drift = Math.sin(frame * 0.04) * 4;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 100 }}>
      <div style={{ opacity: titleIn, transform: `translateY(${interpolate(titleIn, [0, 1], [-40, 0])}px)`, textAlign: "center" }}>
        <p style={{ fontFamily: "sans-serif", fontSize: 54, color: "#2DD4BF", fontWeight: 700, margin: 0, letterSpacing: 1 }}>
          ONE DASHBOARD
        </p>
        <p style={{ fontFamily: "sans-serif", fontSize: 36, color: "rgba(180,200,220,0.7)", fontWeight: 400, margin: "12px 0 0", letterSpacing: 0.5 }}>
          Everything you need to know
        </p>
      </div>
      <div style={{
        marginTop: 50,
        opacity: phoneIn,
        transform: `translateY(${interpolate(phoneIn, [0, 1], [80, 0]) + drift}px) scale(${interpolate(phoneIn, [0, 1], [0.85, 1])})`,
      }}>
        <Img src={staticFile("images/store-ready-1.png")} style={{ width: 700, borderRadius: 24, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }} />
      </div>
    </AbsoluteFill>
  );
};
