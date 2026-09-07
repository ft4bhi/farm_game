import { parseScript, Parser } from "@/scripting/parser/Parser";
import { RuntimeContext } from "@/scripting/runtime/RuntimeContext";
import { interpretProgram, type EngineArg } from "@/scripting/runtime/Interpreter";
import { RuntimeError } from "@/scripting/runtime/RuntimeError";
import { GameActionError } from "@/engine/GameActionError";
import { getCommand } from "@/data/commands";
import { EventBus } from "@/events/Bus";
import { Simulation } from "@/engine/Simulation";
import { ScriptSyntaxError } from "@/scripting/ScriptSyntaxError";
import type { Program } from "@/scripting/parser/AST";

export interface HarnessResult {
  program: Program;
  stepCount: number;
  actionCount: number;
  error: Error | null;
}

/**
 * Drives the interpreter to completion synchronously, forwarding every game
 * command to a real Simulation. Action pacing and highlighting are skipped —
 * this mirrors what ScriptRunner does but without browser timing.
 */
export function runScript(
  source: string,
  simulation: Simulation,
  opts: { maxSteps?: number } = {},
): HarnessResult {
  const program = new Parser().parse(source);
  const ctx = new RuntimeContext({ maxSteps: opts.maxSteps ?? 200_000 });
  const gen = interpretProgram(program, ctx);
  const result: HarnessResult = {
    program,
    stepCount: 0,
    actionCount: 0,
    error: null,
  };

  let send: EngineArg | undefined = undefined;
  for (;;) {
    let res: IteratorResult<unknown, void>;
    try {
      res = gen.next(send as EngineArg);
    } catch (err) {
      result.error = err as Error;
      return result;
    }
    if (res.done) return result;

    const yielded = res.value as {
      kind: string;
      line?: number;
      name?: string;
      args?: EngineArg[];
    };
    if (yielded.kind === "step") {
      result.stepCount += 1;
      send = undefined;
      continue;
    }
    if (yielded.kind === "host") {
      const name = yielded.name as string;
      const args = yielded.args as EngineArg[];
      const line = yielded.line as number;
      const def = getCommand(name);
      result.stepCount += 1;
      result.actionCount += 1;
      if (!def) {
        result.error = new RuntimeError(`Unknown function: ${name}()`, line);
        return result;
      }
      try {
        const r = simulation.executeCommand(name, args);
        send = def.kind === "action" ? undefined : r.returnValue;
      } catch (err) {
        if (err instanceof GameActionError) {
          result.error = new RuntimeError(err.message, line);
        } else {
          result.error = err as Error;
        }
        return result;
      }
    }
  }
}

/** Convenience wrapper for scripts that end successfully. */
export function runOk(source: string, simulation: Simulation): HarnessResult {
  const result = runScript(source, simulation);
  if (result.error) throw result.error;
  return result;
}

export function expectSyntaxError(source: string): ScriptSyntaxError {
  try {
    new Parser().parse(source);
  } catch (err) {
    const sse = err as ScriptSyntaxError;
    if (!(sse instanceof ScriptSyntaxError)) throw err;
    return sse;
  }
  throw new Error("Expected a syntax error, but the script parsed fine.");
}

/** Fresh simulation bound to a real EventBus. */
export function makeSimulation(): Simulation {
  return new Simulation(new EventBus());
}