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
    enter: 8,
    exit: 68,
  },
  {
    num: "02",
    label: "Retrieve",
    title: "Build relevance index",
    description:
      "Mirage organizes content by meaning, so questions are matched to relevant sections instead of loose keyword hits.",
    color: "#EF4444",
    enter: 76,
    exit: 141,
  },
  {
    num: "03",
    label: "Verify",
    title: "Return cited answers",
    description:
      "Every answer includes page-linked evidence so reviewers can validate context in seconds.",
    color: "#22C55E",
    enter: 149,
    exit: Infinity,
  },
];

/* ─── Illustration: Ingest (PDF stack) ─── */

// Inline style constants for the Ingest wireframe
const IG = {
  bgGrid: {
    stroke: "rgba(255,255,255,0.15)",
    strokeWidth: 0.5,
    strokeDasharray: "2 6",
    fill: "none",
  },
  axes: {
    stroke: "rgba(255,255,255,0.35)",
    strokeWidth: 0.75,
    strokeDasharray: "4 4",
    fill: "none",
  },
  wireframe: {
    fill: "none",
    stroke: "rgba(255,255,255,0.8)",
    strokeWidth: 1.5,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  },
  details: {
    fill: "none",
    stroke: "rgba(255,255,255,0.6)",
    strokeWidth: 0.75,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  },
  highlight: {
    fill: "none",
    stroke: "rgba(255,255,255,0.8)",
    strokeWidth: 1.75,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  },
  nodes: {
    fill: "none",
    stroke: "rgba(255,255,255,0.8)",
    strokeWidth: 1,
  },
} as const;

const IngestIllustration: React.FC<{
  localFrame: number;
  fps: number;
}> = ({ localFrame, fps }) => {
  const sp = (delay: number) =>
    spring({ frame: localFrame - delay, fps, config: SPRING_CONFIG });

  const gridP = sp(0);
  const axesP = sp(2);
  const stackP = sp(5);
  const pageP = sp(8);
  const textP = sp(11);
  const nodesP = sp(13);
  const bracketP = sp(15);

  const lift = (p: number) => interpolate(p, [0, 1], [10, 0]);

  return (
    <div style={{ position: "relative", width: 220, height: 220 }}>
      <svg width={220} height={220} viewBox="0 0 400 400">
        {/* Background grid */}
        <g opacity={gridP} style={IG.bgGrid}>
          <path d="M 0,200 L 400,0 M 0,250 L 400,50 M 0,300 L 400,100 M 0,350 L 400,150 M 0,400 L 400,200" />
          <path d="M 400,200 L 0,0 M 400,250 L 0,50 M 400,300 L 0,100 M 400,350 L 0,150 M 400,400 L 0,200" />
          <path d="M 100,0 L 100,400 M 200,0 L 200,400 M 300,0 L 300,400" />
        </g>

        {/* Axes / scaffold */}
        <g opacity={axesP} style={IG.axes}>
          <path d="M 200,320 L 300,270 L 210,225 L 110,275 Z" />
          <path d="M 200,280 L 200,320 M 300,230 L 300,270 M 110,235 L 110,275 M 210,155 L 210,225" />
          <path d="M 200,280 L 350,205" />
          <path d="M 200,280 L 50,205" />
          <path d="M 200,280 L 200,60" />
        </g>

        {/* Page stack edges */}
        <g
          opacity={stackP}
          transform={`translate(0, ${lift(stackP)})`}
          style={IG.wireframe}
        >
          <path d="M 110,205 L 110,235" />
          <path d="M 200,250 L 200,280" />
          <path d="M 300,200 L 300,230" />
          <path d="M 110,235 L 200,280 L 300,230" />
          <path d="M 110,229 L 200,274 L 300,224" />
          <path d="M 110,223 L 200,268 L 300,218" />
          <path d="M 110,217 L 200,262 L 300,212" />
          <path d="M 110,211 L 200,256 L 300,206" />
        </g>

        {/* Top page surface */}
        <g
          opacity={pageP}
          transform={`translate(0, ${lift(pageP)})`}
          style={IG.wireframe}
        >
          <path d="M 200,250 L 300,200 L 228,164 L 190,165 L 110,205 Z" />
          <path d="M 190,165 L 208,174 L 228,164" />
          <path
            d="M 190,165 L 228,164"
            style={{ ...IG.details, strokeDasharray: "2 2" }}
          />
        </g>

        {/* Highlighted text lines on page */}
        <g
          opacity={textP}
          transform={`translate(0, ${lift(textP)})`}
          style={IG.highlight}
        >
          <path d="M 138,209 L 165,222.5" />
          <path d="M 138,209 L 158,199 L 171.5,205.75 L 151.5,215.75" />
          <path d="M 168,194 L 195,207.5" />
          <path d="M 168,194 L 183,186.5 L 201.5,190.75 L 210,200 L 195,207.5" />
          <path d="M 198,179 L 225,192.5" />
          <path d="M 198,179 L 218,169" />
          <path d="M 211.5,185.75 L 226.5,178.25" />
        </g>

        {/* Detail lines */}
        <g
          opacity={textP}
          transform={`translate(0, ${lift(textP)})`}
          style={IG.details}
        >
          <path d="M 178.5,229.25 L 238.5,199.25" />
          <path d="M 187.5,233.75 L 257.5,198.75" />
          <path d="M 196.5,238.25 L 246.5,213.25" />
        </g>

        {/* Nodes */}
        <g opacity={nodesP} style={IG.nodes}>
          <circle cx={200} cy={250} r={2.5} />
          <circle cx={300} cy={200} r={2.5} />
          <circle cx={110} cy={205} r={2.5} />
          <circle cx={190} cy={165} r={2.5} />
          <circle cx={228} cy={164} r={2.5} />
          <circle cx={208} cy={174} r={2.5} />
          <circle cx={200} cy={280} r={2.5} />
          <circle cx={300} cy={230} r={2.5} />
          <circle cx={110} cy={235} r={2.5} />
          <circle cx={138} cy={209} r={1.5} />
          <circle cx={168} cy={194} r={1.5} />
          <circle cx={198} cy={179} r={1.5} />
        </g>

        {/* Measurement bracket */}
        <g opacity={bracketP} style={IG.details}>
          <path d="M 110,205 L 85,192.5" />
          <path d="M 110,235 L 85,222.5" />
          <path d="M 90,195 L 90,225" strokeWidth={1} />
          <path d="M 86,195 L 94,195" strokeWidth={1.5} />
          <path d="M 86,225 L 94,225" strokeWidth={1.5} />
        </g>
      </svg>
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

/* ─── Illustration: Cited answers (isometric response + sources) ─── */

// Inline style constants for the Verify wireframe
const VF = {
  frame: {
    stroke: "rgba(255,255,255,0.3)",
    strokeWidth: 0.5,
    fill: "none",
  },
  bgGrid: {
    stroke: "rgba(255,255,255,0.2)",
    strokeWidth: 0.5,
    strokeDasharray: "2 6",
    fill: "none",
  },
  surface: { fill: "rgba(255,255,255,0.03)" },
  outline: {
    fill: "none",
    stroke: "rgba(255,255,255,0.8)",
    strokeWidth: 1.5,
    strokeLinejoin: "round" as const,
  },
  outlineThin: {
    fill: "none",
    stroke: "rgba(255,255,255,0.8)",
    strokeWidth: 0.75,
    strokeLinejoin: "round" as const,
  },
  docText: {
    fill: "none",
    stroke: "rgba(255,255,255,0.8)",
    strokeWidth: 1.25,
    strokeLinecap: "round" as const,
    opacity: 0.8,
  },
  linkPath: {
    fill: "none",
    stroke: "rgba(255,255,255,0.7)",
    strokeWidth: 1,
    strokeDasharray: "4 4",
  },
  linkSolid: {
    fill: "none",
    stroke: "rgba(255,255,255,0.7)",
    strokeWidth: 1,
  },
  nodeOuter: {
    fill: COLORS.bgBase,
    stroke: "rgba(255,255,255,0.8)",
    strokeWidth: 1,
  },
  nodeInner: { fill: "rgba(255,255,255,0.8)" },
  techText: {
    fontFamily: "monospace",
    fontSize: 9,
    fill: "rgba(255,255,255,0.75)",
    letterSpacing: "0.1em",
  },
  citeText: {
    fontFamily: "monospace",
    fontSize: 7,
    fill: "rgba(255,255,255,0.8)",
    fontWeight: 700,
  },
} as const;

const VerifyIllustration: React.FC<{
  localFrame: number;
  fps: number;
}> = ({ localFrame, fps }) => {
  const sp = (delay: number) =>
    spring({ frame: localFrame - delay, fps, config: SPRING_CONFIG });

  const frameP = sp(0);
  const gridP = sp(2);
  const cardP = sp(4);
  const textP = sp(7);
  const citesP = sp(10);
  const linksP = sp(12);
  const srcP = [sp(14), sp(16), sp(18)];
  const labelsP = sp(19);

  const lift = (p: number) => interpolate(p, [0, 1], [10, 0]);

  return (
    <div style={{ position: "relative", width: 220, height: 220 }}>
      <svg width={220} height={220} viewBox="0 0 500 500">
        {/* Corner frame */}
        <g opacity={frameP} style={VF.frame}>
          <path d="M 40,60 L 40,40 L 60,40 M 460,60 L 460,40 L 440,40" />
          <path d="M 40,440 L 40,460 L 60,460 M 460,440 L 460,460 L 440,460" />
          <path d="M 250,20 L 250,40 M 250,460 L 250,480" />
          <path d="M 20,250 L 40,250 M 460,250 L 480,250" />
        </g>

        {/* Background grid */}
        <g opacity={gridP} style={VF.bgGrid}>
          <polygon points="250,210 370,270 250,330 130,270" />
          <path d="M 250,50 L 250,210 M 370,110 L 370,270 M 130,110 L 130,270" />
        </g>

        {/* Source documents (SRC_01, SRC_02, SRC_03) */}
        {[
          {
            pts: "170,230 210,250 170,270 130,250",
            sides: "M 130,250 L 130,265 M 170,270 L 170,285 M 210,250 L 210,265",
            bottom: "M 130,265 L 170,285 L 210,265",
            inner: "M 130,255 L 170,275 L 210,255 M 130,260 L 170,280 L 210,260",
            diamond: "170,245 180,250 170,255 160,250",
            label: "SRC_01",
            lx: 95,
            ly: 295,
            hookD: "M 130,285 L 130,292 L 125,292",
          },
          {
            pts: "330,230 370,250 330,270 290,250",
            sides: "M 290,250 L 290,265 M 330,270 L 330,285 M 370,250 L 370,265",
            bottom: "M 290,265 L 330,285 L 370,265",
            inner: "M 290,255 L 330,275 L 370,255 M 290,260 L 330,280 L 370,260",
            diamond: "330,245 340,250 330,255 320,250",
            label: "SRC_02",
            lx: 365,
            ly: 295,
            hookD: "M 370,285 L 370,292 L 360,292",
          },
          {
            pts: "250,310 290,330 250,350 210,330",
            sides: "M 210,330 L 210,345 M 250,350 L 250,365 M 290,330 L 290,345",
            bottom: "M 210,345 L 250,365 L 290,345",
            inner: "M 210,335 L 250,355 L 290,335 M 210,340 L 250,360 L 290,340",
            diamond: "250,325 260,330 250,335 240,330",
            label: "SRC_03",
            lx: 260,
            ly: 380,
            hookD: "M 250,365 L 250,377 L 255,377",
          },
        ].map((src, i) => (
          <g
            key={i}
            opacity={srcP[i]}
            transform={`translate(0, ${lift(srcP[i])})`}
          >
            <polygon points={src.pts} style={VF.surface} />
            <polygon points={src.pts} style={VF.outlineThin} />
            <path d={src.sides} style={VF.outlineThin} />
            <path d={src.bottom} style={VF.outlineThin} />
            <path d={src.inner} style={{ ...VF.outlineThin, opacity: 0.4 }} />
            <polygon
              points={src.diamond}
              style={VF.nodeInner}
              opacity={0.2}
            />
            <polygon points={src.diamond} style={VF.outlineThin} />
            <text x={src.lx} y={src.ly} style={VF.techText}>
              {src.label}
            </text>
            <path d={src.hookD} style={VF.linkSolid} />
          </g>
        ))}

        {/* Dashed connection lines */}
        <g opacity={linksP}>
          <path d="M 190,120 L 190,240 L 170,250" style={VF.linkPath} />
          <polygon
            points="187,185 190,177 193,185"
            style={VF.nodeInner}
            opacity={0.7}
          />
          <path d="M 250,125 L 250,330" style={VF.linkPath} />
          <polygon
            points="247,235 250,227 253,235"
            style={VF.nodeInner}
            opacity={0.7}
          />
          <path d="M 300,120 L 300,235 L 330,250" style={VF.linkPath} />
          <polygon
            points="297,185 300,177 303,185"
            style={VF.nodeInner}
            opacity={0.7}
          />
        </g>

        {/* Response card (top isometric plane) */}
        <g
          opacity={cardP}
          transform={`translate(0, ${lift(cardP)})`}
        >
          <polygon
            points="250,50 370,110 250,170 130,110"
            style={VF.surface}
          />
          <polygon
            points="250,50 370,110 250,170 130,110"
            style={{ ...VF.outline, fill: COLORS.bgBase }}
          />
        </g>

        {/* Text lines on card */}
        <g
          opacity={textP}
          transform={`translate(0, ${lift(textP)})`}
          style={VF.docText}
        >
          <path d="M 160,120 L 250,75" />
          <path d="M 170,130 L 182,124 M 198,116 L 270,80" />
          <path d="M 180,140 L 290,85" />
          <path d="M 200,150 L 242,129 M 258,121 L 320,90" />
          <path d="M 220,160 L 292,124 M 308,116 L 340,100" />
        </g>

        {/* Citation markers on card */}
        <g opacity={citesP} transform={`translate(0, ${lift(citesP)})`}>
          <circle cx={190} cy={120} r={5} style={VF.nodeOuter} />
          <circle cx={190} cy={120} r={1.5} style={VF.nodeInner} />
          <text x={187.5} y={112} style={VF.citeText}>
            [1]
          </text>
          <circle cx={250} cy={125} r={5} style={VF.nodeOuter} />
          <circle cx={250} cy={125} r={1.5} style={VF.nodeInner} />
          <text x={247.5} y={117} style={VF.citeText}>
            [3]
          </text>
          <circle cx={300} cy={120} r={5} style={VF.nodeOuter} />
          <circle cx={300} cy={120} r={1.5} style={VF.nodeInner} />
          <text x={297.5} y={112} style={VF.citeText}>
            [2]
          </text>
        </g>

        {/* GENERATED_RESPONSE label */}
        <g opacity={labelsP}>
          <path d="M 250,50 L 250,38 L 255,38" style={VF.linkSolid} />
          <text x={260} y={41} style={VF.techText}>
            GENERATED_RESPONSE
          </text>
        </g>
      </svg>
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

        const illustrationEl = (
          <div
            style={{
              width: 310,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              transform: "scale(1.3)",
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
              gap: 16,
              maxWidth: 480,
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
                  width: 12,
                  height: 12,
                  backgroundColor: step.color,
                }}
              />
              <span
                style={{
                  fontSize: 15,
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
                fontSize: 34,
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
                fontSize: 18,
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
