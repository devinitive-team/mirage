import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, SPRING_CONFIG } from "../../lib/constants";

const FILES = [
  "Series-B-Termsheet.pdf",
  "Due-Diligence-Report.pdf",
  "IP-Portfolio-Review.pdf",
  "Market-Sizing-2025.pdf",
  "Board-Deck-Q1.pdf",
];

const DROP_STAGGER = 7;
const READY_STAGGER = 5;

interface DemoSidebarProps {
  dropStart: number;
  indexStart: number;
  readyStart: number;
}

export const DemoSidebar: React.FC<DemoSidebarProps> = ({
  dropStart,
  indexStart,
  readyStart,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Drop zone fades out as files land
  const lastDropFrame = dropStart + (FILES.length - 1) * DROP_STAGGER;
  const dropZoneOpacity = interpolate(
    frame,
    [dropStart - 5, lastDropFrame + 10],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // File count — increments as each file drops
  const visibleCount =
    frame >= dropStart
      ? Math.min(
          FILES.length,
          Math.floor((frame - dropStart) / DROP_STAGGER) + 1,
        )
      : 0;

  return (
    <div
      style={{
        width: 250,
        height: "100%",
        borderRight: `1px solid ${COLORS.line}`,
        background: COLORS.surfaceStrong,
        display: "flex",
        flexDirection: "column",
        padding: "16px 12px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: COLORS.seaInkSoft,
          letterSpacing: 1.5,
          marginBottom: 12,
          textTransform: "uppercase" as const,
        }}
      >
        Uploaded Files
      </div>

      {/* Search row */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 16, flexShrink: 0 }}
      >
        <div
          style={{
            flex: 1,
            border: `1px solid ${COLORS.line}`,
            background: COLORS.surface,
            padding: "7px 10px",
            fontSize: 12,
            color: COLORS.seaInkSoft,
          }}
        >
          Search files...
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            border: `1px solid ${COLORS.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: COLORS.seaInkSoft,
            letterSpacing: 3,
          }}
        >
          ···
        </div>
      </div>

      {/* File list */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          flex: 1,
          position: "relative",
        }}
      >
        {/* Drop zone overlay */}
        {dropZoneOpacity > 0.01 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: "1.5px dashed rgba(255,255,255,0.18)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: dropZoneOpacity,
              pointerEvents: "none" as const,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 4v12M8 8l4-4 4 4"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 17v3h16v-3"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
              Drop PDFs here
            </span>
          </div>
        )}

        {/* File items */}
        {FILES.map((file, i) => {
          const fileDropFrame = dropStart + i * DROP_STAGGER;
          const fileReadyFrame = readyStart + i * READY_STAGGER;

          // Drop entrance — spring from the right with slight rotation
          const dropP = spring({
            frame: frame - fileDropFrame,
            fps,
            config: SPRING_CONFIG,
          });
          const dropX = interpolate(dropP, [0, 1], [40, 0]);
          const dropRot = interpolate(dropP, [0, 1], [3, 0]);

          // Status phases
          const isIndexing = frame >= indexStart && frame < fileReadyFrame;
          const isReady = frame >= fileReadyFrame;

          // Ready badge entrance
          const readyP = spring({
            frame: frame - fileReadyFrame,
            fps,
            config: SPRING_CONFIG,
          });
          const readyScale = interpolate(readyP, [0, 1], [0.6, 1]);

          // Indexing dots cycle
          const dotCount = isIndexing
            ? (Math.floor((frame - indexStart) / 8) % 3) + 1
            : 0;

          // Indexing pulse
          const indexAlpha = isIndexing
            ? interpolate(Math.sin(frame * 0.15), [-1, 1], [0.5, 1])
            : 0;

          return (
            <div
              key={file}
              style={{
                opacity: dropP,
                transform: `translateX(${dropX}px) rotate(${dropRot}deg)`,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 4px",
              }}
            >
              {/* Checkbox — filled when ready */}
              {isReady ? (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  style={{
                    flexShrink: 0,
                    opacity: readyP,
                    transform: `scale(${readyScale})`,
                  }}
                >
                  <rect
                    x="0.5"
                    y="0.5"
                    width="14"
                    height="14"
                    fill="rgba(74, 222, 128, 0.12)"
                    stroke="#4ade80"
                    strokeWidth="1"
                  />
                  <path
                    d="M 3.5,7.5 L 6,10.5 L 11.5,4.5"
                    stroke="#4ade80"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <div
                  style={{
                    width: 15,
                    height: 15,
                    border: `1px solid ${COLORS.line}`,
                    flexShrink: 0,
                  }}
                />
              )}

              {/* File icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                style={{ flexShrink: 0 }}
              >
                <rect
                  x="2"
                  y="1"
                  width="12"
                  height="14"
                  fill="none"
                  stroke={COLORS.seaInkSoft}
                  strokeWidth="1"
                />
                <line
                  x1="5"
                  y1="5"
                  x2="11"
                  y2="5"
                  stroke={COLORS.seaInkSoft}
                  strokeWidth="0.7"
                />
                <line
                  x1="5"
                  y1="7.5"
                  x2="9"
                  y2="7.5"
                  stroke={COLORS.seaInkSoft}
                  strokeWidth="0.7"
                />
                <line
                  x1="5"
                  y1="10"
                  x2="10"
                  y2="10"
                  stroke={COLORS.seaInkSoft}
                  strokeWidth="0.7"
                />
              </svg>

              {/* Filename */}
              <span
                style={{
                  fontSize: 13,
                  color: COLORS.seaInk,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap" as const,
                  flex: 1,
                }}
              >
                {file}
              </span>

              {/* Status badge */}
              {isReady ? (
                <span
                  style={{
                    fontSize: 11,
                    color: "#4ade80",
                    fontWeight: 700,
                    flexShrink: 0,
                    transform: `scale(${readyScale})`,
                    display: "inline-block",
                  }}
                >
                  Ready
                </span>
              ) : isIndexing ? (
                <span
                  style={{
                    fontSize: 11,
                    color: "#fbbf24",
                    fontWeight: 700,
                    flexShrink: 0,
                    opacity: indexAlpha,
                  }}
                >
                  Indexing{".".repeat(dotCount)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Bottom */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            textAlign: "center" as const,
            fontSize: 12,
            color: COLORS.seaInkSoft,
          }}
        >
          {visibleCount} file{visibleCount !== 1 ? "s" : ""} total
        </div>
        <div
          style={{
            padding: "10px 12px",
            border: `1px solid ${COLORS.line}`,
            textAlign: "center" as const,
            fontSize: 13,
            color: COLORS.seaInk,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1v8M4 4l3-3 3 3"
              stroke={COLORS.seaInk}
              strokeWidth="1.5"
            />
            <path
              d="M1 10v2h12v-2"
              stroke={COLORS.seaInk}
              strokeWidth="1.5"
            />
          </svg>
          Upload Files
        </div>
      </div>
    </div>
  );
};
