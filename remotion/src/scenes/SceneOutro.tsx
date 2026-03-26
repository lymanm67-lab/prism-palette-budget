import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";

export const SceneOutro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const tagIn = spring({ frame: frame - 20, fps, config: { damping: 20 } });
  const ctaIn = spring({ frame: frame - 40, fps, config: { damping: 15 } });
  const pulse = 1 + Math.sin(frame * 0.08) * 0.02;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Accent glow */}
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(45,212,191,0.15) 0%, transparent 70%)",
        transform: `scale(${pulse})`,
      }} />
      
      <div style={{
        opacity: logoIn,
        transform: `scale(${interpolate(logoIn, [0, 1], [0.5, 1])})`,
        textAlign: "center",
      }}>
        <p style={{ fontFamily: "sans-serif", fontSize: 80, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: -1 }}>
          Prism<span style={{ color: "#2DD4BF" }}>Money</span>
        </p>
      </div>

      <div style={{
        opacity: tagIn,
        transform: `translateY(${interpolate(tagIn, [0, 1], [20, 0])}px)`,
        marginTop: 20, textAlign: "center",
      }}>
        <p style={{ fontFamily: "sans-serif", fontSize: 34, color: "rgba(180,200,220,0.8)", fontWeight: 400, margin: 0, letterSpacing: 2 }}>
          See clearly. Spend confidently.
        </p>
      </div>

      <div style={{
        opacity: ctaIn,
        transform: `translateY(${interpolate(ctaIn, [0, 1], [30, 0])}px)`,
        marginTop: 60,
      }}>
        <div style={{
          background: "linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)",
          borderRadius: 16, padding: "20px 60px",
        }}>
          <p style={{ fontFamily: "sans-serif", fontSize: 28, color: "#0C111D", fontWeight: 700, margin: 0 }}>
            Download Free on App Store
          </p>
        </div>
      </div>

      {/* Accent line */}
      <div style={{
        position: "absolute", bottom: 140, width: 80, height: 4,
        backgroundColor: "#F9A825", borderRadius: 2, opacity: ctaIn,
      }} />

      <div style={{
        position: "absolute", bottom: 80,
        opacity: interpolate(ctaIn, [0, 1], [0, 0.5]),
      }}>
        <p style={{ fontFamily: "sans-serif", fontSize: 18, color: "rgba(160,180,200,0.5)", margin: 0 }}>
          prismmoney.app
        </p>
      </div>
    </AbsoluteFill>
  );
};
