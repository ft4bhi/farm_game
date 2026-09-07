import { createTile, type Tile } from "@/game/Tile";
import { ALL_TILE_TYPES, TileType } from "@/data/tiles";
import type { CropState } from "@/game/Crop";

/** Serializable square grid of tiles, row-major (y, then x). */
export class Grid {
  readonly width: number;
  readonly height: number;
  private cells: Tile[][];

  constructor(width: number, height: number, fill: TileType = TileType.GRASS) {
    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid grid size ${width}x${height}.`);
    }
    this.width = width;
    this.height = height;
    this.cells = [];
    for (let y = 0; y < height; y += 1) {
      const row: Tile[] = [];
      for (let x = 0; x < width; x += 1) {
        row.push(createTile(fill));
      }
      this.cells.push(row);
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): Tile {
    if (!this.inBounds(x, y)) {
      throw new Error(`Tile (${x}, ${y}) is out of bounds.`);
    }
    return this.cells[y][x];
  }

  set(x: number, y: number, tile: Tile): void {
    if (!this.inBounds(x, y)) {
      throw new Error(`Tile (${x}, ${y}) is out of bounds.`);
    }
    this.cells[y][x] = tile;
  }

  forEach(fn: (tile: Tile, x: number, y: number) => void): void {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        fn(this.cells[y][x], x, y);
      }
    }
  }

  /** Replaces every cell with the contents of another grid. */
  replaceFrom(other: Grid): void {
    if (other.width !== this.width || other.height !== this.height) {
      throw new Error(
        `Cannot replace grid ${this.width}x${this.height} with ${other.width}x${other.height}.`,
      );
    }
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const src = other.get(x, y);
        this.cells[y][x] = {
          type: src.type,
          crop: src.crop ? { id: src.crop.id, progress: src.crop.progress } : null,
        };
      }
    }
  }

  /** Serializes to plain data. */
  toJSON(): { type: TileType; crop: CropState | null }[][] {
    return this.cells.map((row) =>
      row.map((tile) => ({
        type: tile.type,
        crop: tile.crop ? { id: tile.crop.id, progress: tile.crop.progress } : null,
      })),
    );
  }

  /** Loads grid data that was produced by toJSON(). Throws on invalid data. */
  static fromJSON(
    data: { type: string; crop: CropState | null }[][],
  ): Grid {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Grid data is empty.");
    }
    const height = data.length;
    const width = data[0].length;
    const grid = new Grid(width, height);
    for (let y = 0; y < height; y += 1) {
      const row = data[y];
      if (!Array.isArray(row) || row.length !== width) {
        throw new Error(`Grid row ${y} has an invalid length.`);
      }
      for (let x = 0; x < width; x += 1) {
        const cell = row[x];
        if (!cell || typeof cell.type !== "string") {
          throw new Error(`Grid cell (${x}, ${y}) is invalid.`);
        }
        const tileType = (ALL_TILE_TYPES as string[]).includes(cell.type)
          ? (cell.type as TileType)
          : TileType.GRASS;
        const tile = createTile(tileType);
        if (cell.crop && typeof cell.crop.id === "string") {
          tile.crop = {
            id: cell.crop.id,
            progress:
              typeof cell.crop.progress === "number"
                ? Math.max(0, Math.min(1, cell.crop.progress))
                : 0,
          };
        }
        grid.set(x, y, tile);
      }
    }
    return grid;
  }
}