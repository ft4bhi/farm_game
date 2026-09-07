import { DIRECTION_DELTAS, isDirection, type Direction } from "@/game/Direction";
import type { World } from "@/game/World";
import type { WorkerState } from "@/game/Worker";
import type { ResourceSystem } from "@/engine/ResourceSystem";
import type { TickSystem, TickCategory } from "@/engine/TickSystem";
import { CropSystem, type CropStatsSink } from "@/engine/CropSystem";
import { GameActionError } from "@/engine/GameActionError";
import { CROP_DEFINITIONS } from "@/data/crops";
import { TILE_DEFINITIONS, type TileType } from "@/data/tiles";
import type { EventBus } from "@/events/Bus";
import type { ProgressionStats } from "@/game/GameState";

/** Values the interpreter can hand to the engine. */
export type EngineArg = string | number | boolean | null;

export interface ActionResult {
  ok: boolean;
  /** Human-friendly message describing what happened. */
  message?: string;
  /** For sensor commands: the value returned to the program. */
  returnValue?: EngineArg;
  /** Number of ticks this action consumed. */
  ticks: number;
  category: TickCategory;
}

/** Everything the ActionSystem needs from the live simulation. */
export interface EngineContext {
  world: World;
  worker: WorkerState;
  stats: ProgressionStats;
}

/**
 * Translates program commands into validated game actions. This is the only
 * place that mutates world/worker/resources based on a command.
 */
export class ActionSystem {
  readonly crops: CropSystem;
  private readonly cmd: EngineContext;

  constructor(
    private readonly bus: EventBus,
    private readonly resources: ResourceSystem,
    private readonly ticks: TickSystem,
    ctx: EngineContext,
  ) {
    this.crops = new CropSystem(bus);
    this.cmd = ctx;
  }

  /** Executes one command. Throws GameActionError for illegal actions. */
  execute(name: string, args: EngineArg[]): ActionResult {
    switch (name) {
      case "move":
        return this.move(args);
      case "plant":
        return this.plant(args);
      case "water":
        return this.water();
      case "harvest":
        return this.harvest();
      case "can_harvest":
        return this.sensor(() => this.canHarvest() as EngineArg, "can_harvest");
      case "get_ground_type":
        return this.sensor(() => this.groundType() as EngineArg, "get_ground_type");
      case "get_entity_type":
        return this.sensor(() => this.entityType() as EngineArg, "get_entity_type");
      case "get_position_x":
        return this.sensor(() => this.cmd.worker.x, "get_position_x");
      case "get_position_y":
        return this.sensor(() => this.cmd.worker.y, "get_position_y");
      case "get_world_width":
        return this.sensor(() => this.cmd.world.width, "get_world_width");
      case "get_world_height":
        return this.sensor(() => this.cmd.world.height, "get_world_height");
      default:
        throw new GameActionError(`Unknown command: ${name}`);
    }
  }

  private move(args: EngineArg[]): ActionResult {
    const rawDirection = args[0];
    if (typeof rawDirection !== "string" || !isDirection(rawDirection)) {
      throw new GameActionError(
        `Invalid direction: ${String(rawDirection)}.\nValid directions: North, South, East, West.`,
      );
    }
    const direction = rawDirection as Direction;
    const { world, worker } = this.cmd;
    const target = world.targetPosition(worker.x, worker.y, direction);

    if (!world.inBounds(target.x, target.y)) {
      throw new GameActionError(
        `Cannot move ${direction}.\nThe farm ends there.`,
      );
    }
    if (world.isBlocked(target.x, target.y)) {
      const blockedType = world.getTile(target.x, target.y).type;
      throw new GameActionError(
        `Cannot move ${direction}.\nThe destination tile is blocked (${TILE_DEFINITIONS[blockedType].name}).`,
      );
    }

    const from = { x: worker.x, y: worker.y };
    worker.facing = direction;
    worker.x = target.x;
    worker.y = target.y;
    this.bus.emit("worker.moved", {
      from,
      to: { x: worker.x, y: worker.y },
      direction,
    });
    return {
      ok: true,
      message: `Moving ${direction}`,
      ticks: this.ticks.add("move"),
      category: "move",
    };
  }

  private plant(args: EngineArg[]): ActionResult {
    const cropId = this.cropIdOf(args[0]);
    const { world, worker, stats } = this.cmd;
    const result = this.crops.plant(
      world,
      this.resources,
      stats as CropStatsSink,
      worker.x,
      worker.y,
      cropId,
    );
    return {
      ok: true,
      message: result.message,
      ticks: this.ticks.add("plant"),
      category: "plant",
    };
  }

  private water(): ActionResult {
    const { world, worker, stats } = this.cmd;
    const result = this.crops.water(
      world,
      stats as CropStatsSink,
      worker.x,
      worker.y,
    );
    return {
      ok: true,
      message: result.message,
      ticks: this.ticks.add("water"),
      category: "water",
    };
  }

  private harvest(): ActionResult {
    const { world, worker, stats } = this.cmd;
    const result = this.crops.harvest(
      world,
      this.resources,
      stats as CropStatsSink,
      worker.x,
      worker.y,
    );
    if (result.rewards && result.rewards.coin) {
      this.cmd.stats.coinsEarned += result.rewards.coin;
    }
    if (result.rewards && result.rewards.carrot) {
      this.cmd.stats.totalHarvested += result.rewards.carrot;
    }
    return {
      ok: true,
      message: result.message,
      ticks: this.ticks.add("harvest"),
      category: "harvest",
    };
  }

  private sensor(compute: () => EngineArg, name: string): ActionResult {
    const value = compute();
    return {
      ok: true,
      returnValue: value,
      ticks: this.ticks.add("sensor"),
      category: "sensor",
    };
  }

  private canHarvest(): boolean {
    const { world, worker } = this.cmd;
    const crop = world.getTile(worker.x, worker.y).crop;
    return !!crop && crop.progress >= 1;
  }

  private groundType(): string {
    const { world, worker } = this.cmd;
    return TILE_DEFINITIONS[world.getTile(worker.x, worker.y).type].name;
  }

  private entityType(): string | null {
    const { world, worker } = this.cmd;
    const crop = world.getTile(worker.x, worker.y).crop;
    return crop ? CROP_DEFINITIONS[crop.id].constant : null;
  }

  private cropIdOf(arg: EngineArg | undefined): string {
    if (typeof arg !== "string") {
      throw new GameActionError(
        `Invalid crop type: ${String(arg)}.\nValid crops: Carrot.`,
      );
    }
    const entry = Object.values(CROP_DEFINITIONS).find(
      (def) => def.constant === arg || def.id === arg,
    );
    if (!entry) {
      throw new GameActionError(
        `Unknown crop type: ${arg}.\nValid crops: Carrot.`,
      );
    }
    return entry.id;
  }
}