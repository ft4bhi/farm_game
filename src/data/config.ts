/**
 * Execution/balance tunables. Keeping these in one place makes the game easy
 * to balance without touching game logic.
 */

/** Ticks consumed per game action (used for the operations counter). */
export interface ActionCosts {
  sensor: number;
  variable: number;
  condition: number;
  move: number;
  plant: number;
  water: number;
  harvest: number;
  call: number;
  loop: number;
}

export const ACTION_COSTS: ActionCosts = {
  sensor: 1,
  variable: 1,
  condition: 1,
  move: 5,
  plant: 8,
  water: 5,
  harvest: 8,
  call: 1,
  loop: 1,
};

/** Milliseconds to play one dramatic action at each speed tier. */
export const EXECUTION_SPEEDS = {
  slow: { label: "Slow", actionMs: 800 },
  normal: { label: "Normal", actionMs: 400 },
  fast: { label: "Fast", actionMs: 110 },
} as const;

export type ExecutionSpeed = keyof typeof EXECUTION_SPEEDS;

export const DEFAULT_EXECUTION_SPEED: ExecutionSpeed = "normal";

/** Safety limits that prevent runaway programs from freezing the browser. */
export const EXECUTION_LIMITS = {
  /** Max interpreter instructions per run (yields back to the event loop periodically). */
  maxInstructions: 200_000,
  /** Max paced game actions (move/plant/water/harvest) per run. */
  maxActions: 4_000,
  /** Yield to the browser paint every N interpreter steps. */
  throttleEvery: 2_000,
};

/** Passive growth: world time is measured in these fixed increments per second. */
export const PASSIVE_GROWTH_TICK_SECONDS = 0.5;

/** Settings stored in the save. */
export interface GameSettings {
  executionSpeed: ExecutionSpeed;
  renderQuality: "full" | "low";
}

export const DEFAULT_SETTINGS: GameSettings = {
  executionSpeed: DEFAULT_EXECUTION_SPEED,
  renderQuality: "full",
};