import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../../lib/constants";

const ANSWER_TEXT = `Based on the Q4 report, the key findings regarding market expansion include:

1. Revenue growth of 23% YoY driven primarily by APAC market entry
2. Three new regional partnerships established in Southeast Asia
3. Customer acquisition cost decreased by 15% through localized marketing
4. Market share in the enterprise segment grew from 12% to 18%

The report highlights that the APAC expansion strategy exceeded initial projections by 40%, with particularly strong performance in the financial services vertical.`;

interface DemoAnswerSectionProps {
  showFrom: number;
  revealFrom: number;
}

export const DemoAnswerSection: React.FC<DemoAnswerSectionProps> = ({
  showFrom,
  revealFrom,
}) => {
  const frame = useCurrentFrame();

  const cardOpacity = interpolate(frame, [showFrom, showFrom + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isLoading = frame >= showFrom && frame < revealFrom;
  const loadingDot = Math.floor((frame - showFrom) / 5) % 3;

  const revealChars =
    frame >= revealFrom
      ? Math.min(Math.floor((frame - revealFrom) * 4), ANSWER_TEXT.length)
      : 0;

  const visibleText = ANSWER_TEXT.slice(0, revealChars);

  return (
    <div
      style={{
        opacity: cardOpacity,
        background: COLORS.surface,
        border: `1px solid ${COLORS.line}`,
        padding: 20,
      }}
    >
      {isLoading ? (
        <div style={{ display: "flex", gap: 4, padding: "8px 0" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                background: i <= loadingDot ? COLORS.seaInk : COLORS.line,
              }}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: COLORS.seaInk,
            whiteSpace: "pre-wrap" as const,
          }}
        >
          {visibleText}
          {revealChars > 0 && revealChars < ANSWER_TEXT.length && (
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 16,
                background: COLORS.lagoon,
                marginLeft: 2,
                opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
