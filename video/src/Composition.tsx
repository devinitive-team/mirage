import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import type { TransitionPresentation } from "@remotion/transitions";
import {
  SCENE_DURATIONS,
  TRANSITION_DURATION,
  SPRING_CONFIG,
} from "./lib/constants";
import { Scene1_MeetMirage } from "./scenes/Scene1_MeetMirage";
import { Scene2_PdfStack } from "./scenes/Scene2_PdfStack";
import { Scene4_ProductDemo } from "./scenes/Scene4_ProductDemo";
import { Scene5_CTA } from "./scenes/Scene5_CTA";

const FadeScaleComponent: React.FC<{
  children: React.ReactNode;
  presentationDirection: "entering" | "exiting";
  presentationProgress: number;
  passedProps: Record<string, unknown>;
}> = ({ children, presentationDirection, presentationProgress }) => {
  const isEntering = presentationDirection === "entering";
  const opacity = isEntering
    ? presentationProgress
    : 1 - presentationProgress;
  const scale = isEntering
    ? interpolate(presentationProgress, [0, 1], [0.96, 1])
    : interpolate(presentationProgress, [0, 1], [1, 0.96]);

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      {children}
    </AbsoluteFill>
  );
};

const fadeScale = (): TransitionPresentation<Record<string, unknown>> => ({
  component: FadeScaleComponent,
  props: {},
});

const timing = springTiming({
  config: SPRING_CONFIG,
  durationInFrames: TRANSITION_DURATION,
});

const TOTAL_FRAMES = 823;
const FPS = 30;
const FADE_IN = FPS * 1; // 1s fade-in
const FADE_OUT = FPS * 2; // 2s fade-out
const BG_VOLUME = 0.18;

const bgMusicVolume = (f: number) => {
  if (f < FADE_IN) {
    return interpolate(f, [0, FADE_IN], [0, BG_VOLUME]);
  }
  if (f > TOTAL_FRAMES - FADE_OUT) {
    return interpolate(
      f,
      [TOTAL_FRAMES - FADE_OUT, TOTAL_FRAMES],
      [BG_VOLUME, 0],
    );
  }
  return BG_VOLUME;
};

export const MyComposition: React.FC = () => {
  return (
    <>
    {/* Start at 12.83s so the drop at 15s lands on Ingest (abs frame 65) */}
    <Audio src={staticFile("background.mp3")} volume={bgMusicVolume} startFrom={385} />
    <TransitionSeries>
      <TransitionSeries.Sequence
        durationInFrames={SCENE_DURATIONS.scene1}
      >
        <Scene1_MeetMirage />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fadeScale()}
        timing={timing}
      />

      <TransitionSeries.Sequence
        durationInFrames={SCENE_DURATIONS.scene2}
      >
        <Scene2_PdfStack />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fadeScale()}
        timing={timing}
      />

      <TransitionSeries.Sequence
        durationInFrames={SCENE_DURATIONS.scene3}
      >
        <Scene4_ProductDemo />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fadeScale()}
        timing={timing}
      />

      <TransitionSeries.Sequence
        durationInFrames={SCENE_DURATIONS.scene4}
      >
        <Scene5_CTA />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    </>
  );
};
