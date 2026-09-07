import type { GameState } from "@/game/GameState";
import {
  createGameState,
  deserializeState,
  deserializeWorld,
  serializeWorld,
} from "@/game/GameState";
import { World } from "@/game/World";
import type { WorkerState } from "@/game/Worker";
import { ResourceSystem } from "@/engine/ResourceSystem";
import { TickSystem } from "@/engine/TickSystem";
import { ActionSystem, type ActionResult, type EngineArg } from "@/engine/ActionSystem";
import type { EventBus } from "@/events/Bus";
import { CropSystem } from "@/engine/CropSystem";

/**
 * The simulation owns live game state and all subsystems. It is UI-free and
 * fully testable. React and the renderer only ever read from it.
 */
export class Simulation {
  readonly state: GameState;
  readonly world: World;
  readonly worker: WorkerState;
  readonly resources: ResourceSystem;
  readonly ticks: TickSystem;
  readonly crops: CropSystem;
  readonly actions: ActionSystem;
  private timePaused = false;

  constructor(
    private readonly bus: EventBus,
    initialState?: GameState,
  ) {
    this.state = initialState ? deserializeState(initialState) : createGameState();
    this.world = deserializeWorld(this.state.world);
    this.worker = this.state.worker;
    this.resources = new ResourceSystem(bus, this.state.resources);
    this.ticks = new TickSystem();
    this.crops = new CropSystem(bus);
    this.actions = new ActionSystem(bus, this.resources, this.ticks, {
      world: this.world,
      worker: this.worker,
      stats: this.state.progression.stats,
    });
  }

  /**
   * Advances simulated time. Called every animation frame. Passive crop
   * growth depends on this; watering boosts growth instantly.
   */
  update(dtSeconds: number): void {
    if (this.timePaused || dtSeconds <= 0) return;
    this.world.worldTime += dtSeconds;
    this.crops.advancePassive(this.world, dtSeconds);
  }

  setTimePaused(paused: boolean): void {
    this.timePaused = paused;
  }

  /** Executes a script command against live state (throws on illegal actions). */
  executeCommand(name: string, args: EngineArg[]): ActionResult {
    return this.actions.execute(name, args);
  }

  stats() {
    return this.state.progression.stats;
  }

  /** Serializable capture used for RESET, save and networking. */
  capture(): GameState {
    return {
      version: this.state.version,
      world: serializeWorld(this.world),
      worker: { ...this.worker },
      resources: this.resources.toJSON(),
      progression: {
        completedChallenges: [...this.state.progression.completedChallenges],
        unlockedUpgrades: [...this.state.progression.unlockedUpgrades],
        stats: { ...this.state.progression.stats },
      },
    };
  }

  /** Captures just the world + robot (used to rewind a run with RESET). */
  captureWorld(): { world: ReturnType<typeof serializeWorld>; worker: WorkerState } {
    return {
      world: serializeWorld(this.world),
      worker: { ...this.worker },
    };
  }

  /** Restores only the world + robot, keeping resources/progression intact. */
  restoreWorld(captured: { world: ReturnType<typeof serializeWorld>; worker: WorkerState }): void {
    const world = deserializeWorld(captured.world);
    this.world.grid.replaceFrom(world.grid);
    this.world.worldTime = world.worldTime;
    const clampedWorker = clampWorker(captured.worker, this.world);
    this.worker.x = clampedWorker.x;
    this.worker.y = clampedWorker.y;
    this.worker.facing = clampedWorker.facing;
  }

  /** Replaces all state with a saved/captured state. */
  restore(state: GameState): void {
    const restored = deserializeState(state);
    this.state.version = restored.version;
    this.state.world = restored.world;
    this.state.worker = restored.worker;
    this.state.resources = restored.resources;
    this.state.progression = restored.progression;
    const world = deserializeWorld(restored.world);
    this.world.grid.replaceFrom(world.grid);
    this.world.worldTime = world.worldTime;
    this.worker.x = restored.worker.x;
    this.worker.y = restored.worker.y;
    this.worker.facing = restored.worker.facing;
    this.resources.setAll(restored.resources);
  }

  /** Wipes progression and world back to a fresh farm. */
  resetToFresh(): void {
    const fresh = createGameState();
    this.restore(fresh);
    this.ticks.reset();
  }
}

function clampWorker(worker: WorkerState, world: { width: number; height: number }): WorkerState {
  return {
    x: Math.max(0, Math.min(world.width - 1, worker.x)),
    y: Math.max(0, Math.min(world.height - 1, worker.y)),
    facing: worker.facing,
  };
}