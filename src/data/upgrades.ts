export type UnlockTrigger =
  | { type: "challenge"; challengeId: string }
  | { type: "resource"; resourceId: string; amount: number };

export interface UpgradeDefinition {
  id: string;
  title: string;
  description: string;
  /** Feature ids granted by this upgrade. */
  features: string[];
  /** When this upgrade unlocks. */
  trigger: UnlockTrigger | null;
  /** Visible order in the progression list. */
  order: number;
}

/** Technology / capability progression (small tree for the MVP). */
export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: "basic_farming",
    title: "Basic Farming",
    description: "The FieldBot can move, plant seeds, water crops and harvest.",
    features: ["move", "plant", "water", "harvest"],
    trigger: null,
    order: 0,
  },
  {
    id: "sensors",
    title: "Field Sensors",
    description:
      "The FieldBot can inspect its surroundings: can_harvest(), get_ground_type() and position sensors.",
    features: ["sensor"],
    trigger: { type: "challenge", challengeId: "first_crop" },
    order: 1,
  },
  {
    id: "loops",
    title: "Automation Loops",
    description: "Repeat work automatically with for and while loops.",
    features: ["loop"],
    trigger: { type: "challenge", challengeId: "small_field" },
    order: 2,
  },
  {
    id: "functions",
    title: "Reusable Functions",
    description: "Package a routine into a def function and call it anywhere.",
    features: ["function"],
    trigger: { type: "challenge", challengeId: "automation" },
    order: 3,
  },
];

const UPGRADE_BY_ID = new Map(UPGRADE_DEFINITIONS.map((u) => [u.id, u]));

export function getUpgrade(id: string): UpgradeDefinition | undefined {
  return UPGRADE_BY_ID.get(id);
}

/** Features that are always available without any upgrade. */
export const BASE_FEATURES: string[] = ["move", "plant", "water", "harvest"];