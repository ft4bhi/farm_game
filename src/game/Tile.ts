import { TILE_DEFINITIONS, type TileType } from "@/data/tiles";
import type { CropState } from "@/game/Crop";

/** A single cell of the farm world. */
export interface Tile {
  type: TileType;
  /** Present only on plantable tiles that hold a crop. */
  crop: CropState | null;
}

export function createTile(type: TileType): Tile {
  return { type, crop: null };
}

export function isWalkableTile(tile: Tile): boolean {
  return TILE_DEFINITIONS[tile.type].walkable;
}

export function isPlantableTile(tile: Tile): boolean {
  return TILE_DEFINITIONS[tile.type].plantable;
}

export function isBlockedTile(tile: Tile): boolean {
  return !isWalkableTile(tile);
}

/** Deep-copies a tile (used for run snapshots and save/load). */
export function cloneTile(tile: Tile): Tile {
  return {
    type: tile.type,
    crop: tile.crop ? { id: tile.crop.id, progress: tile.crop.progress } : null,
  };
}