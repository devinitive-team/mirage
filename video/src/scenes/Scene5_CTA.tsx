import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { mouseClick } from "@remotion/sfx";
import { loadFont } from "@remotion/google-fonts/Ubuntu";
import { COLORS, SPRING_CONFIG } from "../lib/constants";
import { MirageLogo } from "../components/MirageLogo";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

// ─── Cursor Timeline ───
const CURSOR_ENTER = 40;
const CLICK_FRAME = 58;
const POP_END = 65;

const CursorPointer: React.FC<{ style?: React.CSSProperties }> = ({
  style,
}) => (
  <svg
    width="28"
    height="34"
    viewBox="0 0 28 34"
    fill="none"
    style={style}
    xmlns="http://www.w3.org/2000/svg"
  >
    <g filter="url(#shadow)">
      <path
        d="M4 2L4 26L10 20L15 30L19 28L14 18L22 18L4 2Z"
        fill="white"
        stroke="#222"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <filter id="shadow" filterUnits="userSpaceOnUse" x="-4" y="-2" width="36" height="42">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.5" />
      </filter>
    </defs>
  </svg>
);

export const Scene5_CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProgress = spring({
    frame: frame - 5,
    fps,
    config: SPRING_CONFIG,
  });

  const buttonProgress = spring({
    frame: frame - 15,
    fps,
    config: SPRING_CONFIG,
  });
  const buttonInitialScale = interpolate(buttonProgress, [0, 1], [0.8, 1]);

  const urlProgress = spring({
    frame: frame - 30,
    fps,
    config: SPRING_CONFIG,
  });

  const fadeOut = interpolate(frame, [98, 122], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ─── Cursor position (slides in from bottom-right) ───
  const cursorSlide = spring({
    frame: frame - CURSOR_ENTER,
    fps,
    config: { damping: 28, mass: 0.8, stiffness: 120 },
  });
  const cursorX = interpolate(cursorSlide, [0, 1], [160, 0]);
  const cursorY = interpolate(cursorSlide, [0, 1], [120, 0]);
  const cursorOpacity = interpolate(
    frame,
    [CURSOR_ENTER, CURSOR_ENTER + 3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ─── Click dip (3px down at click frame) ───
  const clickDip = interpolate(frame, [CLICK_FRAME, CLICK_FRAME + 3, CLICK_FRAME + 6], [0, 3, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ─── Button pop on click ───
  const popScale = spring({
    frame: frame - CLICK_FRAME,
    fps,
    config: { damping: 12, mass: 0.4, stiffness: 300 },
  });
  const buttonPopScale =
    frame >= CLICK_FRAME
      ? interpolate(popScale, [0, 0.5, 1], [1.0, 1.06, 1.0])
      : 1;
  const buttonScale = buttonInitialScale * buttonPopScale;

  // ─── Button color transition ───
  const isClicked = frame >= CLICK_FRAME;
  const colorProgress = interpolate(
    frame,
    [CLICK_FRAME, POP_END],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const buttonBg = isClicked
    ? interpolateColor(colorProgress, "#ffffff", "#22c55e")
    : "#ffffff";
  const buttonColor = isClicked
    ? interpolateColor(colorProgress, "#000000", "#ffffff")
    : "#000000";


  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgBase,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        opacity: fadeOut,
      }}
    >
      {/* Click SFX */}
      <Sequence from={CLICK_FRAME}>
        <Audio src={mouseClick} volume={0.3} />
      </Sequence>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          minHeight: 280,
          position: "relative",
        }}
      >
        <div style={{ opacity: logoProgress }}>
          <MirageLogo size={96} color={COLORS.seaInk} />
        </div>
        <div style={{ position: "relative" }}>
          <div
            style={{
              opacity: buttonProgress,
              transform: `scale(${buttonScale})`,
              background: buttonBg,
              color: buttonColor,
              fontSize: 26,
              fontWeight: 700,
              padding: "18px 52px",
              borderRadius: 0,
            }}
          >
            Join the waitlist
          </div>
          {/* Cursor overlay — tip lands at button center */}
          {frame >= CURSOR_ENTER && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                opacity: cursorOpacity,
                transform: `translate(${cursorX}px, ${cursorY}px) translateY(${clickDip}px)`,
                pointerEvents: "none",
              }}
            >
              <CursorPointer />
            </div>
          )}
        </div>
        <div
          style={{
            opacity: urlProgress,
            fontSize: 20,
            color: COLORS.seaInkSoft,
          }}
        >
          mirage.ai
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Simple hex color interpolation */
function interpolateColor(t: number, from: string, to: string): string {
  const f = hexToRgb(from);
  const o = hexToRgb(to);
  const r = Math.round(f[0] + (o[0] - f[0]) * t);
  const g = Math.round(f[1] + (o[1] - f[1]) * t);
  const b = Math.round(f[2] + (o[2] - f[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
