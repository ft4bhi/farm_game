import { ACTION_COSTS } from "@/data/config";

export type TickCategory =
  | "sensor"
  | "variable"
  | "condition"
  | "move"
  | "plant"
  | "water"
  | "harvest"
  | "call"
  | "loop"
  | "till"
  | "clear";

/**
 * Tracks the deterministic cost of a program run. Every action consumes a
 * number of ticks from the balance table in `data/config.ts`.
 */
export class TickSystem {
  private used = 0;

  reset(): void {
    this.used = 0;
  }

  get total(): number {
    return this.used;
  }

  /** Returns the configured cost of one category. */
  cost(category: TickCategory): number {
    return ACTION_COSTS[category];
  }

  /** Accounts for a category and returns the cost that was added. */
  add(category: TickCategory): number {
    const cost = ACTION_COSTS[category];
    this.used += cost;
    return cost;
  }

  toJSON(): number {
    return this.used;
  }
}