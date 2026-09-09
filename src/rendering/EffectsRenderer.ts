import type { Camera } from "@/rendering/Camera";
import { THEME } from "@/rendering/Theme";
import type { DrawEnv } from "@/rendering/CropRenderer";

export type EffectKind = "water" | "harvest" | "plant" | "till" | "clear";

export interface Effect {
  kind: EffectKind;
  tx: number;
  ty: number;
  startedAt: number;
}

const DURATIONS: Record<EffectKind, number> = {
  water: 520,
  harvest: 650,
  plant: 420,
  till: 380,
  clear: 700,
};

/** Short-lived feedback bursts (watering ripples, harvest particles). */
export class EffectsRenderer {
  private effects: Effect[] = [];

  add(effect: Effect): void {
    this.effects.push(effect);
  }

  clear(): void {
    this.effects.length = 0;
  }

  inFlight(): number {
    return this.effects.length;
  }

  draw(env: DrawEnv, time: number): void {
    const { ctx, camera } = env;
    this.effects = this.effects.filter(
      (effect) => time - effect.startedAt < DURATIONS[effect.kind],
    );
    for (const effect of this.effects) {
      const elapsed = time - effect.startedAt;
      const progress = Math.min(1, elapsed / DURATIONS[effect.kind]);
      const center = camera.tileCenter(effect.tx, effect.ty);
      const c = camera.cellPx;

      switch (effect.kind) {
        case "water":
          this.drawRipple(ctx, center.x, center.y, c, progress);
          break;
        case "harvest":
          this.drawBurst(ctx, center.x, center.y, c, progress, time);
          break;
        case "plant":
          this.drawSparkle(ctx, center.x, center.y, c, progress);
          break;
        case "till":
          this.drawDust(ctx, center.x, center.y, c, progress);
          break;
        case "clear":
          this.drawRockShards(ctx, center.x, center.y, c, progress, time);
          break;
      }
    }
  }

  private drawRipple(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    c: number,
    progress: number,
  ): void {
    const radius = c * (0.1 + progress * 0.5);
    ctx.strokeStyle = THEME.water.shallow;
    ctx.globalAlpha = 1 - progress;
    ctx.lineWidth = Math.max(1, c * 0.05 * (1 - progress));
    ctx.beginPath();
    ctx.ellipse(x, y + c * 0.12, radius, radius * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawBurst(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    c: number,
    progress: number,
    time: number,
  ): void {
    const count = 6;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + progress * 2;
      const dist = c * 0.5 * progress;
      const px = x + Math.cos(angle) * dist;
      const py = y - c * 0.1 + Math.sin(angle) * dist - progress * c * 0.1;
      ctx.fillStyle = i % 2 === 0 ? THEME.particle : THEME.carrot.body;
      ctx.globalAlpha = 1 - progress;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1, c * 0.05 * (1 - progress)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawSparkle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    c: number,
    progress: number,
  ): void {
    const fade = 1 - progress;
    ctx.fillStyle = THEME.carrot.frond;
    ctx.globalAlpha = fade;
    ctx.beginPath();
    ctx.arc(x, y - c * 0.15, c * 0.05 * fade + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** Brown soil dust kicked up while tilling ground into Soil. */
  private drawDust(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    c: number,
    progress: number,
  ): void {
    const count = 7;
    for (let i = 0; i < count; i += 1) {
      const phase = (progress + i / count) % 1;
      const angle = (i / count) * Math.PI * 2 + progress * 3;
      const dist = c * 0.3 * phase;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist * 0.6 - phase * c * 0.2;
      ctx.globalAlpha = (1 - phase) * 0.9;
      ctx.fillStyle = THEME.dust;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1, c * 0.04), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Grey stone chips bursting outward when the RockCutter breaks a rock. */
  private drawRockShards(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    c: number,
    progress: number,
    time: number,
  ): void {
    const fast = progress * 3;
    if (fast <= 0.45) {
      const fade = 1 - fast / 0.45;
      const radius = c * (0.18 + fast * 0.85);
      ctx.strokeStyle = THEME.rock.light;
      ctx.globalAlpha = fade;
      ctx.lineWidth = Math.max(1, c * 0.09 * fade);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const shardCount = 8;
    for (let i = 0; i < shardCount; i += 1) {
      const angle = (i / shardCount) * Math.PI * 2 + progress * 2 + time * 0.001;
      const dist = c * 0.5 * progress;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist * 0.7;
      if (progress > 0.2) {
        ctx.globalAlpha = (1 - progress) * 0.95;
        ctx.fillStyle = i % 3 === 0 ? THEME.rock.dark : THEME.rock.base;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, c * 0.035 * (1 - progress)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}