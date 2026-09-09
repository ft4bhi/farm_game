import {
  COMMAND_DEFINITIONS,
  getCommand,
  type CommandDefinition,
} from "@/data/commands";

/**
 * Runtime view of the command table. Keeps the rest of the scripting layer
 * decoupled from the raw data module. Commands are data-driven: add a new
 * command by appending to `data/commands.ts` and implementing it in
 * `engine/ActionSystem.ts`.
 */
export class CommandRegistry {
  private readonly byName = new Map<string, CommandDefinition>();

  constructor() {
    for (const def of COMMAND_DEFINITIONS) this.byName.set(def.name, def);
  }

  lookup(name: string): CommandDefinition | undefined {
    return this.byName.get(name);
  }

  featureOf(name: string): string | null {
    return this.byName.get(name)?.feature ?? null;
  }

  isAction(name: string): boolean {
    return this.byName.get(name)?.kind === "action";
  }

  all(): CommandDefinition[] {
    return [...this.byName.values()];
  }
}

export function getRuntimeCommand(name: string): CommandDefinition | undefined {
  return getCommand(name);
}

/** Human label for a capability feature (used in error messages). */
export function describeFeature(feature: string): string {
  switch (feature) {
    case "move":
    case "plant":
    case "water":
    case "harvest":
    case "till":
      return "Basic Farming";
    case "rock_cut":
      return "RockCutter";
    case "sensor":
      return "Field Sensors";
    case "loop":
      return "Automation Loops";
    case "function":
      return "Reusable Functions";
    default:
      return feature;
  }
}