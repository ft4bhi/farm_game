import type { World } from "@/game/World";
import { TileType } from "@/data/tiles";
import type { Camera } from "@/rendering/Camera";
import { THEME } from "@/rendering/Theme";
import type { DrawEnv } from "@/rendering/CropRenderer";
import { CropRenderer } from "@/rendering/CropRenderer";

function hash(x: number, y: number): number {
  const h = Math.abs(x * 127 + y * 311) % 1000;
  return h / 1000;
}

/**
 * Draws every tile plus its crop in the world. Pure presentation.
 *
 * The farm is rendered as a working grid: the whole play area shares one
 * cleared-ground family of tones, every cell is separated by grid lines, and
 * obstacles (rocks/trees/water) are drawn on top so they read as "blocked
 * cells the player must deal with" rather than scenery.
 */
export class WorldRenderer {
  constructor(private readonly crops = new CropRenderer()) {}

  draw(env: DrawEnv, world: World): void {
    const { ctx, camera } = env;
    const bounds = camera.worldBounds();

    // Soft field backdrop behind the farm.
    ctx.fillStyle = THEME.background;
    ctx.beginPath();
    ctx.roundRect(bounds.x, bounds.y, bounds.w, bounds.h, 10);
    ctx.fill();

    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        const topLeft = camera.tileToScreen(x, y);
        if (!this.visible(topLeft.x, topLeft.y, bounds)) continue;
        const tile = world.getTile(x, y);
        this.drawTile(env, tile.type, x, y, topLeft.x, topLeft.y, camera.cellPx);
      }
    }

    // Workspace grid lines across the whole farm, drawn above the terrain.
    this.drawGridLines(env, bounds);

    // A crisp border frame around the farm.
    ctx.strokeStyle = THEME.worldBorder;
    ctx.lineWidth = 3;
    ctx.strokeRect(bounds.x + 1.5, bounds.y + 1.5, bounds.w - 3, bounds.h - 3);

    // Crops on top of their soil.
    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        const tile = world.getTile(x, y);
        if (tile.crop) {
          this.crops.draw(env, tile.crop, x, y);
        }
      }
    }
  }

  private drawGridLines(env: DrawEnv, bounds: { x: number; y: number; w: number; h: number }): void {
    const { ctx, camera } = env;
    const c = camera.cellPx;
    if (c < 8) return;

    ctx.save();
    ctx.strokeStyle = THEME.grid.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= cameraCellCount(env); x += 1) {
      const px = bounds.x + x * c + 0.5;
      ctx.moveTo(px, bounds.y);
      ctx.lineTo(px, bounds.y + bounds.h);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let y = 0; y <= rowCount(env); y += 1) {
      const py = bounds.y + y * c + 0.5;
      ctx.moveTo(bounds.x, py);
      ctx.lineTo(bounds.x + bounds.w, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  private visible(x: number, y: number, bounds: { w: number; h: number }): boolean {
    return x < bounds.w && y < bounds.h;
  }

  private drawTile(
    env: DrawEnv,
    type: TileType,
    tx: number,
    ty: number,
    px: number,
    py: number,
    c: number,
  ): void {
    const { ctx } = env;
    const seed = hash(tx, ty);

    switch (type) {
      case TileType.GRASS:
        // Cleared ground: the neutral workspace substrate every cell shares.
        ctx.fillStyle =
          (tx + ty) % 2 === 0 ? THEME.cleared.base : THEME.cleared.alt;
        ctx.fillRect(px, py, c, c);
        if (!env.simple && c >= 10) {
          ctx.fillStyle = THEME.cleared.speckle;
          const specks = 2 + Math.floor(seed * 3);
          for (let i = 0; i < specks; i += 1) {
            const sx = px + ((seed * 31 + i * 13) % Math.max(1, c - 2)) + 1;
            const sy = py + ((seed * 17 + i * 7) % Math.max(1, c - 2)) + 1;
            ctx.fillRect(sx, sy, Math.max(1, c * 0.05), Math.max(1, c * 0.05));
          }
        }
        break;

      case TileType.SOIL:
        ctx.fillStyle = THEME.soil.base;
        ctx.fillRect(px, py, c, c);
        ctx.fillStyle = THEME.soil.highlight;
        ctx.fillRect(px, py, c, Math.max(1, c * 0.05));
        // Furrow lines mark the cell as worked/farmable.
        ctx.fillStyle = THEME.soil.furrow;
        const rows = 2;
        for (let r = 1; r <= rows; r += 1) {
          const y = py + (c * (r / (rows + 1))) - 1;
          ctx.fillRect(px + 1, y, c - 2, Math.max(1, c * 0.04));
        }
        break;

      case TileType.WATER: {
        ctx.fillStyle = THEME.water.base;
        ctx.fillRect(px, py, c, c);
        if (!env.simple) {
          const phase = (env.time / 2400 + seed * 5) % (c * 2);
          ctx.strokeStyle = THEME.water.sparkle;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px - phase + c, py + c * 0.5, c * 0.42, 0, Math.PI);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        break;
      }

      case TileType.ROCK: {
        // Angular, blocky boulder so it reads as a solid machine obstacle.
        ctx.fillStyle = THEME.rock.base;
        ctx.beginPath();
        const rw = c * 0.72;
        const rh = c * 0.5;
        const ox = px + (c - rw) / 2;
        const oy = py + (c - rh) / 2;
        ctx.moveTo(ox, oy + rh * 0.3);
        ctx.lineTo(ox + rw * 0.22, oy);
        ctx.lineTo(ox + rw * 0.78, oy + rh * 0.12);
        ctx.lineTo(ox + rw, oy + rh * 0.62);
        ctx.lineTo(ox + rw * 0.7, oy + rh);
        ctx.lineTo(ox + rw * 0.2, oy + rh);
        ctx.lineTo(ox, oy + rh * 0.62);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = THEME.rock.light;
        ctx.beginPath();
        ctx.moveTo(ox + rw * 0.3, oy + rh * 0.28);
        ctx.lineTo(ox + rw * 0.55, oy + rh * 0.16);
        ctx.lineTo(ox + rw * 0.74, oy + rh * 0.38);
        ctx.lineTo(ox + rw * 0.48, oy + rh * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = THEME.rock.dark;
        ctx.beginPath();
        ctx.ellipse(
          px + c * 0.62,
          py + c * 0.62,
          c * 0.12,
          c * 0.07,
          0.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        break;
      }

      case TileType.TREE: {
        const trunkH = c * 0.26;
        const trunkX = px + c / 2;
        const baseY = py + c - c * 0.14;
        ctx.fillStyle = THEME.tree.trunk;
        ctx.fillRect(trunkX - c * 0.06, baseY - trunkH, c * 0.12, trunkH);
        const canopyR = c * (0.34 + seed * 0.06);
        ctx.fillStyle = THEME.tree.canopy;
        ctx.beginPath();
        ctx.arc(trunkX, baseY - trunkH - canopyR * 0.55, canopyR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = THEME.tree.canopyLight;
        ctx.beginPath();
        ctx.arc(
          trunkX - canopyR * 0.3,
          baseY - trunkH - canopyR * 0.85,
          canopyR * 0.6,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        break;
      }
    }
  }
}

function cameraCellCount(env: DrawEnv): number {
  return Math.round(env.camera.worldBounds().w / env.camera.cellPx);
}

function rowCount(env: DrawEnv): number {
  return Math.round(env.camera.worldBounds().h / env.camera.cellPx);
}