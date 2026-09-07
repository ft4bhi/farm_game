import type { CropState } from "@/game/Crop";
import { getGrowthStage, getStageProgress } from "@/game/Crop";
import type { Camera } from "@/rendering/Camera";
import { THEME } from "@/rendering/Theme";

export interface DrawEnv {
  ctx: CanvasRenderingContext2D;
  camera: Camera;
  time: number;
  simple: boolean;
}

const easing = (t: number) => t;

function seedFrom(x: number, y: number): number {
  const h = x * 374761393 + y * 668265263;
  return Math.abs(h % 97) / 97;
}

/** Draws a single crop according to its growth stage. */
export class CropRenderer {
  draw(env: DrawEnv, crop: CropState, x: number, y: number): void {
    const { ctx, camera } = env;
    const c = camera.cellPx;
    const center = camera.tileCenter(x, y);
    const frac = getStageProgress(crop);
    const stage = getGrowthStage(crop);
    const wobble = seedFrom(x, y);
    const sway = env.simple
      ? 0
      : Math.sin(env.time / 420 + wobble * 6.28) * c * 0.015;

    ctx.save();
    ctx.translate(center.x, center.y + c * 0.02);

    switch (stage) {
      case "SEED":
        this.drawSeed(ctx, c);
        break;
      case "SPROUT":
        this.drawSprout(ctx, c, frac);
        break;
      case "GROWING":
        this.drawGrowing(ctx, c, frac, sway);
        break;
      case "MATURE":
        this.drawMature(ctx, c, sway);
        break;
    }

    ctx.restore();
  }

  private drawSeed(ctx: CanvasRenderingContext2D, c: number): void {
    ctx.fillStyle = THEME.soil.furrow;
    ctx.beginPath();
    ctx.arc(0, 0, c * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSprout(ctx: CanvasRenderingContext2D, c: number, frac: number): void {
    const h = c * (0.12 + 0.1 * frac);
    ctx.strokeStyle = THEME.carrot.frond;
    ctx.lineWidth = Math.max(1, c * 0.04);
    ctx.lineCap = "round";
    // Stem
    ctx.beginPath();
    ctx.moveTo(0, c * 0.04);
    ctx.lineTo(0, -h);
    ctx.stroke();
    // Two small leaves.
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.7);
    ctx.quadraticCurveTo(-c * 0.1, -h * 1.15, -c * 0.02, -h * 0.7);
    ctx.moveTo(0, -h * 0.55);
    ctx.quadraticCurveTo(c * 0.1, -h * 1.05, c * 0.02, -h * 0.55);
    ctx.stroke();
  }

  private drawGrowing(ctx: CanvasRenderingContext2D, c: number, frac: number, sway: number): void {
    ctx.save();
    ctx.translate(sway * 0.4, 0);
    // Leaf cluster.
    ctx.fillStyle = THEME.carrot.frond;
    const rr = c * (0.08 + 0.04 * frac);
    ctx.beginPath();
    ctx.arc(-c * 0.1, -c * 0.1, rr, 0, Math.PI * 2);
    ctx.arc(c * 0.08, -c * 0.12, rr * 0.9, 0, Math.PI * 2);
    ctx.fill();
    // Peek of the root.
    ctx.fillStyle = THEME.carrot.body;
    ctx.beginPath();
    ctx.moveTo(-c * 0.06, 0);
    ctx.lineTo(c * 0.06, 0);
    ctx.lineTo(0, c * (0.1 + 0.05 * frac));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawMature(ctx: CanvasRenderingContext2D, c: number, sway: number): void {
    ctx.save();
    ctx.translate(sway, 0);

    // Fronds.
    ctx.strokeStyle = THEME.carrot.frond;
    ctx.lineWidth = Math.max(1, c * 0.045);
    ctx.lineCap = "round";
    for (const [dx, dy] of [
      [-0.02, -0.02],
      [0, 0],
      [0.02, -0.02],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(dx * c, -c * 0.08);
      ctx.quadraticCurveTo(dx * c * 1.6, -c * 0.34, dx * c * 0.4, -c * 0.4);
      ctx.stroke();
    }

    // Carrot root.
    ctx.fillStyle = THEME.carrot.body;
    ctx.beginPath();
    ctx.moveTo(-c * 0.09, -c * 0.05);
    ctx.quadraticCurveTo(-c * 0.07, c * 0.26, 0, c * 0.26);
    ctx.quadraticCurveTo(c * 0.07, c * 0.26, c * 0.09, -c * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = THEME.carrot.bodyDark;
    ctx.fillRect(-c * 0.05, -c * 0.04, c * 0.1, c * 0.04);

    ctx.restore();
  }
}