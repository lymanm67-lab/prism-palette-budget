import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const PersistentBackground = () => {
  const frame = useCurrentFrame();
  const hue = interpolate(frame, [0, 750], [210, 230]);
  const drift = Math.sin(frame * 0.008) * 5;
  
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at ${50 + drift}% ${30 + Math.sin(frame * 0.005) * 10}%, hsl(${hue}, 45%, 18%) 0%, hsl(220, 50%, 8%) 70%, hsl(215, 55%, 5%) 100%)`,
      }}
    />
  );
};
