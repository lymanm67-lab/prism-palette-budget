import { AbsoluteFill, Sequence } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Dashboard } from "./scenes/Scene2Dashboard";
import { Scene3Subscriptions } from "./scenes/Scene3Subscriptions";
import { Scene4Calculators } from "./scenes/Scene4Calculators";
import { Scene5Health } from "./scenes/Scene5Health";
import { Scene6Reports } from "./scenes/Scene6Reports";
import { Scene7Credit } from "./scenes/Scene7Credit";
import { SceneOutro } from "./scenes/SceneOutro";
import { PersistentBackground } from "./components/PersistentBackground";

const T = springTiming({ config: { damping: 200 }, durationInFrames: 20 });

export const MainVideo = () => {
  return (
    <AbsoluteFill>
      <PersistentBackground />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={T} />
        <TransitionSeries.Sequence durationInFrames={100}>
          <Scene2Dashboard />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={T} />
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene3Subscriptions />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={T} />
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene4Calculators />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={T} />
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene5Health />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={T} />
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene6Reports />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={T} />
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene7Credit />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={T} />
        <TransitionSeries.Sequence durationInFrames={150}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
