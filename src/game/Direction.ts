import { CROP_DEFINITIONS, type CropDefinition } from "@/data/crops";

export type Direction = "North" | "South" | "East" | "West";

export const DIRECTIONS: Direction[] = ["North", "South", "East", "West"];

export const DIRECTION_DELTAS: Record<Direction, { dx: number; dy: number }> = {
  North: { dx: 0, dy: -1 },
  South: { dx: 0, dy: 1 },
  East: { dx: 1, dy: 0 },
  West: { dx: -1, dy: 0 },
};

export function isDirection(value: unknown): value is Direction {
  return typeof value === "string" && (DIRECTIONS as string[]).includes(value);
}

export function opposite(direction: Direction): Direction {
  switch (direction) {
    case "North":
      return "South";
    case "South":
      return "North";
    case "East":
      return "West";
    case "West":
      return "East";
  }
}