import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../../lib/constants";

const ANSWER_TEXT =
  "The primary risk factors identified across the reports include: market concentration in a single vertical, dependency on three enterprise clients representing 58% of ARR, pending patent litigation in two jurisdictions, and a 14-month runway at current burn rate. The due diligence report recommends addressing customer diversification before closing.";

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

  const revealChars =
    frame >= revealFrom
      ? Math.min(Math.floor((frame - revealFrom) * 4), ANSWER_TEXT.length)
      : 0;

  const visibleText = ANSWER_TEXT.slice(0, revealChars);

  return (
    <div style={{ opacity: cardOpacity }}>
      {isLoading ? (
        <div
          style={{
            border: `1px solid ${COLORS.line}`,
            background: COLORS.surface,
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            maxWidth: 520,
            margin: "20px auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                border: `2px solid ${COLORS.line}`,
                borderTop: `2px solid ${COLORS.seaInk}`,
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: COLORS.seaInk,
                }}
              >
                Waiting for evidence from the backend
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.seaInkSoft,
                  marginTop: 4,
                }}
              >
                Searching uploaded PDFs and preparing highlighted references.
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {[
              { w: "100%", baseAlpha: 0.12, delay: 0 },
              { w: "83%", baseAlpha: 0.10, delay: 4 },
              { w: "66%", baseAlpha: 0.08, delay: 8 },
            ].map((line, i) => {
              // Staggered pulse: sine wave with per-line phase offset
              const pulse = interpolate(
                Math.sin((frame - line.delay) * 0.16),
                [-1, 1],
                [0.4, 1],
              );
              return (
                <div
                  key={i}
                  style={{
                    height: 6,
                    width: line.w,
                    borderRadius: 3,
                    background: COLORS.lagoonDeep,
                    opacity: line.baseAlpha * pulse * (1 / 0.12),
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* ANSWER header card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              border: `1px solid ${COLORS.line}`,
              background: COLORS.surface,
              padding: "12px 16px",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <rect
                x="2"
                y="2"
                width="16"
                height="16"
                stroke={COLORS.seaInkSoft}
                strokeWidth="1"
              />
              <line
                x1="5"
                y1="7"
                x2="15"
                y2="7"
                stroke={COLORS.seaInkSoft}
                strokeWidth="1"
              />
              <line
                x1="5"
                y1="10"
                x2="12"
                y2="10"
                stroke={COLORS.seaInkSoft}
                strokeWidth="1"
              />
              <line
                x1="5"
                y1="13"
                x2="14"
                y2="13"
                stroke={COLORS.seaInkSoft}
                strokeWidth="1"
              />
            </svg>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: COLORS.seaInkSoft,
                  letterSpacing: 1.5,
                  textTransform: "uppercase" as const,
                }}
              >
                Answer
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.seaInkSoft,
                  marginTop: 2,
                }}
              >
                Response generated from the selected evidence scope.
              </div>
            </div>
          </div>

          {/* Answer text */}
          <div
            style={{
              border: `1px solid ${COLORS.line}`,
              padding: "14px 20px",
              fontSize: 14,
              lineHeight: 1.7,
              color: COLORS.seaInk,
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
        </div>
      )}
    </div>
  );
};
