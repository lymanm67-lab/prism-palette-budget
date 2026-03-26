import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, staticFile, Img } from "remotion";

export const Scene3Subscriptions = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 20, stiffness: 150 } });
  const phoneIn = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 100 } });
  const counterIn = spring({ frame: frame - 25, fps, config: { damping: 12 } });
  const drift = Math.sin(frame * 0.04) * 3;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 80 }}>
      <div style={{ opacity: titleIn, transform: `translateY(${interpolate(titleIn, [0, 1], [-30, 0])}px)`, textAlign: "center" }}>
        <p style={{ fontFamily: "sans-serif", fontSize: 48, color: "#F9A825", fontWeight: 700, margin: 0 }}>
          FIND HIDDEN WASTE
        </p>
        <p style={{ fontFamily: "sans-serif", fontSize: 32, color: "rgba(180,200,220,0.7)", fontWeight: 400, margin: "8px 0 0" }}>
          Subscriptions you forgot about
        </p>
      </div>
      <div style={{
        marginTop: 30,
        opacity: phoneIn,
        transform: `translateY(${interpolate(phoneIn, [0, 1], [60, 0]) + drift}px)`,
      }}>
        <Img src={staticFile("images/store-ready-3.png")} style={{ width: 680, borderRadius: 24, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }} />
      </div>
      <div style={{
        position: "absolute", bottom: 120, right: 100,
        opacity: counterIn, transform: `scale(${interpolate(counterIn, [0, 1], [0.5, 1])})`,
        backgroundColor: "rgba(249,168,37,0.15)", border: "2px solid #F9A825",
        borderRadius: 16, padding: "16px 28px", textAlign: "center",
      }}>
        <p style={{ fontFamily: "sans-serif", fontSize: 42, color: "#F9A825", fontWeight: 800, margin: 0 }}>$169/mo</p>
        <p style={{ fontFamily: "sans-serif", fontSize: 20, color: "rgba(249,168,37,0.7)", fontWeight: 400, margin: 0 }}>being drained</p>
      </div>
    </AbsoluteFill>
  );
};
