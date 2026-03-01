import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Ubuntu";
import { COLORS, SPRING_CONFIG } from "../lib/constants";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

/* ─── Step definitions ─── */

interface StepDef {
  num: string;
  label: string;
  title: string;
  description: string;
  color: string;
  enter: number;
  exit: number;
}

const STEPS: StepDef[] = [
  {
    num: "01",
    label: "Ingest",
    title: "Ingest documents",
    description:
      "Drop in PDFs and let background processing extract document structure while your team keeps moving.",
    color: "#3B82F6",
    enter: 10,
    exit: 85,
  },
  {
    num: "02",
    label: "Retrieve",
    title: "Build relevance index",
    description:
      "Mirage organizes content by meaning, so questions are matched to relevant sections instead of loose keyword hits.",
    color: "#EF4444",
    enter: 95,
    exit: 175,
  },
  {
    num: "03",
    label: "Verify",
    title: "Return cited answers",
    description:
      "Every answer includes page-linked evidence so reviewers can validate context in seconds.",
    color: "#22C55E",
    enter: 185,
    exit: Infinity,
  },
];

/* ─── Illustration: Ingest (PDF stack) ─── */

const IngestIllustration: React.FC<{
  localFrame: number;
  fps: number;
}> = ({ localFrame, fps }) => {
  const pages = [
    { xOff: 0, yOff: 0, rot: -2 },
    { xOff: 10, yOff: -10, rot: 0.5 },
    { xOff: 20, yOff: -20, rot: -1 },
    { xOff: 30, yOff: -30, rot: 0 },
  ];

  return (
    <div style={{ position: "relative", width: 220, height: 220 }}>
      {/* Background grid */}
      <svg
        width={220}
        height={220}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {[40, 80, 120, 160].map((pos) => (
          <React.Fragment key={pos}>
            <line
              x1={pos}
              y1={20}
              x2={pos}
              y2={200}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
            />
            <line
              x1={20}
              y1={pos}
              x2={200}
              y2={pos}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
            />
          </React.Fragment>
        ))}
      </svg>

      {/* PDF cards dropping in */}
      {pages.map((page, i) => {
        const dropProgress = spring({
          frame: localFrame - i * 6,
          fps,
          config: SPRING_CONFIG,
        });
        const dropY = interpolate(dropProgress, [0, 1], [-80, 0]);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 40 + page.xOff,
              top: 50 + page.yOff,
              width: 100,
              height: 130,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${COLORS.line}`,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 5,
              opacity: dropProgress,
              transform: `translateY(${dropY}px) rotate(${page.rot}deg)`,
            }}
          >
            {i === pages.length - 1 && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.2)",
                  letterSpacing: 1.5,
                  marginBottom: 2,
                }}
              >
                PDF
              </span>
            )}
            {[0.8, 0.6, 0.9, 0.5, 0.7].map((w, j) => (
              <div
                key={j}
                style={{
                  height: 2.5,
                  width: `${w * 100}%`,
                  background: "rgba(255,255,255,0.08)",
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

/* ─── Illustration: Relevance index (graph network) ─── */

const IndexIllustration: React.FC<{
  localFrame: number;
  fps: number;
}> = ({ localFrame, fps }) => {
  const nodes: { x: number; y: number; size: number; label: string | null }[] =
    [
      { x: 110, y: 110, size: 5, label: null },
      { x: 50, y: 55, size: 3, label: null },
      { x: 170, y: 50, size: 3, label: "0.92" },
      { x: 35, y: 150, size: 3, label: null },
      { x: 175, y: 140, size: 3, label: "0.87" },
      { x: 75, y: 180, size: 3, label: null },
      { x: 150, y: 185, size: 3, label: "0.73" },
      { x: 60, y: 100, size: 2.5, label: null },
      { x: 160, y: 95, size: 2.5, label: null },
    ];

  const connections = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [0, 6],
    [1, 7],
    [2, 8],
    [3, 5],
    [4, 6],
    [7, 0],
    [8, 0],
  ];

  // Dashed cube wireframe
  const cubeLines = [
    { x1: 55, y1: 45, x2: 165, y2: 45 },
    { x1: 165, y1: 45, x2: 165, y2: 175 },
    { x1: 165, y1: 175, x2: 55, y2: 175 },
    { x1: 55, y1: 175, x2: 55, y2: 45 },
    { x1: 75, y1: 30, x2: 185, y2: 30 },
    { x1: 185, y1: 30, x2: 185, y2: 160 },
    { x1: 185, y1: 160, x2: 75, y2: 160 },
    { x1: 75, y1: 160, x2: 75, y2: 30 },
    { x1: 55, y1: 45, x2: 75, y2: 30 },
    { x1: 165, y1: 45, x2: 185, y2: 30 },
    { x1: 165, y1: 175, x2: 185, y2: 160 },
    { x1: 55, y1: 175, x2: 75, y2: 160 },
  ];

  return (
    <div style={{ position: "relative", width: 220, height: 220 }}>
      <svg width={220} height={220} viewBox="0 0 220 220">
        {/* Dashed cube */}
        {cubeLines.map((line, i) => {
          const p = spring({
            frame: localFrame - 2 - i * 1.5,
            fps,
            config: SPRING_CONFIG,
          });
          return (
            <line
              key={`c${i}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x1 + (line.x2 - line.x1) * p}
              y2={line.y1 + (line.y2 - line.y1) * p}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Connections */}
        {connections.map(([from, to], i) => {
          const p = spring({
            frame: localFrame - 8 - i * 2,
            fps,
            config: SPRING_CONFIG,
          });
          return (
            <line
              key={`l${i}`}
              x1={nodes[from].x}
              y1={nodes[from].y}
              x2={nodes[from].x + (nodes[to].x - nodes[from].x) * p}
              y2={nodes[from].y + (nodes[to].y - nodes[from].y) * p}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const p = spring({
            frame: localFrame - i * 3,
            fps,
            config: SPRING_CONFIG,
          });
          return (
            <g key={`n${i}`} opacity={p}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.size * p}
                fill={
                  i === 0
                    ? "rgba(255,255,255,0.8)"
                    : "rgba(255,255,255,0.4)"
                }
              />
              {node.label && (
                <text
                  x={node.x + 8}
                  y={node.y - 8}
                  fill="rgba(255,255,255,0.25)"
                  fontSize={8}
                  fontFamily={fontFamily}
                >
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ─── Illustration: Cited answers ─── */

const VerifyIllustration: React.FC<{
  localFrame: number;
  fps: number;
}> = ({ localFrame, fps }) => {
  const cardProgress = spring({
    frame: localFrame,
    fps,
    config: SPRING_CONFIG,
  });

  const citations = [
    { label: "src_01", x: 15, y: 155 },
    { label: "src_02", x: 85, y: 170 },
    { label: "doc_03", x: 150, y: 155 },
  ];

  return (
    <div style={{ position: "relative", width: 220, height: 220 }}>
      {/* Corner brackets */}
      <svg
        width={220}
        height={220}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {[
          "M 15,15 L 15,35",
          "M 15,15 L 35,15",
          "M 205,15 L 205,35",
          "M 205,15 L 185,15",
          "M 15,205 L 15,185",
          "M 15,205 L 35,205",
          "M 205,205 L 205,185",
          "M 205,205 L 185,205",
        ].map((d, i) => (
          <path
            key={i}
            d={d}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
            fill="none"
          />
        ))}
        <text
          x={35}
          y={28}
          fill="rgba(255,255,255,0.12)"
          fontSize={8}
          fontFamily={fontFamily}
        >
          GENERATED_RESPONSE
        </text>
      </svg>

      {/* Answer card */}
      <div
        style={{
          position: "absolute",
          top: 35,
          left: 25,
          width: 170,
          height: 90,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${COLORS.line}`,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          opacity: cardProgress,
          transform: `scale(${interpolate(cardProgress, [0, 1], [0.95, 1])})`,
        }}
      >
        {[0.95, 0.75, 0.85, 0.6, 0.4].map((w, j) => {
          const lineP = spring({
            frame: localFrame - 3 - j * 2,
            fps,
            config: SPRING_CONFIG,
          });
          return (
            <div
              key={j}
              style={{
                height: 2.5,
                width: `${w * lineP * 100}%`,
                background:
                  j === 0
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(255,255,255,0.08)",
              }}
            />
          );
        })}
      </div>

      {/* Dashed lines from card to citations */}
      <svg
        width={220}
        height={220}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      >
        {citations.map((cit, i) => {
          const p = spring({
            frame: localFrame - 15 - i * 4,
            fps,
            config: SPRING_CONFIG,
          });
          const sx = 110;
          const sy = 125;
          return (
            <line
              key={i}
              x1={sx}
              y1={sy}
              x2={sx + (cit.x + 25 - sx) * p}
              y2={sy + (cit.y - sy) * p}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={p}
            />
          );
        })}
      </svg>

      {/* Citation badges */}
      {citations.map((cit, i) => {
        const p = spring({
          frame: localFrame - 12 - i * 4,
          fps,
          config: SPRING_CONFIG,
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: cit.y,
              left: cit.x,
              padding: "4px 8px",
              border: `1px solid ${COLORS.line}`,
              background: "rgba(255,255,255,0.03)",
              fontSize: 9,
              fontFamily,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: 0.5,
              opacity: p,
              transform: `translateY(${interpolate(p, [0, 1], [8, 0])}px)`,
            }}
          >
            {cit.label}
          </div>
        );
      })}
    </div>
  );
};

/* ─── Main Scene ─── */

const ILLUSTRATIONS = [
  IngestIllustration,
  IndexIllustration,
  VerifyIllustration,
];

export const Scene2_PdfStack: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgBase, fontFamily }}>
      {STEPS.map((step, i) => {
        const Illustration = ILLUSTRATIONS[i];

        // Spring entrance
        const enterProgress = spring({
          frame: frame - step.enter,
          fps,
          config: SPRING_CONFIG,
        });

        // Linear exit (skip for last step)
        const exitProgress =
          step.exit === Infinity
            ? 1
            : interpolate(frame, [step.exit, step.exit + 15], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

        const opacity = enterProgress * exitProgress;
        if (opacity < 0.01) return null;

        // Alternate layout: steps 0,2 illustration LEFT; step 1 illustration RIGHT
        const illustLeft = i !== 1;
        const slideX = interpolate(
          enterProgress,
          [0, 1],
          [illustLeft ? -20 : 20, 0],
        );

        const localFrame = frame - step.enter;

        const isLast = i === 2;

        const illustrationEl = (
          <div
            style={{
              width: isLast ? 310 : 260,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              transform: isLast ? "scale(1.3)" : undefined,
            }}
          >
            <Illustration localFrame={localFrame} fps={fps} />
          </div>
        );

        const textEl = (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: isLast ? 16 : 14,
              maxWidth: isLast ? 480 : 420,
            }}
          >
            {/* Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                opacity: interpolate(enterProgress, [0, 0.5, 1], [0, 0.5, 1]),
              }}
            >
              <div
                style={{
                  width: isLast ? 12 : 10,
                  height: isLast ? 12 : 10,
                  backgroundColor: step.color,
                }}
              />
              <span
                style={{
                  fontSize: isLast ? 15 : 13,
                  color: COLORS.seaInkSoft,
                  letterSpacing: 1.5,
                }}
              >
                {step.num} · {step.label}
              </span>
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: isLast ? 34 : 28,
                fontWeight: 700,
                color: COLORS.seaInk,
                margin: 0,
                lineHeight: 1.2,
                opacity: interpolate(enterProgress, [0.1, 0.6], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `translateY(${interpolate(
                  enterProgress,
                  [0.1, 0.6],
                  [12, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                )}px)`,
              }}
            >
              {step.title}
            </h2>

            {/* Description */}
            <p
              style={{
                fontSize: isLast ? 18 : 15,
                lineHeight: 1.6,
                color: COLORS.seaInkSoft,
                margin: 0,
                opacity: interpolate(enterProgress, [0.2, 0.7], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `translateY(${interpolate(
                  enterProgress,
                  [0.2, 0.7],
                  [12, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                )}px)`,
              }}
            >
              {step.description}
            </p>
          </div>
        );

        return (
          <AbsoluteFill
            key={i}
            style={{
              opacity,
              justifyContent: "center",
              alignItems: "center",
              transform: `translateX(${slideX}px)`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 70,
              }}
            >
              {illustLeft ? (
                <>
                  {illustrationEl}
                  {textEl}
                </>
              ) : (
                <>
                  {textEl}
                  {illustrationEl}
                </>
              )}
            </div>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
