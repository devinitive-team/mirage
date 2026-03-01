import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, SPRING_CONFIG } from "../lib/constants";

const PDF_COUNT = 5;
const FLY_STAGGER = 5;

export const Scene3_Ingest: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const indexOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const allArrived = frame > PDF_COUNT * FLY_STAGGER + 20;
  const borderBrightness = allArrived
    ? interpolate(
        frame,
        [PDF_COUNT * FLY_STAGGER + 20, PDF_COUNT * FLY_STAGGER + 30],
        [0.2, 0.5],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0.2;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgBase,
        justifyContent: "center",
        alignItems: "center",
        gap: 60,
        flexDirection: "row",
      }}
    >
      {/* PDFs on left */}
      <div style={{ position: "relative", width: 160, height: 220 }}>
        {Array.from({ length: PDF_COUNT }).map((_, i) => {
          const flyProgress = spring({
            frame: frame - 10 - i * FLY_STAGGER,
            fps,
            config: SPRING_CONFIG,
          });
          const x = interpolate(flyProgress, [0, 1], [0, 300]);
          const scale = interpolate(flyProgress, [0, 1], [1, 0.3]);
          const opacity = interpolate(flyProgress, [0, 0.8, 1], [1, 0.5, 0]);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: i * 10,
                left: i * 8,
                width: 100,
                height: 130,
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${COLORS.line}`,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                opacity,
                transform: `translateX(${x}px) scale(${scale})`,
              }}
            >
              {[0.8, 0.6, 0.9, 0.5].map((w, j) => (
                <div
                  key={j}
                  style={{
                    height: 3,
                    width: `${w * 100}%`,
                    background: "rgba(255,255,255,0.12)",
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Relevance Index panel */}
      <div
        style={{
          opacity: indexOpacity,
          width: 240,
          height: 280,
          border: `1px solid rgba(230, 230, 230, ${borderBrightness})`,
          background: COLORS.surfaceStrong,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: COLORS.seaInk,
            letterSpacing: 2,
          }}
        >
          RELEVANCE INDEX
        </span>
        <div
          style={{
            width: 40,
            height: 2,
            background: COLORS.lagoonDeep,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
