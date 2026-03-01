// Dark-mode design tokens (pre-computed, no color-mix)
export const COLORS = {
  bgBase: "#090909",
  foam: "#151515",
  surface: "rgba(23, 23, 23, 0.8)",
  surfaceStrong: "rgba(15, 15, 15, 0.92)",
  line: "rgba(230, 230, 230, 0.2)",
  seaInk: "#f5f5f5",
  seaInkSoft: "#cccccc",
  lagoon: "#ffffff",
  lagoonDeep: "#ebebeb",
  palm: "#d1d1d1",
  sand: "#111111",
  kicker: "#e5e5e5",
  headerBg: "rgba(15, 15, 15, 0.82)",
  chipBg: "rgba(22, 22, 22, 0.92)",
  chipLine: "rgba(230, 230, 230, 0.18)",
  insetGlint: "rgba(240, 240, 240, 0.08)",
  // Reference item colors
  refItemBorder: "rgba(200, 200, 200, 0.15)",
  refItemBg: "rgba(15, 15, 15, 0.91)",
  refItemTitle: "#f3f3f3",
  refItemPageBorder: "rgba(200, 200, 200, 0.18)",
} as const;

export const SPRING_CONFIG = {
  damping: 200,
  mass: 1,
  stiffness: 200,
} as const;

export const TRANSITION_DURATION = 15;

export const SCENE_DURATIONS = {
  scene1: 90,
  scene2: 270,
  scene3: 620,
  scene4: 150,
} as const;
