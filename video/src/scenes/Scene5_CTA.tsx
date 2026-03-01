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

export const Scene5_CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProgress = spring({
    frame: frame - 5,
    fps,
    config: SPRING_CONFIG,
  });

  const buttonProgress = spring({
    frame: frame - 15,
    fps,
    config: SPRING_CONFIG,
  });
  const buttonScale = interpolate(buttonProgress, [0, 1], [0.8, 1]);

  const urlProgress = spring({
    frame: frame - 30,
    fps,
    config: SPRING_CONFIG,
  });

  const fadeOut = interpolate(frame, [120, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgBase,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div style={{ opacity: logoProgress }}>
          <MirageLogo size={40} color={COLORS.seaInk} />
        </div>
        <div
          style={{
            opacity: buttonProgress,
            transform: `scale(${buttonScale})`,
            background: "#ffffff",
            color: "#000000",
            fontSize: 20,
            fontWeight: 700,
            padding: "14px 40px",
          }}
        >
          Join the waitlist
        </div>
        <div
          style={{
            opacity: urlProgress,
            fontSize: 16,
            color: COLORS.seaInkSoft,
          }}
        >
          mirage.ai
        </div>
      </div>
    </AbsoluteFill>
  );
};
