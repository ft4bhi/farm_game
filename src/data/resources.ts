export interface ResourceDefinition {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const RESOURCE_DEFINITIONS: Record<string, ResourceDefinition> = {
  carrot: {
    id: "carrot",
    name: "Carrot",
    icon: "🥕",
    color: "#f28c28",
  },
  coin: {
    id: "coin",
    name: "Coins",
    icon: "🪙",
    color: "#f5c542",
  },
  seed_carrot: {
    id: "seed_carrot",
    name: "Carrot Seeds",
    icon: "🌱",
    color: "#8fce5e",
  },
};

export const STARTING_RESOURCES: Record<string, number> = {
  carrot: 0,
  coin: 0,
  seed_carrot: 24,
};

export function resourceDisplayName(id: string): string {
  return RESOURCE_DEFINITIONS[id]?.name ?? id;
}