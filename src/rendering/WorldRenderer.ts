import type { World } from "@/game/World";
import { TILE_DEFINITIONS, TileType } from "@/data/tiles";
import type { Camera } from "@/rendering/Camera";
import { THEME } from "@/rendering/Theme";
import type { DrawEnv } from "@/rendering/CropRenderer";
import { CropRenderer } from "@/rendering/CropRenderer";

function hash(x: number, y: number): number {
  const h = Math.abs(x * 127 + y * 311) % 1000;
  return h / 1000;
}

/** Draws every tile plus its crop in the world. Pure presentation. */
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
        ctx.fillStyle = THEME.grass.base;
        ctx.fillRect(px, py, c, c);
        if (!env.simple) {
          ctx.fillStyle = THEME.grass.blade;
          const blades = 3 + Math.floor(seed * 3);
          for (let i = 0; i < blades; i += 1) {
            const bx = px + ((seed * 31 + i * 13) % c);
            const by = py + ((seed * 17 + i * 7) % c);
            ctx.fillRect(bx, by, 1, Math.max(1, c * 0.06) * 2);
          }
        }
        break;

      case TileType.SOIL:
        ctx.fillStyle = THEME.soil.base;
        ctx.fillRect(px, py, c, c);
        ctx.fillStyle = THEME.soil.highlight;
        ctx.fillRect(px, py, c, Math.max(1, c * 0.05));
        // Furrow lines.
        ctx.fillStyle = THEME.soil.furrow;
        const rows = 2;
        for (let r = 1; r <= rows; r += 1) {
          const y = py + (c * (r / (rows + 1))) - 1;
          ctx.fillRect(px + 1, y, c - 2, Math.max(1, c * 0.03));
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
        ctx.fillStyle = THEME.rock.base;
        ctx.beginPath();
        const rw = c * 0.7;
        const rh = c * 0.48;
        ctx.roundRect(px + (c - rw) / 2, py + (c - rh) / 2, rw, rh, c * 0.12);
        ctx.fill();
        ctx.fillStyle = THEME.rock.light;
        ctx.beginPath();
        ctx.ellipse(
          px + c * 0.55,
          py + c * 0.58,
          c * 0.16,
          c * 0.1,
          -0.3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.fillStyle = THEME.rock.dark;
        ctx.beginPath();
        ctx.ellipse(
          px + c * 0.38,
          py + c * 0.66,
          c * 0.1,
          c * 0.07,
          0.4,
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