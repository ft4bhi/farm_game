export type ChallengeCondition =
  | { type: "harvest_total"; amount: number }
  | { type: "harvest_loop_run"; amount: number }
  | { type: "clear_obstacles"; amount: number }
  | { type: "and"; requirements: ChallengeCondition[] };

export interface ChallengeDefinition {
  id: string;
  title: string;
  description: string;
  /** Human friendly "goal" the player should accomplish. */
  goal: string;
  /** Detection rule. Missions are challenges with richer requirements. */
  condition: ChallengeCondition;
  rewards: Record<string, number>;
  /** Sample script shown in the challenge panel. */
  sampleScript: string;
  order: number;
}

export const CHALLENGE_DEFINITIONS: ChallengeDefinition[] = [
  {
    id: "first_crop",
    title: "First Crop",
    description: "Plant a carrot, water it until it matures and harvest it.",
    goal: "Plant and harvest 1 carrot.",
    condition: { type: "harvest_total", amount: 1 },
    rewards: { coin: 10 },
    sampleScript:
      "move(North)\n\n# Plant a seed on the soil ahead\nplant(Carrot)\n\n# Water until the carrot is ready\nwater()\nwater()\nwater()\nwater()\n\n# Harvest the mature carrot\nharvest()\n",
    order: 0,
  },
  {
    id: "small_field",
    title: "Small Field",
    description:
      "Work the field below: plant, water and harvest carrots across several soil tiles.",
    goal: "Harvest 5 carrots in total.",
    condition: { type: "harvest_total", amount: 5 },
    rewards: { coin: 25 },
    sampleScript:
      "move(North)\nmove(North)\n\nfor i in range(5):\n    plant(Carrot)\n    water()\n    water()\n    water()\n    water()\n    harvest()\n    move(East)\n",
    order: 1,
  },
  {
    id: "cleared_field",
    title: "Broken Ground",
    description:
      "Obstacles are part of the field. Clear two rocks with the RockCutter and harvest 4 carrots from ground you reclaimed.",
    goal: "Clear 2 rocks and harvest 4 carrots in total.",
    condition: {
      type: "and",
      requirements: [
        { type: "clear_obstacles", amount: 2 },
        { type: "harvest_total", amount: 4 },
      ],
    },
    rewards: { coin: 30 },
    sampleScript:
      "move(West)\nmove(West)\nmove(West)\n\n# A rock blocks the edge of the field: clear it\nclear()\n\n# Step onto the fresh ground and till it\nmove(West)\ntill()\n\n# Now farm the reclaimed tile\nplant(Carrot)\nwater()\nwater()\nwater()\nwater()\nharvest()\n",
    order: 2,
  },
  {
    id: "automation",
    title: "Automation",
    description:
      "Prove your FieldBot can farm on its own. Use a loop to harvest several crops in a single program run.",
    goal: "Harvest 4 crops in one run using a loop.",
    condition: { type: "harvest_loop_run", amount: 4 },
    rewards: { coin: 50 },
    sampleScript:
      "for i in range(6):\n    if can_harvest():\n        harvest()\n\n    move(East)\n",
    order: 3,
  },
];

const CHALLENGE_BY_ID = new Map(
  CHALLENGE_DEFINITIONS.map((c) => [c.id, c]),
);

export function getChallenge(id: string): ChallengeDefinition | undefined {
  return CHALLENGE_BY_ID.get(id);
}