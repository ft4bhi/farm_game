import type { Direction } from "@/game/Direction";

/** Payloads for every event emitted by the game engine. */
export interface GameEventMap {
  "worker.moved": { from: { x: number; y: number }; to: { x: number; y: number }; direction: Direction };
  "crop.planted": { x: number; y: number; cropId: string };
  "crop.watered": { x: number; y: number; cropId: string; stage: string };
  "crop.harvested": { x: number; y: number; cropId: string; rewards: Record<string, number> };
  "resource.changed": Record<string, number>;
  "console.message": { level: "system" | "info" | "ok" | "error" | "warn"; text: string; line?: number | null };
  "program.line": { line: number };
  "execution.status": { status: string };
  "execution.detail": {
    currentLine: number | null;
    errorLine: number | null;
    errorMessage: string | null;
    ticksUsed: number;
    actionsUsed: number;
    instructionsUsed: number;
  };
  "program.started": Record<string, never>;
  "program.finished": { ticksUsed: number; actionsUsed: number; instructionsUsed: number };
  "challenge.progress": { challengeId: string; done: number; total: number };
  "challenge.completed": { challengeId: string; rewards: Record<string, number> };
  "upgrade.unlocked": { upgradeId: string; features: string[] };
  "save.saved": Record<string, never>;
  "save.loaded": Record<string, never>;
  "save.reset": Record<string, never>;
}

export type GameEventName = keyof GameEventMap;

/**
 * Tiny, dependency-free event bus. Systems communicate through it so React,
 * the renderer and the simulation stay decoupled.
 */
export class EventBus {
  private readonly listeners = new Map<GameEventName, Set<(payload: unknown) => void>>();

  on<K extends GameEventName>(event: K, fn: (payload: GameEventMap[K]) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as (payload: unknown) => void);
    const wrapped = fn as (payload: unknown) => void;
    return () => {
      const current = this.listeners.get(event);
      if (!current) return;
      current.delete(wrapped);
      if (current.size === 0) this.listeners.delete(event);
    };
  }

  off<K extends GameEventName>(event: K, fn: (payload: GameEventMap[K]) => void): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(fn as (payload: unknown) => void);
    if (set.size === 0) this.listeners.delete(event);
  }

  emit<K extends GameEventName>(event: K, payload: GameEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // Snapshot so listeners can unsubscribe while others still run.
    for (const fn of Array.from(set)) {
      try {
        (fn as (payload: GameEventMap[K]) => void)(payload);
      } catch (err) {
        // A misbehaving listener must never break the simulation loop.
        // eslint-disable-next-line no-console
        console.error(`[eventbus] listener for "${event}" failed:`, err);
      }
    }
  }

  /** Removes every listener (used when tearing down a game instance). */
  clear(): void {
    this.listeners.clear();
  }
}