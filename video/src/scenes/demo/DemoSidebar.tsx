import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, SPRING_CONFIG } from "../../lib/constants";

const FILES = [
  "quarterly-report-Q4.pdf",
  "market-analysis.pdf",
  "financial-summary.pdf",
  "competitor-review.pdf",
  "strategy-roadmap.pdf",
];

interface DemoSidebarProps {
  showFrom: number;
}

export const DemoSidebar: React.FC<DemoSidebarProps> = ({ showFrom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        width: 220,
        borderRight: `1px solid ${COLORS.line}`,
        background: COLORS.surfaceStrong,
        display: "flex",
        flexDirection: "column",
        padding: 12,
        gap: 4,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: COLORS.seaInkSoft,
          letterSpacing: 1,
          marginBottom: 8,
          textTransform: "uppercase" as const,
        }}
      >
        Sources
      </div>
      {FILES.map((file, i) => {
        const stagger = showFrom + i * 5;
        const progress = spring({
          frame: frame - stagger,
          fps,
          config: SPRING_CONFIG,
        });
        const x = interpolate(progress, [0, 1], [-20, 0]);
        return (
          <div
            key={file}
            style={{
              opacity: progress,
              transform: `translateX(${x}px)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 8px",
              background: i === 0 ? COLORS.insetGlint : "transparent",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: COLORS.seaInk,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap" as const,
                maxWidth: 140,
              }}
            >
              {file}
            </span>
            <span style={{ fontSize: 10, color: "#4ade80", fontWeight: 700 }}>
              Ready
            </span>
          </div>
        );
      })}
      <div
        style={{
          marginTop: "auto",
          padding: "8px 12px",
          border: `1px solid ${COLORS.line}`,
          textAlign: "center" as const,
          fontSize: 12,
          color: COLORS.seaInkSoft,
        }}
      >
        + Upload PDF
      </div>
    </div>
  );
};
