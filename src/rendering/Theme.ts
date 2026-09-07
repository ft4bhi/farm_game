/** Central colour palette for all canvas-drawn graphics. */
export const THEME = {
  background: "#1b2a1d",
  skyline: "#16211a",
  worldBorder: "#0f1a12",
  labelBg: "rgba(10,16,12,0.75)",
  robot: {
    body: "#e7ecf3",
    bodyDark: "#c3ccd9",
    accent: "#ffb020",
    wheel: "#39424e",
    hub: "#aeb7c2",
    screen: "#21334a",
    screenGlow: "#5fd0ff",
    antenna: "#39424e",
  },
  water: {
    base: "#3d7ea6",
    shallow: "#5aa0c4",
    sparkle: "#bfe6f5",
  },
  soil: {
    base: "#6b4a2b",
    furrow: "#5a3c22",
    highlight: "#7d5835",
  },
  grass: {
    base: "#4f8a3c",
    blade: "#5f9c48",
    dark: "#417531",
  },
  tree: {
    trunk: "#5d4431",
    canopy: "#2f5a22",
    canopyLight: "#3b6e2b",
  },
  rock: {
    base: "#7d8188",
    light: "#98a0a8",
    dark: "#62676e",
  },
  carrot: {
    body: "#f28c28",
    bodyDark: "#d9701a",
    frond: "#3faf4a",
  },
  particle: "#ffd76a",
} as const;

export interface RenderQuality {
  simple: boolean;
  animated: boolean;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function resolvedQuality(): RenderQuality {
  const reduced = prefersReducedMotion();
  return { simple: reduced, animated: !reduced };
}