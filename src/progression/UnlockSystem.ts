import { UPGRADE_DEFINITIONS, type UpgradeDefinition } from "@/data/upgrades";
import type { EventBus } from "@/events/Bus";

/**
 * Feature gating for the script API. `unlockedIds` is a live reference to the
 * progression array stored in the game state, so save/load stays consistent.
 */
export class UnlockSystem {
  constructor(
    private readonly bus: EventBus,
    private readonly unlockedIds: string[],
  ) {}

  /** Every upgrade currently owned. */
  unlockedUpgradeIds(): string[] {
    return [...this.unlockedIds];
  }

  hasUpgrade(id: string): boolean {
    return this.unlockedIds.includes(id);
  }

  /** True if the given script feature (e.g. "loop", "sensor") is usable. */
  hasFeature(feature: string): boolean {
    return this.computedFeatures().has(feature);
  }

  /** Recompute the full feature set from owned upgrades. */
  computedFeatures(): Set<string> {
    const features = new Set<string>();
    for (const id of this.unlockedIds) {
      const def = UPGRADE_DEFINITIONS.find((u) => u.id === id);
      if (!def) continue;
      for (const feature of def.features) features.add(feature);
    }
    return features;
  }

  /** Grants an upgrade. Returns true only when it was previously locked. */
  grantUpgrade(id: string): boolean {
    if (this.unlockedIds.includes(id)) return false;
    const def = UPGRADE_DEFINITIONS.find((u) => u.id === id);
    this.unlockedIds.push(id);
    if (!def) return true;
    this.bus.emit("upgrade.unlocked", {
      upgradeId: def.id,
      features: def.features,
    });
    return true;
  }

  /** Finds upgrades that should unlock after a challenge completes. */
  upgradesTriggedByChallenge(challengeId: string): UpgradeDefinition[] {
    return UPGRADE_DEFINITIONS.filter(
      (u) => u.trigger?.type === "challenge" && u.trigger.challengeId === challengeId,
    );
  }
}