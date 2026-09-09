/**
 * Data-driven machine definitions. Machines describe *what a machine can do*;
 * the actual rules live in the simulation/action layer. Adding a new machine
 * (TreeHarvester, Excavator, …) is done here plus a matching action — no UI or
 * renderer edits are required for the data model itself.
 */

export type MachineCapability =
  | "movement"
  | "planting"
  | "watering"
  | "harvesting"
  | "tilling"
  | "rock_removal"
  | "tree_removal"
  | "excavation";

export interface MachineDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** What this machine can actually do, used by the UI and gating. */
  capabilities: MachineCapability[];
  /** Id of the upgrade that unlocks the machine (null = available at start). */
  unlockRequirement: string | null;
  /** Ticks consumed per machine action (see ACTION_COSTS). */
  actionCost: string;
}

/** The FieldBot: precision farming carried out by player programs. */
export const FIELD_BOT: MachineDefinition = {
  id: "field_bot",
  name: "FieldBot",
  icon: "🤖",
  description: "Your programmable worker. Moves, plants, waters, harvests and tills ground.",
  capabilities: ["movement", "planting", "watering", "harvesting", "tilling"],
  unlockRequirement: null,
  actionCost: "move",
};

/** The RockCutter: breaks rocks so the field can grow. */
export const ROCK_CUTTER: MachineDefinition = {
  id: "rock_cutter",
  name: "RockCutter",
  icon: "⛏️",
  description: "Attached to the front of the FieldBot. Clears rocks on the tile ahead.",
  capabilities: ["rock_removal"],
  unlockRequirement: "rock_cutter",
  actionCost: "clear",
};

export const MACHINE_DEFINITIONS: Record<string, MachineDefinition> = {
  [FIELD_BOT.id]: FIELD_BOT,
  [ROCK_CUTTER.id]: ROCK_CUTTER,
};

export function getMachine(id: string): MachineDefinition | undefined {
  return MACHINE_DEFINITIONS[id];
}

/** Machines that use a capability. Order defines the UI listing. */
export function machinesWithCapability(
  capability: MachineCapability,
): MachineDefinition[] {
  return Object.values(MACHINE_DEFINITIONS).filter((m) =>
    m.capabilities.includes(capability),
  );
}