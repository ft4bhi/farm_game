import {
  createCrop,
  getCropDefinition,
  getGrowthStage,
  isMature,
  type CropState,
} from "@/game/Crop";
import type { World } from "@/game/World";
import type { ResourceSystem } from "@/engine/ResourceSystem";
import type { EventBus } from "@/events/Bus";
import { GameActionError } from "@/engine/GameActionError";

export interface CropActionResult {
  message: string;
  cropId: string;
  rewards?: Record<string, number>;
  stage?: string;
}

export interface CropStatsSink {
  totalPlanted: number;
  totalWatered: number;
}

/**
 * All crop gameplay rules (plant / water / harvest / passive growth) live
 * here. The class is deliberately pure: it mutates the World it is given,
 * so it can be tested without a browser.
 */
export class CropSystem {
  constructor(private readonly bus: EventBus) {}

  plant(
    world: World,
    resources: ResourceSystem,
    stats: CropStatsSink,
    x: number,
    y: number,
    cropId: string,
  ): CropActionResult {
    const def = getCropDefinition({ id: cropId, progress: 0 });
    const tile = world.getTile(x, y);

    if (!world.isPlantable(x, y)) {
      throw new GameActionError(
        `Cannot plant ${def.name} here.\nThe FieldBot must be standing on Soil.`,
      );
    }
    if (tile.crop) {
      throw new GameActionError(
        `Cannot plant ${def.name} here.\nSomething is already growing on this tile.`,
      );
    }
    if (!resources.has(def.seedResourceId, 1)) {
      throw new GameActionError(
        `Cannot plant ${def.name}.\nNo ${def.name} seeds are available.`,
      );
    }

    resources.remove(def.seedResourceId, 1);
    world.grid.set(x, y, { type: tile.type, crop: createCrop(cropId) });
    stats.totalPlanted += 1;
    this.bus.emit("crop.planted", { x, y, cropId });
    return {
      message: `Planting ${def.name} seed`,
      cropId,
      stage: "SEED",
    };
  }

  water(world: World, stats: CropStatsSink, x: number, y: number): CropActionResult {
    const tile = world.getTile(x, y);
    const crop = tile.crop;
    if (!crop) {
      throw new GameActionError(
        "Cannot water here.\nThere is no crop growing on this tile.",
      );
    }
    const def = getCropDefinition(crop);
    crop.progress = Math.min(1, crop.progress + def.waterBoost);
    stats.totalWatered += 1;
    const stage = getGrowthStage(crop);
    this.bus.emit("crop.watered", { x, y, cropId: crop.id, stage });
    return { message: `Watering the ${def.name}`, cropId: crop.id, stage };
  }

  harvest(
    world: World,
    resources: ResourceSystem,
    stats: CropStatsSink,
    x: number,
    y: number,
  ): CropActionResult {
    const tile = world.getTile(x, y);
    const crop = tile.crop;
    if (!crop) {
      throw new GameActionError(
        "Cannot harvest here.\nThere is nothing growing on this tile.",
      );
    }
    if (!isMature(crop)) {
      const def = getCropDefinition(crop);
      throw new GameActionError(
        `Cannot harvest.\nThe ${def.name} is not mature yet (stage: ${getGrowthStage(crop)}).`,
      );
    }
    const def = getCropDefinition(crop);
    const rewards: Record<string, number> = {};
    for (const resId of Object.keys(def.harvestReward)) {
      const amount = def.harvestReward[resId];
      resources.add(resId, amount);
      rewards[resId] = amount;
    }
    tile.crop = null;
    this.bus.emit("crop.harvested", { x, y, cropId: crop.id, rewards });
    return { message: `Harvested a ${def.name}`, cropId: crop.id, rewards };
  }

  /** Advances every crop passively from simulated time. Returns count changed. */
  advancePassive(world: World, dtSeconds: number): number {
    let changed = 0;
    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        const crop = world.getTile(x, y).crop;
        if (!crop) continue;
        const before = crop.progress;
        crop.progress = Math.min(
          1,
          crop.progress + world.passiveGrowthRate(crop.id) * dtSeconds,
        );
        if (crop.progress !== before) changed += 1;
      }
    }
    return changed;
  }
}