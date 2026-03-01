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

  // Phase 2 (50-85): Stack slides LEFT, index appears RIGHT
  const slideProgress = spring({
    frame: frame - 50,
    fps,
    config: SPRING_CONFIG,
  });
  const stackX = interpolate(slideProgress, [0, 1], [0, -160]);

  // Index panel entrance
  const indexProgress = spring({
    frame: frame - 55,
    fps,
    config: SPRING_CONFIG,
  });
  const indexScale = interpolate(indexProgress, [0, 1], [0.96, 1]);

  // Phase 3 (90-150): PDFs fly into index
  const FLY_START = 90;
  const FLY_STAGGER = 12;

  // Border brightens when all PDFs arrive
  const lastFlyEnd = FLY_START + (PDF_COUNT - 1) * FLY_STAGGER + 20;
  const borderBrightness = interpolate(
    frame,
    [lastFlyEnd, lastFlyEnd + 15],
    [0.2, 0.5],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgBase,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* PDF Stack — starts centered, slides left */}
      <div
        style={{
          position: "absolute",
          width: 180,
          height: 220,
          transform: `translateX(${stackX}px)`,
        }}
      >
        {Array.from({ length: PDF_COUNT }).map((_, i) => {
          // Phase 1: fall in
          const fallProgress = spring({
            frame: frame - i * 8,
            fps,
            config: SPRING_CONFIG,
          });
          const fallY = interpolate(fallProgress, [0, 1], [-200, 0]);

          // Phase 3: fly into index
          const flyProgress = spring({
            frame: frame - (FLY_START + i * FLY_STAGGER),
            fps,
            config: SPRING_CONFIG,
          });
          const flyX = interpolate(flyProgress, [0, 1], [0, 350]);
          const flyScale = interpolate(flyProgress, [0, 1], [1, 0.3]);
          const flyOpacity = interpolate(
            flyProgress,
            [0, 0.7, 1],
            [1, 0.5, 0],
          );

          return (
            <div
              key={i}
              style={{
                opacity: fallProgress * flyOpacity,
                transform: `translateY(${fallY}px) translateX(${flyX}px) scale(${flyScale})`,
              }}
            >
              <PdfWireframe index={i} />
            </div>
          );
        })}
      </div>

      {/* Relevance Index — fixed right of center */}
      <div
        style={{
          position: "absolute",
          transform: `translateX(160px) scale(${indexScale})`,
          opacity: indexProgress,
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
