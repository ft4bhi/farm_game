import { TILE_DEFINITIONS, TILE_TYPES_BY_STATE, TileType } from "@/data/tiles";
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

/**
 * A "clearable" obstacle: a rock (or similar) that a machine can remove so
 * the cell becomes usable again.
 */
export function isClearableTile(tile: Tile): boolean {
  return tile.type === TileType.ROCK;
}

/**
 * "Cleared" ground: a walkable, plantable-free cell that can be tilled into
 * Soil. This is the state a rock turns into after the RockCutter clears it.
 */
export function isClearTile(tile: Tile): boolean {
  if (isPlantableTile(tile) || !isWalkableTile(tile)) return false;
  return tile.crop === null;
}

/** Everything this tile type can become through gameplay actions. */
export function targetTypeFor(tile: Tile): TileType[] {
  return TILE_TYPES_BY_STATE[tile.type] ?? [];
}

/** Deep-copies a tile (used for run snapshots and save/load). */
export function cloneTile(tile: Tile): Tile {
  return {
    type: tile.type,
    crop: tile.crop ? { id: tile.crop.id, progress: tile.crop.progress } : null,
  };
}