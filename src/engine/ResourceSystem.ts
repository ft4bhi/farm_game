import { RESOURCE_DEFINITIONS } from "@/data/resources";
import type { EventBus } from "@/events/Bus";

/**
 * Generic resource registry. New resources are added by registering data,
 * not by editing this class.
 */
export class ResourceSystem {
  private amounts: Record<string, number>;

  constructor(
    private readonly bus: EventBus,
    initial: Record<string, number> = {},
  ) {
    this.amounts = { ...initial };
  }

  get(id: string): number {
    return this.amounts[id] ?? 0;
  }

  has(id: string, amount: number): boolean {
    return this.get(id) >= amount;
  }

  all(): Record<string, number> {
    return { ...this.amounts };
  }

  /** Adds resources. Returns the new amount. */
  add(id: string, amount: number): number {
    if (amount <= 0) return this.get(id);
    if (!RESOURCE_DEFINITIONS[id]) {
      // Unknown resources are tracked but flagged so data typos surface.
      console.warn(`[resources] adding unregistered resource "${id}".`);
    }
    const next = Math.floor(this.get(id) + amount);
    this.amounts[id] = next;
    this.bus.emit("resource.changed", this.all());
    return next;
  }

  /**
   * Removes resources. Returns false (no change) when there are not enough.
   */
  remove(id: string, amount: number): boolean {
    if (amount <= 0) return true;
    const current = this.get(id);
    if (current < amount) return false;
    this.amounts[id] = current - amount;
    this.bus.emit("resource.changed", this.all());
    return true;
  }

  /** Direct snapshot overwrite (used by load/reset). */
  setAll(amounts: Record<string, number>): void {
    this.amounts = { ...amounts };
    this.bus.emit("resource.changed", this.all());
  }

  toJSON(): Record<string, number> {
    return this.all();
  }
}