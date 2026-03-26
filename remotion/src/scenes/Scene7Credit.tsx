import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, staticFile, Img } from "remotion";

export const Scene7Credit = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 20, stiffness: 150 } });
  const phoneIn = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 100 } });
  const drift = Math.sin(frame * 0.04) * 3;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 90 }}>
      <div style={{ opacity: titleIn, transform: `translateY(${interpolate(titleIn, [0, 1], [-30, 0])}px)`, textAlign: "center" }}>
        <p style={{ fontFamily: "sans-serif", fontSize: 48, color: "#F9A825", fontWeight: 700, margin: 0 }}>
          BUILD YOUR CREDIT
        </p>
        <p style={{ fontFamily: "sans-serif", fontSize: 30, color: "rgba(180,200,220,0.7)", fontWeight: 400, margin: "8px 0 0" }}>
          Free Reports • AI Analysis • Metro2™
        </p>
      </div>
      <div style={{
        marginTop: 40,
        opacity: phoneIn,
        transform: `translateY(${interpolate(phoneIn, [0, 1], [70, 0]) + drift}px)`,
      }}>
        <Img src={staticFile("images/store-ready-7.png")} style={{ width: 700, borderRadius: 24, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }} />
      </div>
    </AbsoluteFill>
  );
};
