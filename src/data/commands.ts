/**
 * Metadata for the script API exposed to player programs. This drives
 * autocomplete, feature gating and the runtime command dispatch.
 */

export type CommandKind = "action" | "sensor";

export interface CommandDefinition {
  name: string;
  kind: CommandKind;
  /** Number of arguments expected. */
  arity: number;
  /** Feature id required to call this command. */
  feature: string;
  description: string;
  args: { name: string; hint: string }[];
}

export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    name: "move",
    kind: "action",
    arity: 1,
    feature: "move",
    description: "Move one tile in a direction (North, South, East, West).",
    args: [{ name: "direction", hint: "North | South | East | West" }],
  },
  {
    name: "plant",
    kind: "action",
    arity: 1,
    feature: "plant",
    description: "Plant a seed on the soil tile the FieldBot stands on.",
    args: [{ name: "crop", hint: "Carrot" }],
  },
  {
    name: "water",
    kind: "action",
    arity: 0,
    feature: "water",
    description: "Water the crop on the tile underneath the FieldBot.",
    args: [],
  },
  {
    name: "harvest",
    kind: "action",
    arity: 0,
    feature: "harvest",
    description: "Harvest the mature crop underneath the FieldBot.",
    args: [],
  },
  {
    name: "can_harvest",
    kind: "sensor",
    arity: 0,
    feature: "sensor",
    description: "True if the tile below holds a mature crop.",
    args: [],
  },
  {
    name: "get_ground_type",
    kind: "sensor",
    arity: 0,
    feature: "sensor",
    description: "The tile type the FieldBot stands on.",
    args: [],
  },
  {
    name: "get_entity_type",
    kind: "sensor",
    arity: 0,
    feature: "sensor",
    description: "The crop type on this tile, or None.",
    args: [],
  },
  {
    name: "get_position_x",
    kind: "sensor",
    arity: 0,
    feature: "sensor",
    description: "Current x column of the FieldBot.",
    args: [],
  },
  {
    name: "get_position_y",
    kind: "sensor",
    arity: 0,
    feature: "sensor",
    description: "Current y row of the FieldBot.",
    args: [],
  },
  {
    name: "get_world_width",
    kind: "sensor",
    arity: 0,
    feature: "sensor",
    description: "Width of the farm world in tiles.",
    args: [],
  },
  {
    name: "get_world_height",
    kind: "sensor",
    arity: 0,
    feature: "sensor",
    description: "Height of the farm world in tiles.",
    args: [],
  },
];

const COMMAND_BY_NAME = new Map(
  COMMAND_DEFINITIONS.map((c) => [c.name, c]),
);

export function getCommand(name: string): CommandDefinition | undefined {
  return COMMAND_BY_NAME.get(name);
}

/** Directions exposed as language constants. */
export const DIRECTION_CONSTANTS = ["North", "South", "East", "West"] as const;

/** Tile constants exposed to scripts. */
export const TILE_CONSTANT_IDS = [
  "Grass",
  "Soil",
  "Water",
  "Rock",
  "Tree",
] as const;

/** Crop constants exposed to scripts (populated from crop data). */
export const CROP_CONSTANTS = ["Carrot"] as const;