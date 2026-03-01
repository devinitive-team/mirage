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
const STAGGER = 8;

const PdfWireframe: React.FC<{ index: number }> = ({ index }) => {
  const rotation = (index - 2) * 2;
  return (
    <div
      style={{
        width: 120,
        height: 160,
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${COLORS.line}`,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        position: "absolute",
        left: index * 12,
        top: index * 12,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {[0.8, 0.6, 0.9, 0.5, 0.7, 0.4].map((w, i) => (
        <div
          key={i}
          style={{
            height: 4,
            width: `${w * 100}%`,
            background: "rgba(255,255,255,0.12)",
          }}
        />
      ))}
    </div>
  );
};

export const Scene2_PdfStack: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideX = interpolate(frame, [50, 75], [0, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgBase,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 200,
          height: 220,
          transform: `translateX(${slideX}px)`,
        }}
      >
        {Array.from({ length: PDF_COUNT }).map((_, i) => {
          const enterProgress = spring({
            frame: frame - i * STAGGER,
            fps,
            config: SPRING_CONFIG,
          });
          const y = interpolate(enterProgress, [0, 1], [-200, 0]);
          return (
            <div
              key={i}
              style={{
                opacity: enterProgress,
                transform: `translateY(${y}px)`,
              }}
            >
              <PdfWireframe index={i} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
