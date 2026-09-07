import type { WorkerState } from "@/game/Worker";
import type { Direction } from "@/game/Direction";
import type { Camera } from "@/rendering/Camera";
import { THEME } from "@/rendering/Theme";
import type { DrawEnv } from "@/rendering/CropRenderer";

const FACING_ANGLE: Record<Direction, number> = {
  North: -Math.PI / 2,
  South: Math.PI / 2,
  East: 0,
  West: Math.PI,
};

/**
 * Draws the FieldBot with Canvas primitives: wheels, a rounded body, an
 * antenna, a small display and a directional chevron. All proportions scale
 * with the tile size so the robot looks right at any zoom.
 */
export class WorkerRenderer {
  draw(
    env: DrawEnv,
    worker: WorkerState,
    posX: number,
    posY: number,
    moving: boolean,
  ): void {
    const { ctx, camera } = env;
    const c = camera.cellPx;
    const center = camera.worldToScreen(posX, posY);

    ctx.save();
    ctx.translate(center.x + c / 2, center.y + c / 2);

    const bob = moving && !env.simple ? Math.abs(Math.sin(env.time / 110)) * c * 0.04 : 0;
    const dir = worker.facing;
    const ang = FACING_ANGLE[dir];

    ctx.save();
    ctx.translate(0, -bob);

    // Robot's front offset is along its facing direction.
    const frontDx = Math.cos(ang);
    const frontDy = Math.sin(ang);

    // Shadow.
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, c * 0.32, c * 0.34, c * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wheels.
    ctx.fillStyle = THEME.robot.wheel;
    const wheelW = c * 0.16;
    const wheelH = c * 0.12;
    const wheelY = c * 0.2;
    ctx.beginPath();
    ctx.roundRect(-c * 0.3, wheelY, wheelW, wheelH, c * 0.04);
    ctx.fill();
    ctx.roundRect(c * 0.14, wheelY, wheelW, wheelH, c * 0.04);
    ctx.fill();
    ctx.fillStyle = THEME.robot.hub;
    ctx.beginPath();
    ctx.arc(-c * 0.22, wheelY + wheelH / 2, c * 0.03, 0, Math.PI * 2);
    ctx.arc(c * 0.22, wheelY + wheelH / 2, c * 0.03, 0, Math.PI * 2);
    ctx.fill();

    // Body.
    const bw = c * 0.56;
    const bh = c * 0.42;
    ctx.fillStyle = THEME.robot.body;
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -bh / 2 - c * 0.04, bw, bh, c * 0.1);
    ctx.fill();
    ctx.strokeStyle = THEME.robot.bodyDark;
    ctx.lineWidth = Math.max(1, c * 0.02);
    ctx.stroke();

    // Farming attachment (small pod on the left side).
    ctx.fillStyle = THEME.soil.base;
    ctx.beginPath();
    ctx.roundRect(-bw / 2 - c * 0.1, -c * 0.02, c * 0.12, c * 0.12, c * 0.02);
    ctx.fill();
    ctx.fillStyle = THEME.soil.highlight;
    ctx.fillRect(-bw / 2 - c * 0.08, -c * 0.0, c * 0.08, c * 0.08);

    // Display: eyes look toward the front.
    const eyeDist = c * 0.1;
    const eyeOff = c * 0.12;
    const eyeX = Math.cos(ang + (Math.PI / 2)) * eyeDist - eyeOff * 0.3;
    const eyeY = Math.sin(ang + (Math.PI / 2)) * eyeDist - c * 0.05;
    ctx.fillStyle = THEME.robot.screen;
    ctx.beginPath();
    ctx.roundRect(-bw / 2 + c * 0.08, -bh / 2 + c * 0.04, bw - c * 0.16, bh * 0.6, c * 0.05);
    ctx.fill();
    ctx.fillStyle = THEME.robot.screenGlow;
    const blink = env.simple ? 1 : 0.6 + 0.4 * Math.sin(env.time / 250);
    ctx.globalAlpha = blink;
    ctx.beginPath();
    ctx.arc(-eyeOff + eyeX, eyeY, c * 0.035, 0, Math.PI * 2);
    ctx.arc(eyeOff + eyeX, eyeY, c * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Antenna.
    ctx.strokeStyle = THEME.robot.antenna;
    ctx.lineWidth = Math.max(1, c * 0.02);
    ctx.beginPath();
    ctx.moveTo(c * 0.1, -bh / 2 - c * 0.04);
    ctx.lineTo(c * 0.1, -bh / 2 - c * 0.18);
    ctx.stroke();
    ctx.fillStyle = THEME.robot.accent;
    const antennaOn = env.simple || Math.floor(env.time / 500) % 2 === 0;
    ctx.globalAlpha = antennaOn ? 1 : 0.3;
    ctx.beginPath();
    ctx.arc(c * 0.1, -bh / 2 - c * 0.21, c * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Directional chevron floating in front of the robot.
    ctx.fillStyle = THEME.robot.accent;
    ctx.save();
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(c * 0.44, 0);
    ctx.lineTo(c * 0.34, -c * 0.07);
    ctx.lineTo(c * 0.34, c * 0.07);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
    ctx.restore();
  }
}