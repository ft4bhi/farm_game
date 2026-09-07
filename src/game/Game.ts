import { EventBus } from "@/events/Bus";
import { Simulation } from "@/engine/Simulation";
import { UnlockSystem } from "@/progression/UnlockSystem";
import { ChallengeManager, type ChallengeView } from "@/progression/ChallengeManager";
import { ScriptRunner, type ScriptStatus } from "@/scripting/ScriptRunner";
import { Renderer } from "@/rendering/Renderer";
import { GameLoop } from "@/game/GameLoop";
import {
  SaveSystem,
  SaveError,
} from "@/persistence/SaveSystem";
import { STARTER_SCRIPT, LOOP_SAMPLE_SCRIPT, FUNCTION_SAMPLE_SCRIPT } from "@/data/scripts";
import {
  DEFAULT_SETTINGS,
  EXECUTION_SPEEDS,
  type ExecutionSpeed,
  type GameSettings,
} from "@/data/config";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import type { GameState } from "@/game/GameState";

export interface HudSnapshot {
  resources: Record<string, number>;
  status: ScriptStatus;
  currentLine: number | null;
  errorLine: number | null;
  errorMessage: string | null;
  ticksUsed: number;
  challenges: ChallengeView[];
  upgrades: { id: string; title: string; description: string; unlocked: boolean; order: number }[];
  settings: GameSettings;
  script: string;
}

/**
 * The top-level game object. Owns the simulation, scripting, renderer and the
 * frame loop, and exposes a small API for the React shell. The UI never pokes
 * the canvas or the game state directly.
 */
export class Game {
  readonly bus = new EventBus();
  readonly simulation: Simulation;
  readonly unlocks: UnlockSystem;
  readonly challenges: ChallengeManager;
  readonly scriptRunner: ScriptRunner;
  readonly renderer: Renderer;
  private readonly loop: GameLoop;
  private readonly saves: SaveSystem;
  private script: string;
  private settings: GameSettings;
  private runSnapshot:
    | { world: ReturnType<Simulation["captureWorld"]>["world"]; worker: ReturnType<Simulation["captureWorld"]>["worker"] }
    | null = null;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private readonly bootMessages: { level: "system" | "info" | "ok" | "error" | "warn"; text: string; line: number | null }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.saves = new SaveSystem();

    let initialState: GameState | undefined;
    let savedScript: string | undefined;
    let savedSettings: GameSettings | undefined;
    try {
      const loaded = this.saves.load();
      if (loaded) {
        initialState = loaded.game;
        savedScript = loaded.script;
        savedSettings = loaded.settings;
      }
    } catch (err) {
      if (err instanceof SaveError || err instanceof Error) {
        const message = err instanceof SaveError ? err.message : "Save could not be read.";
        this.bootMessages.push({
          level: "warn",
          text: `Saved game was corrupted and discarded.\n${message}`,
          line: null,
        });
        this.bootMessages.push({
          level: "system",
          text: "Starting a fresh farm.",
          line: null,
        });
      }
    }

    this.simulation = new Simulation(this.bus, initialState);
    this.unlocks = new UnlockSystem(
      this.bus,
      this.simulation.state.progression.unlockedUpgrades,
    );
    this.challenges = new ChallengeManager(this.bus, this.simulation, this.unlocks);
    this.scriptRunner = new ScriptRunner(this.bus, this.simulation, this.unlocks, this.challenges);

    this.script = savedScript ?? STARTER_SCRIPT;
    this.settings = savedSettings ?? { ...DEFAULT_SETTINGS };

    this.renderer = new Renderer(canvas, this.simulation, () => {
      return EXECUTION_SPEEDS[this.settings.executionSpeed].actionMs;
    });

    this.loop = new GameLoop((dt, now) => this.frame(dt, now));

    this.wireEvents();
    this.loop.start();
  }

  private wireEvents(): void {
    this.bus.on("execution.status", ({ status }) => {
      this.simulation.setTimePaused(status === "paused");
    });

    this.bus.on("crop.watered", ({ x, y }) => {
      this.renderer.effectsRenderer.add({
        kind: "water",
        tx: x,
        ty: y,
        startedAt: performance.now(),
      });
    });
    this.bus.on("crop.harvested", ({ x, y }) => {
      this.renderer.effectsRenderer.add({
        kind: "harvest",
        tx: x,
        ty: y,
        startedAt: performance.now(),
      });
    });
    this.bus.on("crop.planted", ({ x, y }) => {
      this.renderer.effectsRenderer.add({
        kind: "plant",
        tx: x,
        ty: y,
        startedAt: performance.now(),
      });
    });

    this.bus.on("resource.changed", () => this.scheduleAutosave());
    this.bus.on("challenge.completed", () => this.scheduleAutosave());
    this.bus.on("upgrade.unlocked", () => this.scheduleAutosave());
  }

  private frame(dtSeconds: number, nowMs: number): void {
    if (this.destroyed) return;
    this.simulation.update(dtSeconds);
    this.renderer.render(nowMs);
  }

  // ---- public API used by the React shell --------------------------------

  run(): void {
    this.captureRunSnapshot();
    void this.scriptRunner.start(this.script, "run");
  }

  step(): void {
    this.captureRunSnapshot();
    void this.scriptRunner.step();
  }

  pause(): void {
    this.scriptRunner.pause();
  }

  resume(): void {
    this.scriptRunner.resume();
  }

  stop(): void {
    this.scriptRunner.stop();
  }

  reset(): void {
    this.scriptRunner.toIdle();
    if (this.runSnapshot) {
      this.simulation.restoreWorld(this.runSnapshot);
      this.runSnapshot = null;
      this.bus.emit("console.message", {
        level: "system",
        text: "Reset to the state at the start of this run.",
        line: null,
      });
    } else {
      this.simulation.restoreWorld({
        world: {
          ...this.simulation.capture().world,
        },
        worker: { x: this.simulation.world.startX, y: this.simulation.world.startY, facing: "North" },
      });
      this.bus.emit("console.message", {
        level: "system",
        text: "FieldBot returned to its starting position.",
        line: null,
      });
    }
    this.simulation.ticks.reset();
  }

  getScript(): string {
    return this.script;
  }

  setScript(script: string): void {
    this.script = script;
    this.scheduleAutosave();
  }

  loadSample(kind: "starter" | "loop" | "function"): string {
    switch (kind) {
      case "loop":
        return LOOP_SAMPLE_SCRIPT;
      case "function":
        return FUNCTION_SAMPLE_SCRIPT;
      default:
        return STARTER_SCRIPT;
    }
  }

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  setSpeed(speed: ExecutionSpeed): void {
    this.settings.executionSpeed = speed;
    this.scriptRunner.speed = speed;
    this.scheduleAutosave();
  }

  /** Wipes everything (progress, farm, script) and starts fresh. */
  resetAllProgress(): void {
    this.scriptRunner.toIdle();
    this.simulation.resetToFresh();
    this.script = STARTER_SCRIPT;
    this.runSnapshot = null;
    this.saves.clear();
    this.bus.emit("save.reset", {});
    this.bus.emit("console.message", {
      level: "system",
      text: "All progress reset. Welcome back to a fresh farm!",
      line: null,
    });
  }

  hudSnapshot(): HudSnapshot {
    return {
      resources: this.simulation.resources.all(),
      status: this.scriptRunner.status,
      currentLine: null,
      errorLine: null,
      errorMessage: null,
      ticksUsed: this.simulation.ticks.total,
      challenges: this.challenges.list(),
      upgrades: UPGRADE_DEFINITIONS.map((u) => ({
        id: u.id,
        title: u.title,
        description: u.description,
        unlocked: this.unlocks.hasUpgrade(u.id),
        order: u.order,
      })).sort((a, b) => a.order - b.order),
      settings: this.getSettings(),
      script: this.script,
    };
  }

  bootMessagesSnapshot(): { level: "system" | "info" | "ok" | "error" | "warn"; text: string; line: number | null }[] {
    return [...this.bootMessages];
  }

  destroy(): void {
    this.destroyed = true;
    this.loop.stop();
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.saveNow();
    this.bus.clear();
  }

  // ---- internals ---------------------------------------------------------

  private captureRunSnapshot(): void {
    const captured = this.simulation.captureWorld();
    this.runSnapshot = {
      world: captured.world,
      worker: { ...captured.worker },
    };
  }

  private scheduleAutosave(): void {
    if (this.destroyed) return;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = null;
      this.saveNow();
    }, 400);
  }

  private saveNow(): void {
    if (this.destroyed) return;
    const payload: SavePayloadData = {
      version: 1,
      savedAt: Date.now(),
      game: this.simulation.capture(),
      script: this.script,
      settings: this.settings,
    };
    this.saves.save(payload);
    this.bus.emit("save.saved", {});
  }
}

type SavePayloadData = {
  version: number;
  savedAt: number;
  game: GameState;
  script: string;
  settings: GameSettings;
};