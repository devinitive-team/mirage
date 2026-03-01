import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, SPRING_CONFIG } from "../../lib/constants";

interface DemoEvidenceTileProps {
  page: string;
  title: string;
  showFrom: number;
}

export const DemoEvidenceTile: React.FC<DemoEvidenceTileProps> = ({
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
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* PDF page wireframe thumbnail */}
      <div
        style={{
          height: 130,
          background: "rgba(255,255,255,0.03)",
          borderBottom: `1px solid ${COLORS.refItemBorder}`,
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {[0.9, 0.7, 0.85, 0.5, 0.8, 0.6, 0.75, 0.45].map((w, i) => (
          <div
            key={i}
            style={{
              height: 2,
              width: `${w * 100}%`,
              background: "rgba(255,255,255,0.08)",
            }}
          />
        ))}
        {/* Highlighted region */}
        <div
          style={{
            height: 3,
            width: "65%",
            background: "rgba(255, 200, 50, 0.15)",
            marginTop: 4,
          }}
        />
        <div
          style={{
            height: 3,
            width: "50%",
            background: "rgba(255, 200, 50, 0.12)",
          }}
        />
        {[0.6, 0.5, 0.7].map((w, i) => (
          <div
            key={`b${i}`}
            style={{
              height: 2,
              width: `${w * 100}%`,
              background: "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>
      {/* Page label + section title */}
      <div style={{ padding: "8px 10px" }}>
        <div style={{ fontSize: 12, color: COLORS.seaInk, fontWeight: 700 }}>
          {page}
        </div>
        <div
          style={{ fontSize: 11, color: COLORS.seaInkSoft, marginTop: 2 }}
        >
          {title}
        </div>
      </div>
    </div>
  );
};
