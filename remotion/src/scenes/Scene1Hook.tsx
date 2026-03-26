import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const Scene1Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1 = spring({ frame, fps, config: { damping: 15, stiffness: 80 } });
  const line2 = spring({ frame: frame - 12, fps, config: { damping: 15, stiffness: 80 } });
  const line3 = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const fadeOut = interpolate(frame, [70, 88], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut, justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div style={{ transform: `translateY(${interpolate(line1, [0, 1], [60, 0])}px)`, opacity: line1 }}>
        <p style={{ fontFamily: "sans-serif", fontSize: 52, color: "rgba(160,180,200,0.8)", fontWeight: 400, textAlign: "center", margin: 0, letterSpacing: 2 }}>
          YOU'RE MAKING MONEY
        </p>
      </div>
      <div style={{ transform: `translateY(${interpolate(line2, [0, 1], [60, 0])}px)`, opacity: line2, marginTop: 20 }}>
        <p style={{ fontFamily: "sans-serif", fontSize: 72, color: "#fff", fontWeight: 800, textAlign: "center", margin: 0 }}>
          But where is it
        </p>
        <p style={{ fontFamily: "sans-serif", fontSize: 72, color: "#F9A825", fontWeight: 800, textAlign: "center", margin: 0 }}>
          all going?
        </p>
      </div>
      <div style={{ opacity: interpolate(line3, [0, 1], [0, 1]), marginTop: 40 }}>
        <div style={{ width: 120, height: 4, backgroundColor: "#2DD4BF", borderRadius: 2 }} />
      </div>
    </AbsoluteFill>
  );
};
