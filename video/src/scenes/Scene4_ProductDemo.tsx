import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Ubuntu";
import { COLORS, SPRING_CONFIG } from "../lib/constants";
import { AppWindow } from "../components/AppWindow";
import { DemoHeader } from "./demo/DemoHeader";
import { DemoSidebar } from "./demo/DemoSidebar";
import { DemoQueryPanel } from "./demo/DemoQueryPanel";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

// ─── Timeline ───
const DROP_START = 30;
const INDEX_START = 65;
const READY_START = 120;
const TYPING_START = 165;
const ANSWER_START = 255;
const ANSWER_REVEAL = 334;
const EVIDENCE_START = 454;

export const Scene4_ProductDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: UI Reveal (0-25)
  const windowScale = spring({ frame, fps, config: SPRING_CONFIG });
  const windowTransform = interpolate(windowScale, [0, 1], [0.9, 1]);

  const headerOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sidebarOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const panelOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgBase,
        padding: 40,
        fontFamily,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          opacity: windowScale,
          transform: `scale(${windowTransform})`,
        }}
      >
        <AppWindow title="Mirage">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <div style={{ opacity: headerOpacity }}>
              <DemoHeader />
            </div>
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              <div style={{ opacity: sidebarOpacity, alignSelf: "stretch" }}>
                <DemoSidebar
                  dropStart={DROP_START}
                  indexStart={INDEX_START}
                  readyStart={READY_START}
                />
              </div>
              <div style={{ opacity: panelOpacity, flex: 1, display: "flex" }}>
                <DemoQueryPanel
                  typingStart={TYPING_START}
                  answerStart={ANSWER_START}
                  answerRevealStart={ANSWER_REVEAL}
                  evidenceStart={EVIDENCE_START}
                />
              </div>
            </div>
          </div>
        </AppWindow>
      </div>
    </AbsoluteFill>
  );
};
