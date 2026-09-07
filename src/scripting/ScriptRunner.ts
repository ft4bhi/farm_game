import { parseScript } from "@/scripting/parser/Parser";
import { ScriptSyntaxError } from "@/scripting/ScriptSyntaxError";
import type { Program, Statement, Expr } from "@/scripting/parser/AST";
import { RuntimeError } from "@/scripting/runtime/RuntimeError";
import { RuntimeContext } from "@/scripting/runtime/RuntimeContext";
import {
  interpretProgram,
  type EngineArg,
  type ExecYield,
} from "@/scripting/runtime/Interpreter";
import {
  describeFeature,
  getRuntimeCommand,
} from "@/scripting/commands/CommandRegistry";
import type { Simulation } from "@/engine/Simulation";
import type { UnlockSystem } from "@/progression/UnlockSystem";
import type { ChallengeManager, RunReport } from "@/progression/ChallengeManager";
import type { EventBus } from "@/events/Bus";
import { EXECUTION_LIMITS, EXECUTION_SPEEDS, type ExecutionSpeed } from "@/data/config";
import { TILE_DEFINITIONS, type TileType } from "@/data/tiles";

export type ScriptStatus =
  | "idle"
  | "running"
  | "paused"
  | "finished"
  | "stopped"
  | "error";

export interface ExecutionDetail {
  currentLine: number | null;
  errorLine: number | null;
  errorMessage: string | null;
  ticksUsed: number;
  actionsUsed: number;
  instructionsUsed: number;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Drives an interpreted program in lock-step with the simulation engine.
 *
 * The interpreter yields a stream of "step" (line highlight) and "host"
 * (game command) events. The ScriptRunner forwards commands to the
 * ActionSystem, waits for the dramatic pause between actions, and respects
 * pause/stop/step controls. It never evaluates player-written JavaScript.
 */
export class ScriptRunner {
  status: ScriptStatus = "idle";
  private script = "";
  private gen: Generator<ExecYield, void, EngineArg> | null = null;
  private sendValue: EngineArg | undefined;
  private runId = 0;
  private paused = false;
  private pendingSteps = 0;
  private actionsInRun = 0;
  private instructionsInRun = 0;
  private currentLine: number | null = null;
  private errorLine: number | null = null;
  private errorMessage: string | null = null;
  private usedLoop = false;
  private harvestsInRun = 0;
  private readonly program = { current: null as Program | null };
  speed: ExecutionSpeed = "normal";

  private detail: ExecutionDetail = {
    currentLine: null,
    errorLine: null,
    errorMessage: null,
    ticksUsed: 0,
    actionsUsed: 0,
    instructionsUsed: 0,
  };

  constructor(
    private readonly bus: EventBus,
    private readonly simulation: Simulation,
    private readonly unlocks: UnlockSystem,
    private readonly challenges: ChallengeManager,
  ) {
    // Count harvests inside the current run for the automation challenge.
    this.bus.on("crop.harvested", () => {
      if (this.status === "running" || this.status === "paused") {
        this.harvestsInRun += 1;
      }
    });
  }

  getTicksUsed(): number {
    return this.simulation.ticks.total;
  }

  detailSnapshot(): ExecutionDetail {
    return { ...this.detail };
  }

  private emitDetail(): void {
    this.detail = {
      currentLine: this.currentLine,
      errorLine: this.errorLine,
      errorMessage: this.errorMessage,
      ticksUsed: this.simulation.ticks.total,
      actionsUsed: this.actionsInRun,
      instructionsUsed: this.instructionsInRun,
    };
    this.bus.emit("execution.detail", this.detail);
  }

  private setStatus(status: ScriptStatus): void {
    this.status = status;
    this.bus.emit("execution.status", { status });
  }

  async start(script: string, mode: "run" | "step" = "run"): Promise<void> {
    this.runId += 1;
    const id = this.runId;
    this.script = script;
    this.paused = false;
    this.pendingSteps = mode === "step" ? 1 : 0;
    this.currentLine = null;
    this.errorLine = null;
    this.errorMessage = null;
    this.actionsInRun = 0;
    this.instructionsInRun = 0;
    this.harvestsInRun = 0;

    let program: Program;
    try {
      program = parseScript(script);
    } catch (err) {
      if (err instanceof ScriptSyntaxError) {
        this.errorLine = err.line;
        this.errorMessage = err.message;
        this.setStatus("error");
        this.bus.emit("console.message", {
          level: "error",
          text: err.message,
          line: err.line,
        });
        this.emitDetail();
        return;
      }
      throw err;
    }

    const gate = findFeatureGate(program, this.unlocks);
    if (gate) {
      this.errorLine = gate.line;
      this.errorMessage = gate.message;
      this.setStatus("error");
      this.bus.emit("console.message", {
        level: "error",
        text: gate.message,
        line: gate.line,
      });
      this.emitDetail();
      return;
    }

    this.program.current = program;
    this.usedLoop = usesLoop(program);

    this.simulation.ticks.reset();
    const ctx = new RuntimeContext({ maxSteps: EXECUTION_LIMITS.maxInstructions });
    this.gen = interpretProgram(program, ctx);
    this.sendValue = undefined;

    this.setStatus("running");
    this.bus.emit("program.started", {});
    this.bus.emit("console.message", {
      level: "system",
      text: "Program started.",
      line: null,
    });
    this.emitDetail();

    try {
      await this.driver(id);
    } catch (err) {
      // Final safety net — no player input should ever crash the shell.
      this.reportError(err as Error, null);
      if (this.status !== "error") this.setStatus("error");
    }
  }

  pause(): void {
    if (this.status !== "running") return;
    this.paused = true;
    this.setStatus("paused");
  }

  resume(): void {
    if (this.status !== "paused") return;
    this.pendingSteps = 0;
    this.paused = false;
    this.setStatus("running");
  }

  stop(): void {
    if (this.status !== "running" && this.status !== "paused") return;
    this.runId += 1;
    this.paused = false;
    this.gen = null;
    this.setStatus("stopped");
    this.bus.emit("console.message", {
      level: "system",
      text: "Program stopped.",
      line: null,
    });
    this.emitDetail();
  }

  async step(): Promise<void> {
    if (this.status === "idle" || this.status === "finished" || this.status === "error" || this.status === "stopped") {
      await this.start(this.script, "step");
      return;
    }
    if (this.status === "running") {
      this.pause();
      return;
    }
    if (this.status === "paused") {
      this.pendingSteps = 1;
      this.paused = false;
      this.setStatus("running");
    }
  }

  /** Moves back to the idle state (used by RESET). */
  toIdle(): void {
    this.runId += 1;
    this.paused = false;
    this.gen = null;
    this.currentLine = null;
    this.errorLine = null;
    this.errorMessage = null;
    this.actionsInRun = 0;
    this.instructionsInRun = 0;
    this.setStatus("idle");
    this.emitDetail();
  }

  private async driver(id: number): Promise<void> {
    let sinceBreak = 0;
    while (true) {
      if (this.runId !== id) return;

      // Hold while paused unless a single-step was requested.
      while (this.paused && this.pendingSteps === 0) {
        if (this.runId !== id) return;
        await sleep(30);
      }
      if (this.runId !== id) return;

      let done: boolean;
      try {
        const res = this.gen!.next(this.sendValue as EngineArg);
        this.sendValue = undefined;
        done = res.done === true;
        if (!res.done) {
          const yielded = res.value;
          if (yielded.kind === "step") {
            this.instructionsInRun += 1;
            this.currentLine = yielded.line;
            this.emitDetail();
            sinceBreak += 1;
            if (sinceBreak >= EXECUTION_LIMITS.throttleEvery) {
              sinceBreak = 0;
              await sleep(0);
            }
            continue;
          }
          this.sendValue = await this.handleHost(yielded, id);
        }
      } catch (err) {
        this.reportError(err as Error, id);
        return;
      }

      if (done) {
        this.finish(id);
        return;
      }

      // One meaningful action executed (STEP): pause again.
      if (this.pendingSteps > 0) {
        this.pendingSteps -= 1;
        this.paused = true;
        this.setStatus("paused");
      }
    }
  }

  private async handleHost(req: { kind: "host"; name: string; args: EngineArg[]; line: number }, id: number): Promise<EngineArg | undefined> {
    this.instructionsInRun += 1;
    const def = getRuntimeCommand(req.name);
    if (!def) {
      throw new RuntimeError(
        `Unknown function: ${req.name}()\n\nDid you mean one of the built-in commands?`,
        req.line,
      );
    }

    if (!this.unlocks.hasFeature(def.feature)) {
      throw new RuntimeError(
        `'${req.name}()' requires the ${describeFeature(def.feature)} upgrade.\nComplete the prerequisite challenge to unlock it.`,
        req.line,
      );
    }

    if (def.kind === "action") {
      if (this.actionsInRun >= EXECUTION_LIMITS.maxActions) {
        throw new RuntimeError(
          "Program performed too many actions.\nStopped for safety — use loops more efficiently.",
          req.line,
        );
      }
      this.actionsInRun += 1;
      const result = this.runSafe(() => this.simulation.executeCommand(req.name, req.args), req.line);
      this.currentLine = req.line;
      this.bus.emit("console.message", {
        level: "info",
        text: `[Line ${req.line}] ${result.message ?? requeueName(req.name)}`,
        line: req.line,
      });
      this.emitDetail();
      await this.pacedWait(id, this.actionDuration());
      return undefined;
    }

    // Sensor: query the world and return a value immediately.
    const sensor = this.runSafe(() => this.simulation.executeCommand(req.name, req.args), req.line);
    return this.adaptSensorValue(req.name, sensor.returnValue);
  }

  private runSafe<T>(fn: () => T, line: number): T {
    try {
      return fn();
    } catch (err) {
      if (isGameActionError(err)) {
        throw new RuntimeError(err.message, line);
      }
      throw err;
    }
  }

  private adaptSensorValue(name: string, value: EngineArg | undefined): EngineArg | undefined {
    if (name === "get_ground_type" && typeof value === "string") {
      return TILE_DEFINITIONS[value as TileType]?.name ?? value;
    }
    return value;
  }

  private actionDuration(): number {
    return EXECUTION_SPEEDS[this.speed].actionMs;
  }

  private async pacedWait(id: number, ms: number): Promise<void> {
    let left = ms;
    while (left > 0) {
      if (this.runId !== id) return;
      while (this.paused && this.pendingSteps === 0) {
        if (this.runId !== id) return;
        await sleep(30);
      }
      if (this.runId !== id) return;
      await sleep(8);
      left -= 8;
    }
  }

  private finish(id: number): void {
    if (this.runId !== id) return;
    this.gen = null;
    this.currentLine = null;
    this.setStatus("finished");
    this.bus.emit("console.message", {
      level: "ok",
      text: `Program finished. (${this.simulation.ticks.total} ops, ${this.actionsInRun} actions)`,
      line: null,
    });
    this.bus.emit("program.finished", {
      ticksUsed: this.simulation.ticks.total,
      actionsUsed: this.actionsInRun,
      instructionsUsed: this.instructionsInRun,
    });
    const report: RunReport = {
      usedLoop: this.usedLoop,
      harvestsInRun: this.harvestsInRun,
      instructionsUsed: this.instructionsInRun,
      ticksUsed: this.simulation.ticks.total,
    };
    this.challenges.reportRun(report);
    this.emitDetail();
  }

  private reportError(err: Error, id: number | null): void {
    if (id !== null && this.runId !== id) return;
    this.gen = null;
    if (err instanceof RuntimeError) {
      this.errorLine = err.line;
      this.errorMessage = err.message;
      this.bus.emit("console.message", { level: "error", text: err.message, line: err.line });
    } else {
      this.errorLine = null;
      this.errorMessage = `Unexpected error: ${err.message}`;
      this.bus.emit("console.message", {
        level: "error",
        text: `Unexpected error: ${err.message}`,
        line: null,
      });
    }
    this.setStatus("error");
    this.emitDetail();
  }
}

function requeueName(name: string): string {
  return `${name} done`;
}

function isGameActionError(err: unknown): err is Error & { name: "GameActionError" } {
  return err instanceof Error && err.name === "GameActionError";
}

/** Walks a program and returns the first feature gate that blocks it. */
function findFeatureGate(
  program: Program,
  unlocks: UnlockSystem,
): { line: number; message: string } | null {
  for (const stmt of program.statements) {
    const gate = gateStatement(stmt, unlocks);
    if (gate) return gate;
  }
  return null;
}

function gateStatement(stmt: Statement, unlocks: UnlockSystem): { line: number; message: string } | null {
  switch (stmt.kind) {
    case "call": {
      const gate = gateExpr(stmt.expr, unlocks);
      if (gate) return gate;
      break;
    }
    case "if": {
      for (const branch of stmt.branches) {
        const gate = gateExpr(branch.cond, unlocks);
        if (gate) return gate;
        for (const inner of branch.body) {
          const g = gateStatement(inner, unlocks);
          if (g) return g;
        }
      }
      if (stmt.elseBody) for (const inner of stmt.elseBody) {
        const g = gateStatement(inner, unlocks);
        if (g) return g;
      }
      break;
    }
    case "for": {
      if (!unlocks.hasFeature("loop")) {
        return { line: stmt.line, message: loopLockedMessage(stmt.line) };
      }
      for (const inner of stmt.body) {
        const g = gateStatement(inner, unlocks);
        if (g) return g;
      }
      break;
    }
    case "while": {
      if (!unlocks.hasFeature("loop")) {
        return { line: stmt.line, message: loopLockedMessage(stmt.line) };
      }
      for (const inner of stmt.body) {
        const g = gateStatement(inner, unlocks);
        if (g) return g;
      }
      break;
    }
    case "def": {
      if (!unlocks.hasFeature("function")) {
        return {
          line: stmt.line,
          message: `Line ${stmt.line}\n\n'def' requires the ${describeFeature("function")} upgrade.\nProve you can automate a field with loops to unlock reusable functions.`,
        };
      }
      for (const inner of stmt.body) {
        const g = gateStatement(inner, unlocks);
        if (g) return g;
      }
      break;
    }
    case "assignment": {
      const gate = gateExpr(stmt.value, unlocks);
      if (gate) return gate;
      break;
    }
    case "return": {
      if (stmt.value) {
        const gate = gateExpr(stmt.value, unlocks);
        if (gate) return gate;
      }
      break;
    }
  }
  return null;
}

function loopLockedMessage(line: number): string {
  return `Line ${line}\n\nLoops require the ${describeFeature("loop")} upgrade.\nHarvest 5 carrots to unlock for and while loops.`;
}

function gateExpr(expr: Expr, unlocks: UnlockSystem): { line: number; message: string } | null {
  switch (expr.kind) {
    case "call": {
      const def = commandFor(expr.callee);
      if (def && expr.callee !== "range" && !unlocks.hasFeature(def.feature)) {
        return {
          line: expr.line,
          message: `Line ${expr.line}\n\n'${expr.callee}()' requires the ${describeFeature(def.feature)} upgrade.\nComplete the prerequisite challenge to unlock it.`,
        };
      }
      for (const arg of expr.args) {
        const g = gateExpr(arg, unlocks);
        if (g) return g;
      }
      break;
    }
    case "binary":
    case "unary": {
      const g1 = gateExpr((expr as { left: Expr }).left ?? (expr as { operand: Expr }).operand, unlocks);
      if (g1) return g1;
      if ((expr as { right?: Expr }).right) {
        return gateExpr((expr as { right: Expr }).right, unlocks);
      }
      break;
    }
    default:
      break;
  }
  return null;
}

function commandFor(name: string) {
  return getRuntimeCommand(name);
}

function usesLoop(program: Program): boolean {
  const found = { value: false };
  const walk = (stmts: Statement[]) => {
    for (const s of stmts) {
      if (s.kind === "for" || s.kind === "while") {
        found.value = true;
        walk(s.body);
      } else if (s.kind === "if") {
        for (const b of s.branches) walk(b.body);
        if (s.elseBody) walk(s.elseBody);
      } else if (s.kind === "def") {
        walk(s.body);
      }
    }
  };
  walk(program.statements);
  return found.value;
}