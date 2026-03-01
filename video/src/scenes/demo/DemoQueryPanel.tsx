import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../../lib/constants";
import { typewriterCount } from "../../lib/animations";
import { DemoAnswerSection } from "./DemoAnswerSection";
import { DemoEvidenceTile } from "./DemoEvidenceTile";

const QUERY_TEXT =
  "What are the key findings from the Q4 report regarding market expansion?";

const EVIDENCE_TILES = [
  {
    filename: "quarterly-report-Q4.pdf",
    page: 12,
    title: "Q4 Revenue Growth Analysis",
    group: 1,
    offset: 0,
  },
  {
    filename: "quarterly-report-Q4.pdf",
    page: 24,
    title: "APAC Market Entry Results",
    group: 1,
    offset: 10,
  },
  {
    filename: "quarterly-report-Q4.pdf",
    page: 31,
    title: "Customer Acquisition Metrics",
    group: 1,
    offset: 20,
  },
  {
    filename: "market-analysis.pdf",
    page: 8,
    title: "Enterprise Segment Performance",
    group: 2,
    offset: 40,
  },
  {
    filename: "market-analysis.pdf",
    page: 15,
    title: "Regional Partnership Overview",
    group: 2,
    offset: 50,
  },
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

  const group1Opacity = interpolate(
    frame,
    [evidenceStart, evidenceStart + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const group2Opacity = interpolate(
    frame,
    [evidenceStart + 40, evidenceStart + 50],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: 24,
        gap: 20,
        overflow: "hidden",
      }}
    >
      {/* Query input */}
      <div
        style={{
          border: `1px solid ${COLORS.line}`,
          background: COLORS.surface,
          padding: "12px 16px",
          fontSize: 14,
          color: COLORS.seaInk,
          minHeight: 44,
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

      {/* Answer section */}
      {frame >= answerStart && (
        <DemoAnswerSection
          showFrom={answerStart}
          revealFrom={answerRevealStart}
        />
      )}

      {/* Evidence section */}
      {frame >= evidenceStart && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ opacity: group1Opacity }}>
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
              quarterly-report-Q4.pdf
            </div>
          </div>
          {EVIDENCE_TILES.filter((t) => t.group === 1).map((tile) => (
            <DemoEvidenceTile
              key={tile.title}
              filename={tile.filename}
              page={tile.page}
              title={tile.title}
              showFrom={evidenceStart + tile.offset}
            />
          ))}

          <div style={{ opacity: group2Opacity, marginTop: 8 }}>
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
              market-analysis.pdf
            </div>
          </div>
          {EVIDENCE_TILES.filter((t) => t.group === 2).map((tile) => (
            <DemoEvidenceTile
              key={tile.title}
              filename={tile.filename}
              page={tile.page}
              title={tile.title}
              showFrom={evidenceStart + tile.offset}
            />
          ))}
        </div>
      )}
    </div>
  );
};
