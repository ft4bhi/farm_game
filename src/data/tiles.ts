export const enum TileType {
  GRASS = "grass",
  SOIL = "soil",
  WATER = "water",
  ROCK = "rock",
  TREE = "tree",
}

export interface TileDefinition {
  type: TileType;
  name: string;
  walkable: boolean;
  plantable: boolean;
  /** Hex-like color used by the renderer. */
  color: string;
  /** Secondary color for texture detail. */
  detailColor: string;
  /** Draw order layer: water below objects, etc. */
  layer: number;
}

export const TILE_DEFINITIONS: Record<TileType, TileDefinition> = {
  [TileType.GRASS]: {
    type: TileType.GRASS,
    name: "Grass",
    walkable: true,
    plantable: false,
    color: "#4f8a3c",
    detailColor: "#5e9c48",
    layer: 0,
  },
  [TileType.SOIL]: {
    type: TileType.SOIL,
    name: "Soil",
    walkable: true,
    plantable: true,
    color: "#6b4a2b",
    detailColor: "#7d5835",
    layer: 0,
  },
  [TileType.WATER]: {
    type: TileType.WATER,
    name: "Water",
    walkable: false,
    plantable: false,
    color: "#3d7ea6",
    detailColor: "#4f92ba",
    layer: 0,
  },
  [TileType.ROCK]: {
    type: TileType.ROCK,
    name: "Rock",
    walkable: false,
    plantable: false,
    color: "#7d8188",
    detailColor: "#98a0a8",
    layer: 1,
  },
  [TileType.TREE]: {
    type: TileType.TREE,
    name: "Tree",
    walkable: false,
    plantable: false,
    color: "#2f5a22",
    detailColor: "#3b6e2b",
    layer: 1,
  },
};

export const ALL_TILE_TYPES: TileType[] = [
  TileType.GRASS,
  TileType.SOIL,
  TileType.WATER,
  TileType.ROCK,
  TileType.TREE,
];

/** Language constant ids (scripting) mapped to tile types. */
export const TILE_CONSTANTS: Record<string, TileType> = {
  Grass: TileType.GRASS,
  Soil: TileType.SOIL,
  Water: TileType.WATER,
  Rock: TileType.ROCK,
  Tree: TileType.TREE,
};