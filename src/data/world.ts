import { TileType } from "@/data/tiles";

/**
 * The starter map is defined as rows of characters so the layout is easy to
 * read and edit. Larger/other worlds are created by editing this data, not by
 * changing engine code.
 *
 * Legend:
 *   T = Tree   R = Rock   ~ = Water   , = Grass   # = Soil
 */
const MAP_ROWS: string[] = [
  "TTTTTTTTTTTTTTTT",
  "TR,~~,,,,,,,,TRT",
  "T,,~,,,,T,,,,,,T",
  "T,R~,,,,R,,,,,,T",
  "T,,,,,,,,,,R,,,T",
  "T,,,########,,,T",
  "T,,,########,T,T",
  "T,,,########,R,T",
  "T,,,########,R,T",
  "T,,,########,,,T",
  "T,,,,,,R,,,,,,,T",
  "TTTTTTTTTTTTTTTT",
];

const CHAR_TO_TILE: Record<string, TileType> = {
  T: TileType.TREE,
  R: TileType.ROCK,
  "~": TileType.WATER,
  ",": TileType.GRASS,
  "#": TileType.SOIL,
};

export interface WorldConfig {
  width: number;
  height: number;
  /** Initial robot position. */
  startX: number;
  startY: number;
  /** Parsed tile grid, row-major: tiles[y][x]. */
  tiles: TileType[][];
}

export const WORLD_CONFIG: WorldConfig = parseWorld(MAP_ROWS, 4, 10);

function parseWorld(
  rows: string[],
  startX: number,
  startY: number,
): WorldConfig {
  const height = rows.length;
  const width = rows[0].length;
  const tiles: TileType[][] = [];

  for (const row of rows) {
    if (row.length !== width) {
      throw new Error(
        `World map rows must all be ${width} tiles wide; got ${row.length}.`,
      );
    }
    const gridRow: TileType[] = [];
    for (const ch of row) {
      const tile = CHAR_TO_TILE[ch];
      if (tile === undefined) {
        throw new Error(`Unknown map character '${ch}'.`);
      }
      gridRow.push(tile);
    }
    tiles.push(gridRow);
  }

  if (!(startY >= 0 && startY < height && startX >= 0 && startX < width)) {
    throw new Error("World start position is out of bounds.");
  }

  return { width, height, startX, startY, tiles };
}