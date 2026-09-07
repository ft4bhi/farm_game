import { CROP_DEFINITIONS, type CropDefinition } from "@/data/crops";

export type CropStage = "SEED" | "SPROUT" | "GROWING" | "MATURE";

/**
 * A crop occupies a soil tile. Growth is deterministic: `progress` goes from
 * 0 to 1. Watering adds progress; time also advances progress slowly.
 */
export interface CropState {
  /** Crop definition id, e.g. "carrot". */
  id: string;
  /** Growth progress in [0, 1]. */
  progress: number;
}

/** Stage thresholds, oldest first. */
const STAGE_ORDER: CropStage[] = ["SEED", "SPROUT", "GROWING", "MATURE"];

export function createCrop(id: string): CropState {
  return { id, progress: 0 };
}

export function getCropDefinition(crop: CropState): CropDefinition {
  const def = CROP_DEFINITIONS[crop.id];
  if (!def) {
    throw new Error(`Unknown crop definition: ${crop.id}`);
  }
  return def;
}

export function getGrowthStage(crop: CropState): CropStage {
  const def = getCropDefinition(crop);
  const thresholds = [
    def.stages.seed,
    def.stages.sprout,
    def.stages.growing,
    def.stages.mature,
  ];
  let stage: CropStage = STAGE_ORDER[0];
  for (let i = 0; i < STAGE_ORDER.length; i += 1) {
    if (crop.progress >= thresholds[i]) {
      stage = STAGE_ORDER[i];
    }
  }
  return stage;
}

export function isMature(crop: CropState): boolean {
  return getGrowthStage(crop) === "MATURE";
}

/** Fraction of the way through the current stage, used for render interpolation. */
export function getStageProgress(crop: CropState): number {
  const def = getCropDefinition(crop);
  const thresholds = [
    def.stages.seed,
    def.stages.sprout,
    def.stages.growing,
    def.stages.mature,
  ];
  const stageIndex = STAGE_ORDER.indexOf(getGrowthStage(crop));
  if (stageIndex >= thresholds.length - 1) return 1;
  const lo = stageIndex === 0 ? 0 : thresholds[stageIndex - 1];
  const hi = thresholds[stageIndex];
  return hi > lo ? (crop.progress - lo) / (hi - lo) : 1;
}