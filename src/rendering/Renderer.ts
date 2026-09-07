import type { Simulation } from "@/engine/Simulation";
import { Camera } from "@/rendering/Camera";
import { THEME, prefersReducedMotion } from "@/rendering/Theme";
import { WorldRenderer } from "@/rendering/WorldRenderer";
import { WorkerRenderer } from "@/rendering/WorkerRenderer";
import { EffectsRenderer } from "@/rendering/EffectsRenderer";

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * Canvas renderer. Reads simulation state every frame but never mutates it —
 * all game rules live in the simulation, keeping rendering pure presentation.
 */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly camera = new Camera();
  private readonly worldRenderer = new WorldRenderer();
  private readonly workerRenderer = new WorkerRenderer();
  private readonly effects = new EffectsRenderer();
  private reduced = prefersReducedMotion();
  private width = 0;
  private height = 0;

  // Worker movement interpolation (pure presentation state).
  private targetX = 0;
  private targetY = 0;
  private drawX = 0;
  private drawY = 0;
  private startX = 0;
  private startY = 0;
  private animStartMs = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly simulation: Simulation,
    private readonly getActionMs: () => number,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context is unavailable.");
    this.ctx = ctx;
    this.targetX = simulation.worker.x;
    this.targetY = simulation.worker.y;
    this.drawX = simulation.worker.x;
    this.drawY = simulation.worker.y;

    if (typeof window !== "undefined") {
      const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      mq?.addEventListener?.("change", (e) => {
        this.reduced = e.matches;
      });
    }
  }

  get effectsRenderer(): EffectsRenderer {
    return this.effects;
  }

  render(timeMs: number): void {
    this.resizeIfNeeded();
    const dpr = window.devicePixelRatio || 1;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background.
    this.ctx.fillStyle = THEME.background;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const env = {
      ctx: this.ctx,
      camera: this.camera,
      time: timeMs,
      simple: this.reduced,
    };

    this.worldRenderer.draw(env, this.simulation.world);

    const { drawX, drawY, moving } = this.updateWorkerMotion(timeMs);
    this.workerRenderer.draw(env, this.simulation.worker, drawX, drawY, moving);

    this.effects.draw(env, timeMs);
  }

  private updateWorkerMotion(timeMs: number): { drawX: number; drawY: number; moving: boolean } {
    const worker = this.simulation.worker;
    if (worker.x !== this.targetX || worker.y !== this.targetY) {
      this.startX = this.drawX;
      this.startY = this.drawY;
      this.targetX = worker.x;
      this.targetY = worker.y;
      this.animStartMs = timeMs;
    }
    const duration = this.reduced ? 0 : this.getActionMs();
    const t = duration <= 0 ? 1 : Math.min(1, (timeMs - this.animStartMs) / duration);
    const moving = t < 1;
    if (moving) {
      const eased = easeInOut(t);
      this.drawX = this.startX + (this.targetX - this.startX) * eased;
      this.drawY = this.startY + (this.targetY - this.startY) * eased;
    } else {
      this.drawX = this.targetX;
      this.drawY = this.targetY;
    }
    return { drawX: this.drawX, drawY: this.drawY, moving };
  }

  private resizeIfNeeded(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    if (w !== this.width || h !== this.height) {
      this.width = w;
      this.height = h;
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.camera.configure(w, h, this.simulation.world.width, this.simulation.world.height);
    }
  }
}