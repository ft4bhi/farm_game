import { DEFAULT_SETTINGS, EXECUTION_SPEEDS, type ExecutionSpeed, type GameSettings } from "@/data/config";

/**
 * requestAnimationFrame driver. The simulation and renderer are advanced from
 * here, not from React.
 */
export class GameLoop {
  private rafId: number | null = null;
  private lastTime = 0;
  private running = false;

  constructor(
    private readonly onFrame: (dtSeconds: number, nowMs: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  isRunning(): boolean {
    return this.running;
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return;
    const dtSeconds = Math.min(0.1, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.onFrame(dtSeconds, now);
    this.rafId = requestAnimationFrame(this.tick);
  };
}