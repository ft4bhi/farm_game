import {
  CHALLENGE_DEFINITIONS,
  type ChallengeCondition,
  type ChallengeDefinition,
} from "@/data/challenges";
import type { Simulation } from "@/engine/Simulation";
import type { UnlockSystem } from "@/progression/UnlockSystem";
import type { EventBus } from "@/events/Bus";

export interface RunReport {
  usedLoop: boolean;
  harvestsInRun: number;
  instructionsUsed: number;
  ticksUsed: number;
}

export interface ChallengeView {
  id: string;
  title: string;
  description: string;
  goal: string;
  completed: boolean;
  rewards: Record<string, number>;
  progressDone: number;
  progressTotal: number;
  sampleScript: string;
}

/**
 * Detects and rewards challenge completion. Challenges are data-driven:
 * adding one requires a new entry in `data/challenges.ts`.
 */
export class ChallengeManager {
  constructor(
    private readonly bus: EventBus,
    private readonly simulation: Simulation,
    private readonly unlocks: UnlockSystem,
  ) {}

  byId(id: string): ChallengeDefinition | undefined {
    return CHALLENGE_DEFINITIONS.find((c) => c.id === id);
  }

  list(): ChallengeView[] {
    return CHALLENGE_DEFINITIONS.map((def) =>
      this.view(def),
    ).sort((a, b) => a.progressTotal - b.progressTotal);
  }

  /** The first not-yet-completed challenge (drives the HUD goal). */
  current(): ChallengeView | null {
    const views = this.list().filter((v) => !v.completed);
    return views[0] ?? null;
  }

  completedCount(): number {
    return CHALLENGE_DEFINITIONS.filter((def) => this.isCompleted(def)).length;
  }

  isCompleted(def: ChallengeDefinition): boolean {
    return this.simulation.state.progression.completedChallenges.includes(def.id);
  }

  /** Evaluates all open challenges after a program run. */
  reportRun(report: RunReport): void {
    for (const def of CHALLENGE_DEFINITIONS) {
      if (this.isCompleted(def)) continue;
      if (this.conditionMet(def, report)) {
        this.complete(def);
      }
    }
    this.emitProgress();
  }

  /** Emits progress for the current goal (HUD). */
  emitProgress(): void {
    const current = this.current();
    if (!current) return;
    this.bus.emit("challenge.progress", {
      challengeId: current.id,
      done: current.progressDone,
      total: current.progressTotal,
    });
  }

  private view(def: ChallengeDefinition): ChallengeView {
    const completed = this.isCompleted(def);
    const [progressDone, progressTotal] = this.progressOf(def.condition, completed);
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      goal: def.goal,
      completed,
      rewards: def.rewards,
      progressDone,
      progressTotal,
      sampleScript: def.sampleScript,
    };
  }

  private conditionMet(def: ChallengeDefinition, report: RunReport): boolean {
    return this.conditionSatisfied(def.condition, report);
  }

  /** Cumulative conditions never regress; only the loop requirement is per-run. */
  private conditionSatisfied(condition: ChallengeCondition, report: RunReport): boolean {
    switch (condition.type) {
      case "harvest_total":
        return this.simulation.stats().totalHarvested >= condition.amount;
      case "clear_obstacles":
        return this.simulation.stats().rocksCleared >= condition.amount;
      case "harvest_loop_run":
        return report.usedLoop && report.harvestsInRun >= condition.amount;
      case "and": {
        if (condition.requirements.length === 0) return true;
        return condition.requirements.every((req) =>
          this.conditionSatisfied(req, report),
        );
      }
    }
  }

  /** Progress values for the HUD: an "and" aggregates its requirements. */
  private progressOf(
    condition: ChallengeCondition,
    completed: boolean,
  ): [number, number] {
    switch (condition.type) {
      case "harvest_total": {
        const done = Math.min(
          this.simulation.stats().totalHarvested,
          condition.amount,
        );
        return [done, condition.amount];
      }
      case "clear_obstacles": {
        const done = Math.min(
          this.simulation.stats().rocksCleared,
          condition.amount,
        );
        return [done, condition.amount];
      }
      case "harvest_loop_run":
        return [completed ? condition.amount : 0, condition.amount];
      case "and": {
        let done = 0;
        let total = 0;
        for (const req of condition.requirements) {
          const [d, t] = this.progressOf(req, completed);
          done += d;
          total += t;
        }
        return [Math.min(done, total), total];
      }
    }
  }

  private complete(def: ChallengeDefinition): void {
    const progression = this.simulation.state.progression;
    progression.completedChallenges.push(def.id);

    const rewards = def.rewards;
    for (const [resId, amount] of Object.entries(rewards)) {
      this.simulation.resources.add(resId, amount);
    }

    for (const upgrade of this.unlocks.upgradesTriggedByChallenge(def.id)) {
      this.unlocks.grantUpgrade(upgrade.id);
    }

    this.bus.emit("challenge.completed", {
      challengeId: def.id,
      rewards: { ...rewards },
    });
  }
}