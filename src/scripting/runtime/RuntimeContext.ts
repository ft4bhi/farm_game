import type { Statement } from "@/scripting/parser/AST";
import { constant, type LangValue } from "@/scripting/runtime/Values";
import { RuntimeError } from "@/scripting/runtime/RuntimeError";
import { DIRECTION_CONSTANTS } from "@/data/commands";
import { TILE_DEFINITIONS } from "@/data/tiles";
import { CROP_DEFINITIONS } from "@/data/crops";

export interface UserFunction {
  name: string;
  params: string[];
  body: Statement[];
  closure: Scope;
}

/** Lexical (global-ish) variable scope. Function calls create a child scope. */
export class Scope {
  readonly parent: Scope | null;
  readonly vars = new Map<string, LangValue>();

  constructor(parent: Scope | null = null) {
    this.parent = parent;
  }

  lookup(name: string): LangValue | undefined {
    let scope: Scope | null = this;
    while (scope) {
      const found = scope.vars.get(name);
      if (found !== undefined) return found;
      scope = scope.parent;
    }
    return undefined;
  }

  define(name: string, value: LangValue): void {
    this.vars.set(name, value);
  }
}

/** Values accessible without declaring them (directions, tiles, crops). */
export function buildConstants(): Map<string, LangValue> {
  const map = new Map<string, LangValue>();
  for (const dir of DIRECTION_CONSTANTS) map.set(dir, constant(dir));
  for (const def of Object.values(TILE_DEFINITIONS)) {
    map.set(def.name, constant(def.name));
  }
  for (const def of Object.values(CROP_DEFINITIONS)) {
    map.set(def.constant, constant(def.constant));
  }
  return map;
}

export interface ContextLimits {
  maxSteps: number;
}

/**
 * Runtime state for one program run: scopes, defined functions, constants and
 * the instruction budget.
 */
export class RuntimeContext {
  readonly globalScope: Scope;
  readonly constants: Map<string, LangValue>;
  readonly functions = new Map<string, UserFunction>();
  /** Scope assignments/reads resolve against. Changes when entering a function. */
  currentScope: Scope;
  stepCount = 0;
  readonly maxSteps: number;

  constructor(limits: ContextLimits = { maxSteps: 200_000 }) {
    this.globalScope = new Scope(null);
    this.currentScope = this.globalScope;
    this.constants = buildConstants();
    this.maxSteps = limits.maxSteps;
  }

  /** Counts one interpreter step; throws once the budget is exhausted. */
  bump(line: number): void {
    this.stepCount += 1;
    if (this.stepCount > this.maxSteps) {
      throw new RuntimeError(
        "Program exceeded the instruction budget.\nThis usually means the program loops forever.",
        line,
      );
    }
  }

  defineFunction(fn: UserFunction): void {
    this.functions.set(fn.name, fn);
  }

  getFunction(name: string): UserFunction | undefined {
    return this.functions.get(name);
  }

  resolveName(name: string, line: number): LangValue {
    const found = this.currentScope.lookup(name);
    if (found !== undefined) return found;
    const constantValue = this.constants.get(name);
    if (constantValue !== undefined) return constantValue;
    throw new RuntimeError(
      `Name '${name}' is not defined in this scope.`,
      line,
    );
  }
}