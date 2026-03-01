import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../../lib/constants";
import { typewriterCount } from "../../lib/animations";
import { DemoAnswerSection } from "./DemoAnswerSection";
import { DemoEvidenceTile } from "./DemoEvidenceTile";

const QUERY_TEXT =
  "What are the main risk factors identified across all reports?";

const EVIDENCE_TILES = [
  { page: "Page 3", title: "Risk Assessment", offset: 0 },
  { page: "Pages 6-7", title: "Market Position", offset: 8 },
  { page: "Page 9", title: "Financial Overview", offset: 16 },
  { page: "Pages 12-13", title: "IP Analysis", offset: 24 },
  { page: "Page 15", title: "Recommendations", offset: 32 },
];

interface DemoQueryPanelProps {
  typingStart: number;
  answerStart: number;
  answerRevealStart: number;
  evidenceStart: number;
}

export const DemoQueryPanel: React.FC<DemoQueryPanelProps> = ({
  typingStart,
  answerStart,
  answerRevealStart,
  evidenceStart,
}) => {
  const frame = useCurrentFrame();

  const charCount = typewriterCount(
    frame,
    typingStart,
    QUERY_TEXT.length,
    1.0,
  );
  const typedText = QUERY_TEXT.slice(0, charCount);
  const showCursor = frame >= typingStart && charCount < QUERY_TEXT.length;
  const cursorBlink = Math.sin(frame * 0.3) > 0;

  const evidenceHeaderOpacity = interpolate(
    frame,
    [evidenceStart, evidenceStart + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* QUERY EVIDENCE header */}
      <div style={{ padding: "16px 24px 0" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: COLORS.seaInkSoft,
            letterSpacing: 1.5,
            textTransform: "uppercase" as const,
          }}
        >
          Query Evidence
        </div>
        <div
          style={{
            fontSize: 12,
            color: COLORS.seaInkSoft,
            marginTop: 4,
          }}
        >
          Scope: All ready files (5)
        </div>
      </div>

      {/* Query input row */}
      <div style={{ padding: "12px 24px", display: "flex", gap: 8 }}>
        <div
          style={{
            flex: 1,
            border: `1px solid ${COLORS.line}`,
            background: COLORS.surface,
            padding: "10px 16px",
            fontSize: 14,
            color: COLORS.seaInk,
            minHeight: 40,
            display: "flex",
            alignItems: "center",
          }}
        >
          {charCount === 0 && (
            <span style={{ color: COLORS.seaInkSoft }}>
              Ask a question about your documents...
            </span>
          )}
          {charCount > 0 && typedText}
          {showCursor && (
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 18,
                background: COLORS.lagoon,
                marginLeft: 1,
                opacity: cursorBlink ? 1 : 0,
              }}
            />
          )}
        </div>
        {/* Send button */}
        <div
          style={{
            width: 40,
            height: 40,
            border: `1px solid ${COLORS.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 8h12M10 4l4 4-4 4"
              stroke={COLORS.seaInk}
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          padding: "0 24px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          overflow: "hidden",
        }}
      >
        {/* Answer section */}
        {frame >= answerStart && (
          <DemoAnswerSection
            showFrom={answerStart}
            revealFrom={answerRevealStart}
          />
        )}

        {/* Evidence section */}
        {frame >= evidenceStart && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* File group header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: evidenceHeaderOpacity,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <rect
                    x="2"
                    y="1"
                    width="12"
                    height="14"
                    stroke={COLORS.seaInkSoft}
                    strokeWidth="1"
                  />
                  <line
                    x1="5"
                    y1="5"
                    x2="11"
                    y2="5"
                    stroke={COLORS.seaInkSoft}
                    strokeWidth="0.5"
                  />
                  <line
                    x1="5"
                    y1="7.5"
                    x2="9"
                    y2="7.5"
                    stroke={COLORS.seaInkSoft}
                    strokeWidth="0.5"
                  />
                </svg>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: COLORS.seaInk,
                  }}
                >
                  Due-Diligence-Report.pdf
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: COLORS.seaInkSoft,
                  border: `1px solid ${COLORS.line}`,
                  padding: "2px 8px",
                }}
              >
                12 evidence hits
              </span>
            </div>

            {/* Evidence tiles — horizontal grid */}
            <div style={{ display: "flex", gap: 8 }}>
              {EVIDENCE_TILES.map((tile) => (
                <DemoEvidenceTile
                  key={tile.title}
                  page={tile.page}
                  title={tile.title}
                  showFrom={evidenceStart + tile.offset}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
