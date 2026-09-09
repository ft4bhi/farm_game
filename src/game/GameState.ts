import { createWorker, type WorkerState } from "@/game/Worker";
import { deserializeWorld, serializeWorld, World, type WorldState } from "@/game/World";
import { STARTING_RESOURCES } from "@/data/resources";

export const GAME_STATE_VERSION = 1;

/** Accumulated player statistics (used by challenge detection). */
export interface ProgressionStats {
  totalHarvested: number;
  totalPlanted: number;
  totalWatered: number;
  programRuns: number;
  coinsEarned: number;
  /** Rocks cleared by the RockCutter. */
  rocksCleared: number;
  /** Cleared-ground cells tilled into Soil by the FieldBot. */
  cellsTilled: number;
}

export interface ProgressionState {
  completedChallenges: string[];
  unlockedUpgrades: string[];
  stats: ProgressionStats;
}

export type ExecutionStatus =
  | "idle"
  | "running"
  | "paused"
  | "finished"
  | "stopped"
  | "error";

export interface ExecutionState {
  status: ExecutionStatus;
  /** Line currently highlighted in the editor, 1-based. */
  currentLine: number | null;
  /** Error line + message from the last run, if any. */
  errorLine: number | null;
  errorMessage: string | null;
  /** Operations (ticks) consumed by the last run. */
  ticksUsed: number;
  /** Paced game actions in the last run. */
  actionsUsed: number;
}

/**
 * The central serializable game state. Contains game state only — never
 * canvas objects, DOM references or React components.
 */
export interface GameState {
  version: number;
  world: WorldState;
  worker: WorkerState;
  resources: Record<string, number>;
  progression: ProgressionState;
}

function freshWorld(): World {
  return new World();
}

export function createGameState(): GameState {
  const world = freshWorld();
  return {
    version: GAME_STATE_VERSION,
    world: serializeWorld(world),
    worker: createWorker(world.startX, world.startY),
    resources: { ...STARTING_RESOURCES },
    progression: {
      completedChallenges: [],
      unlockedUpgrades: ["basic_farming"],
      stats: {
        totalHarvested: 0,
        totalPlanted: 0,
        totalWatered: 0,
        programRuns: 0,
        coinsEarned: 0,
        rocksCleared: 0,
        cellsTilled: 0,
      },
    },
  };
}

export function deserializeState(
  raw: unknown,
): GameState {
  const state = raw as Partial<GameState>;
  if (!state || typeof state !== "object") {
    throw new Error("Save data is not an object.");
  }
  if (state.version !== GAME_STATE_VERSION) {
    throw new Error(`Unsupported save version ${String(state.version)}.`);
  }
  if (!state.world || typeof state.world.width !== "number") {
    throw new Error("Save data has no valid world.");
  }
  const world = deserializeWorld(state.world);
  const worker = createWorker(world.startX, world.startY);
  if (
    state.worker &&
    typeof state.worker.x === "number" &&
    typeof state.worker.y === "number"
  ) {
    worker.x = Math.max(0, Math.min(world.width - 1, state.worker.x));
    worker.y = Math.max(0, Math.min(world.height - 1, state.worker.y));
    if (
      typeof state.worker.facing === "string" &&
      ["North", "South", "East", "West"].includes(state.worker.facing)
    ) {
      worker.facing = state.worker.facing as WorkerState["facing"];
    }
  }

  const resources: Record<string, number> = {
    ...STARTING_RESOURCES,
    ...(isRecord(state.resources) ? state.resources : {}),
  };

  const stats: ProgressionStats = {
    totalHarvested: 0,
    totalPlanted: 0,
    totalWatered: 0,
    programRuns: 0,
    coinsEarned: 0,
    rocksCleared: 0,
    cellsTilled: 0,
    ...(state.progression?.stats ?? {}),
  };

  const progression: ProgressionState = {
    completedChallenges: Array.isArray(state.progression?.completedChallenges)
      ? state.progression.completedChallenges
      : [],
    unlockedUpgrades: Array.isArray(state.progression?.unlockedUpgrades)
      ? state.progression.unlockedUpgrades
      : ["basic_farming"],
    stats,
  };

  return {
    version: GAME_STATE_VERSION,
    world: serializeWorld(world),
    worker,
    resources,
    progression,
  };
}

function isRecord(value: unknown): value is Record<string, number> {
  return !!value && typeof value === "object";
}

/** Re-export for convenience so saves use the exact same serialization. */
export { serializeWorld, deserializeWorld };