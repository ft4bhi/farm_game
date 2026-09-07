import { DIRECTION_DELTAS, type Direction } from "@/game/Direction";
import { Grid } from "@/game/Grid";
import {
  isBlockedTile,
  isPlantableTile,
  isWalkableTile,
  type Tile,
} from "@/game/Tile";
import { TILE_DEFINITIONS, type TileType } from "@/data/tiles";
import { WORLD_CONFIG } from "@/data/world";
import type { CropState } from "@/game/Crop";
import { CROP_DEFINITIONS } from "@/data/crops";

/**
 * The farm world: a grid of tiles plus the starting position for the robot.
 * The world is pure data/logic and knows nothing about rendering.
 */
export class World {
  readonly width: number;
  readonly height: number;
  readonly startX: number;
  readonly startY: number;
  readonly grid: Grid;
  /** Simulated seconds since farm creation. Drives passive crop growth. */
  worldTime: number;

  constructor(options?: {
    width?: number;
    height?: number;
    startX?: number;
    startY?: number;
    tiles?: TileType[][];
    worldTime?: number;
  }) {
    const width = options?.width ?? WORLD_CONFIG.width;
    const height = options?.height ?? WORLD_CONFIG.height;
    this.width = width;
    this.height = height;
    this.startX = options?.startX ?? WORLD_CONFIG.startX;
    this.startY = options?.startY ?? WORLD_CONFIG.startY;
    this.worldTime = options?.worldTime ?? 0;

    const grid = new Grid(width, height);
    if (options?.tiles) {
      if (options.tiles.length !== height || options.tiles[0].length !== width) {
        throw new Error(
          `World tile data does not match dimensions ${width}x${height}.`,
        );
      }
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          grid.set(x, y, { type: options.tiles[y][x], crop: null });
        }
      }
    } else {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          grid.set(x, y, { type: WORLD_CONFIG.tiles[y][x], crop: null });
        }
      }
    }
    this.grid = grid;
  }

  inBounds(x: number, y: number): boolean {
    return this.grid.inBounds(x, y);
  }

  getTile(x: number, y: number): Tile {
    return this.grid.get(x, y);
  }

  isWalkable(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    return isWalkableTile(this.grid.get(x, y));
  }

  isPlantable(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    return isPlantableTile(this.grid.get(x, y));
  }

  isBlocked(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return true;
    return isBlockedTile(this.grid.get(x, y));
  }

  tileTypeName(type: TileType): string {
    return TILE_DEFINITIONS[type].name;
  }

  /** Target tile coordinates for a move in the given direction. */
  targetPosition(x: number, y: number, direction: Direction): { x: number; y: number } {
    const delta = DIRECTION_DELTAS[direction];
    return { x: x + delta.dx, y: y + delta.dy };
  }

  /**
   * Amount of crop progress gained per second from passive growth.
   * Crops with a water boost mature faster once watered.
   */
  passiveGrowthRate(cropId: string): number {
    const def = CROP_DEFINITIONS[cropId];
    if (!def) return 0;
    return 1 / def.growTime;
  }
}

/** Serialized view of the world for saves/snapshots. */
export interface WorldState {
  width: number;
  height: number;
  worldTime: number;
  tiles: { type: TileType; crop: CropState | null }[][];
}

export function serializeWorld(world: World): WorldState {
  return {
    width: world.width,
    height: world.height,
    worldTime: world.worldTime,
    tiles: world.grid.toJSON(),
  };
}

export function deserializeWorld(state: WorldState): World {
  const world = new World({
    width: state.width,
    height: state.height,
    tiles: state.tiles.map((row) => row.map((cell) => cell.type)),
    worldTime: typeof state.worldTime === "number" ? state.worldTime : 0,
  });
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const cell = state.tiles[y][x];
      if (cell?.crop) {
        world.grid.set(x, y, {
          type: world.grid.get(x, y).type,
          crop: { id: cell.crop.id, progress: cell.crop.progress },
        });
      }
    }
  }
  return world;
}