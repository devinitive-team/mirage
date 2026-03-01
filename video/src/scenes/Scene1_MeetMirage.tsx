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
import { MirageLogo } from "../components/MirageLogo";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

export const Scene1_MeetMirage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const meetProgress = spring({
    frame: frame - 5,
    fps,
    config: SPRING_CONFIG,
  });
  const meetY = interpolate(meetProgress, [0, 1], [30, 0]);

  const mirageProgress = spring({
    frame: frame - 10,
    fps,
    config: SPRING_CONFIG,
  });
  const mirageY = interpolate(mirageProgress, [0, 1], [30, 0]);

  const logoProgress = spring({
    frame: frame - 15,
    fps,
    config: SPRING_CONFIG,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgBase,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div style={{ opacity: logoProgress }}>
          <MirageLogo size={48} color={COLORS.seaInk} />
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: COLORS.seaInk,
              opacity: meetProgress,
              transform: `translateY(${meetY}px)`,
            }}
          >
            Meet
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: COLORS.seaInk,
              opacity: mirageProgress,
              transform: `translateY(${mirageY}px)`,
            }}
          >
            Mirage
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
