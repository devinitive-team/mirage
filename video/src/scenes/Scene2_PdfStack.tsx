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

/* ─── Illustration: Relevance index (isometric layers) ─── */

// Inline style constants matching the marketing wireframe aesthetic
const IX = {
  bgAxis: {
    stroke: "rgba(255,255,255,0.2)",
    strokeWidth: 0.5,
    strokeDasharray: "2 8",
    fill: "none",
  },
  planeEdge: {
    fill: "none",
    stroke: "rgba(255,255,255,0.4)",
    strokeWidth: 1,
    strokeLinejoin: "round" as const,
  },
  planeFill: { fill: "rgba(255,255,255,0.02)" },
  gridLine: {
    fill: "none",
    stroke: "rgba(255,255,255,0.3)",
    strokeWidth: 0.5,
    strokeDasharray: "4 4",
  },
  solidLink: {
    fill: "none",
    stroke: "rgba(255,255,255,0.9)",
    strokeWidth: 1.25,
    strokeLinecap: "round" as const,
  },
  dashedLink: {
    fill: "none",
    stroke: "rgba(255,255,255,0.7)",
    strokeWidth: 1,
    strokeDasharray: "3 4",
  },
  proj: {
    fill: "none",
    stroke: "rgba(255,255,255,0.5)",
    strokeWidth: 0.5,
    strokeDasharray: "1 3",
  },
  node: {
    fill: COLORS.bgBase,
    stroke: "rgba(255,255,255,0.8)",
    strokeWidth: 1.5,
  },
  nodeInner: { fill: "rgba(255,255,255,0.8)" },
  techText: {
    fontFamily: "monospace",
    fontSize: 8,
    fill: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
  },
} as const;

const IndexIllustration: React.FC<{
  localFrame: number;
  fps: number;
}> = ({ localFrame, fps }) => {
  const sp = (delay: number) =>
    spring({ frame: localFrame - delay, fps, config: SPRING_CONFIG });

  // Staggered layer entrance (bottom → top)
  const axisP = sp(0);
  const l3P = sp(3);
  const l2P = sp(7);
  const l1P = sp(11);
  const linksP = sp(14);
  const markersP = sp(16);

  const lift = (p: number) => interpolate(p, [0, 1], [12, 0]);

  return (
    <div style={{ position: "relative", width: 220, height: 220 }}>
      <svg width={220} height={220} viewBox="0 0 500 500">
        {/* Background axes */}
        <g opacity={axisP}>
          <path d="M 250,0 L 250,500" style={IX.bgAxis} />
          <path d="M 0,125 L 500,375" style={IX.bgAxis} />
          <path d="M 0,375 L 500,125" style={IX.bgAxis} />
        </g>

        {/* Projection lines */}
        <g opacity={axisP * 0.8}>
          <path d="M 110,160 L 110,320" style={IX.proj} />
          <path d="M 390,160 L 390,320" style={IX.proj} />
          <path d="M 250,90 L 250,250" style={IX.proj} />
          <path d="M 250,230 L 250,390" style={IX.proj} />
        </g>

        {/* L3: DATA_INDEX (bottom plane) */}
        <g
          opacity={l3P}
          transform={`translate(0, ${lift(l3P)})`}
        >
          <polygon
            points="250,250 390,320 250,390 110,320"
            style={IX.planeFill}
          />
          <polygon
            points="250,250 390,320 250,390 110,320"
            style={IX.planeEdge}
          />
          <path d="M 156.6,273.3 L 296.6,203.3" style={IX.gridLine} />
          <path d="M 203.3,296.6 L 343.3,226.6" style={IX.gridLine} />
          <path d="M 156.6,343.3 L 296.6,273.3" style={IX.gridLine} />
          <path d="M 203.3,366.6 L 343.3,296.6" style={IX.gridLine} />
          <circle cx={180} cy={330} r={3} style={IX.node} />
          <circle cx={273} cy={285} r={3} style={IX.node} />
          <circle cx={320} cy={330} r={3} style={IX.node} />
          <text
            x={360}
            y={380}
            style={IX.techText}
            transform="matrix(0.866, 0.5, -0.866, 0.5, 230, -50)"
          >
            L3: DATA_INDEX
          </text>
        </g>

        {/* L2: EMBEDDING_SPACE (middle plane) */}
        <g
          opacity={l2P}
          transform={`translate(0, ${lift(l2P)})`}
        >
          <polygon
            points="250,170 390,240 250,310 110,240"
            style={IX.planeFill}
          />
          <polygon
            points="250,170 390,240 250,310 110,240"
            style={IX.planeEdge}
          />
          <path d="M 138,226 L 278,156" style={IX.gridLine} />
          <path d="M 166,240 L 306,170" style={IX.gridLine} />
          <path d="M 194,254 L 334,184" style={IX.gridLine} />
          <path d="M 222,268 L 362,198" style={IX.gridLine} />
          <path d="M 138,254 L 278,324" style={IX.gridLine} />
          <path d="M 166,240 L 306,310" style={IX.gridLine} />
          <path d="M 194,226 L 334,296" style={IX.gridLine} />
          <path d="M 222,212 L 362,282" style={IX.gridLine} />
          <ellipse
            cx={250}
            cy={240}
            rx={60}
            ry={30}
            style={{ ...IX.gridLine, strokeDasharray: "2 4", opacity: 0.6 }}
          />
          <circle cx={210} cy={220} r={4} style={IX.node} />
          <circle cx={250} cy={240} r={2.5} style={IX.node} />
          <circle cx={290} cy={260} r={4} style={IX.node} />
          <circle cx={300} cy={215} r={3} style={IX.node} />
          <path d="M 215,220 L 235,220" style={IX.proj} />
          <text x={240} y={222} style={IX.techText}>
            [0.82, -0.14, ...]
          </text>
          <text
            x={360}
            y={300}
            style={IX.techText}
            transform="matrix(0.866, 0.5, -0.866, 0.5, 230, -130)"
          >
            L2: EMBEDDING_SPACE
          </text>
        </g>

        {/* L1: QUERY_VECTOR (top plane) */}
        <g
          opacity={l1P}
          transform={`translate(0, ${lift(l1P)})`}
        >
          <polygon
            points="250,90 390,160 250,230 110,160"
            style={IX.planeFill}
          />
          <polygon
            points="250,90 390,160 250,230 110,160"
            style={IX.planeEdge}
          />
          <path
            d="M 180,125 L 320,195"
            style={{ ...IX.gridLine, opacity: 0.5 }}
          />
          <path
            d="M 180,195 L 320,125"
            style={{ ...IX.gridLine, opacity: 0.5 }}
          />
          <circle cx={250} cy={160} r={8} style={IX.node} />
          <circle cx={250} cy={160} r={3} style={IX.nodeInner} />
          <path d="M 250,70 L 250,140" style={IX.solidLink} />
          <polyline points="245,130 250,142 255,130" style={IX.solidLink} />
          <text
            x={360}
            y={220}
            style={IX.techText}
            transform="matrix(0.866, 0.5, -0.866, 0.5, 230, -210)"
          >
            L1: QUERY_VECTOR
          </text>
        </g>

        {/* Semantic links between layers */}
        <g opacity={linksP}>
          <path d="M 250,160 L 210,220" style={IX.solidLink} />
          <path d="M 250,160 L 290,260" style={IX.solidLink} />
          <path d="M 250,160 L 300,215" style={IX.solidLink} />
          <path
            d="M 210,220 Q 250,260 290,260"
            style={{ ...IX.dashedLink, strokeDasharray: "2 4" }}
          />
          <path d="M 250,240 L 290,260" style={IX.dashedLink} />
          <path d="M 210,220 L 180,330" style={IX.dashedLink} />
          <path d="M 290,260 L 273,285" style={IX.dashedLink} />
          <path d="M 290,260 L 320,330" style={IX.dashedLink} />
        </g>

        {/* Cross-hair markers */}
        <g
          opacity={markersP}
          style={{
            fill: "none",
            stroke: "rgba(255,255,255,0.4)",
            strokeWidth: 0.75,
          }}
        >
          <path d="M 105,160 L 115,160 M 110,155 L 110,165" />
          <path d="M 385,160 L 395,160 M 390,155 L 390,165" />
          <path d="M 105,240 L 115,240 M 110,235 L 110,245" />
          <path d="M 385,240 L 395,240 M 390,235 L 390,245" />
          <path d="M 105,320 L 115,320 M 110,315 L 110,325" />
          <path d="M 385,320 L 395,320 M 390,315 L 390,325" />
        </g>
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
