import type { GameState, ProgressionState } from "@/game/GameState";
import type { GameSettings } from "@/data/config";

/** Minimal storage abstraction so saves work in browsers and tests. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SAVE_KEY = "farmforge.save.v1";
const SAVE_VERSION = 1;

export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveError";
  }
}

export interface SavePayload {
  version: number;
  savedAt: number;
  game: GameState;
  script: string;
  settings: GameSettings;
}

function defaultStorage(): StorageLike | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage as StorageLike;
  }
  return null;
}

/** Browser persistence for the whole farm. Handles corrupted data gracefully. */
export class SaveSystem {
  constructor(
    private readonly storage: StorageLike | null = defaultStorage(),
  ) {}

  hasSave(): boolean {
    if (!this.storage) return false;
    return this.storage.getItem(SAVE_KEY) !== null;
  }

  save(payload: SavePayload): void {
    this.storage?.setItem(SAVE_KEY, JSON.stringify(payload));
  }

  /**
   * Loads and validates a save. Returns null when there is no save.
   * Throws SaveError when the payload is corrupted so callers can recover
   * (e.g. start fresh and warn the player).
   */
  load(): SavePayload | null {
    if (!this.storage) return null;
    const raw = this.storage.getItem(SAVE_KEY);
    if (raw === null) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.storage.removeItem(SAVE_KEY);
      throw new SaveError("Save data is not valid JSON.");
    }
    return validatePayload(parsed);
  }

  clear(): void {
    this.storage?.removeItem(SAVE_KEY);
  }
}

function validatePayload(raw: unknown): SavePayload {
  const payload = raw as Partial<SavePayload>;
  if (!payload || typeof payload !== "object") {
    throw new SaveError("Save data is empty.");
  }
  if (payload.version !== SAVE_VERSION) {
    throw new SaveError(`Unsupported save version ${String(payload.version)}.`);
  }
  if (typeof payload.savedAt !== "number") {
    throw new SaveError("Save has no timestamp.");
  }
  if (!payload.game || typeof payload.game !== "object") {
    throw new SaveError("Save has no game state.");
  }
  if (typeof payload.script !== "string") {
    throw new SaveError("Save has no script.");
  }
  const settings: GameSettings =
    payload.settings && typeof payload.settings === "object"
      ? {
          executionSpeed:
            payload.settings.executionSpeed === "slow" ||
            payload.settings.executionSpeed === "normal" ||
            payload.settings.executionSpeed === "fast"
              ? payload.settings.executionSpeed
              : "normal",
          renderQuality:
            payload.settings.renderQuality === "low" ||
            payload.settings.renderQuality === "full"
              ? payload.settings.renderQuality
              : "full",
        }
      : { executionSpeed: "normal", renderQuality: "full" };

  return {
    version: SAVE_VERSION,
    savedAt: payload.savedAt,
    game: payload.game as GameState,
    script: payload.script,
    settings,
  };
}

/** Shape guard used by the UI to know what to show for unlocks/challenges. */
export function isProgressionState(value: unknown): value is ProgressionState {
  if (!value || typeof value !== "object") return false;
  const p = value as ProgressionState;
  return (
    Array.isArray(p.completedChallenges) &&
    Array.isArray(p.unlockedUpgrades) &&
    !!p.stats
  );
}