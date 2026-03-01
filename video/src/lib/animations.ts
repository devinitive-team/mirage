import { interpolate, spring } from "remotion";
import { SPRING_CONFIG } from "./constants";

export function fadeIn(
  frame: number,
  startFrame: number,
  duration = 15,
): number {
  return interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function slideUp(
  frame: number,
  startFrame: number,
  distance = 30,
  duration = 15,
): number {
  return interpolate(
    frame,
    [startFrame, startFrame + duration],
    [distance, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}

export function scaleEntrance(
  frame: number,
  fps: number,
  delay = 0,
): number {
  const s = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIG,
  });
  return interpolate(s, [0, 1], [0.9, 1]);
}

export function typewriterCount(
  frame: number,
  startFrame: number,
  totalChars: number,
  speed = 1,
): number {
  if (frame < startFrame) return 0;
  const elapsed = frame - startFrame;
  return Math.min(Math.floor(elapsed * speed), totalChars);
}
