export interface CropDefinition {
  id: string;
  /** Language constant used in scripts, e.g. `plant(Carrot)`. */
  constant: string;
  name: string;
  /** Growth stage thresholds 0..1. Keys: SEED, SPROUT, GROWING, MATURE. */
  stages: { seed: number; sprout: number; growing: number; mature: number };
  /** Seconds of passive growth required to mature (without watering). */
  growTime: number;
  /** Progress added by a single water() call. */
  waterBoost: number;
  /** Seed resource required to plant. */
  seedResourceId: string;
  /** Reward granted on harvest. */
  harvestReward: Record<string, number>;
  description: string;
}

export const CROP_DEFINITIONS: Record<string, CropDefinition> = {
  carrot: {
    id: "carrot",
    constant: "Carrot",
    name: "Carrot",
    stages: { seed: 0.1, sprout: 0.35, growing: 0.7, mature: 1.0 },
    growTime: 30,
    waterBoost: 0.25,
    seedResourceId: "seed_carrot",
    harvestReward: { carrot: 1, coin: 1 },
    description: "A reliable root vegetable. Grows quickly with plenty of water.",
  },
};

export const ALL_CROP_IDS = Object.keys(CROP_DEFINITIONS);