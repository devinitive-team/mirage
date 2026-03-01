import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, SPRING_CONFIG } from "../../lib/constants";

interface DemoEvidenceTileProps {
  filename: string;
  page: number;
  title: string;
  showFrom: number;
}

export const DemoEvidenceTile: React.FC<DemoEvidenceTileProps> = ({
  filename,
  page,
  title,
  showFrom,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - showFrom,
    fps,
    config: SPRING_CONFIG,
  });
  const y = interpolate(progress, [0, 1], [20, 0]);

  return (
    <div
      style={{
        opacity: progress,
        transform: `translateY(${y}px)`,
        border: `1px solid ${COLORS.refItemBorder}`,
        background: COLORS.refItemBg,
        padding: 12,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 48,
          height: 60,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${COLORS.refItemPageBorder}`,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          padding: 6,
          gap: 3,
        }}
      >
        {[0.9, 0.7, 0.8, 0.5, 0.6].map((w, i) => (
          <div
            key={i}
            style={{
              height: 2,
              width: `${w * 100}%`,
              background: "rgba(255,255,255,0.1)",
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          flex: 1,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: COLORS.refItemTitle,
            fontWeight: 700,
          }}
        >
          {title}
        </span>
        <span style={{ fontSize: 11, color: COLORS.seaInkSoft }}>
          {filename} — p. {page}
        </span>
      </div>
    </div>
  );
};
