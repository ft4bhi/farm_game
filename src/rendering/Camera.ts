/**
 * Orthographic camera that maps tile coordinates to screen pixels. For the
 * MVP it always frames the whole world, but the structure supports pan/zoom
 * so larger worlds can be navigated later.
 */
export class Camera {
  private canvasW = 1;
  private canvasH = 1;
  private worldW = 16;
  private worldH = 12;
  readonly padding = 12;
  private cell = 48;
  private offsetX = 0;
  private offsetY = 0;

  configure(canvasWidth: number, canvasHeight: number, worldWidth: number, worldHeight: number): void {
    this.canvasW = canvasWidth;
    this.canvasH = canvasHeight;
    this.worldW = worldWidth;
    this.worldH = worldHeight;
    this.recompute();
  }

  private recompute(): void {
    const usableW = Math.max(1, this.canvasW - this.padding * 2);
    const usableH = Math.max(1, this.canvasH - this.padding * 2);
    const fitByWidth = usableW / this.worldW;
    const fitByHeight = usableH / this.worldH;
    this.cell = Math.max(14, Math.min(88, Math.floor(Math.min(fitByWidth, fitByHeight))));
    this.offsetX = Math.floor((this.canvasW - this.worldW * this.cell) / 2);
    this.offsetY = Math.floor((this.canvasH - this.worldH * this.cell) / 2);
  }

  get cellPx(): number {
    return this.cell;
  }

  /** Screen-space bounding box of the whole world. */
  worldBounds(): { x: number; y: number; w: number; h: number } {
    return {
      x: this.offsetX,
      y: this.offsetY,
      w: this.worldW * this.cell,
      h: this.worldH * this.cell,
    };
  }

  /** Top-left screen pixel of a tile. */
  tileToScreen(tx: number, ty: number): { x: number; y: number } {
    return {
      x: this.offsetX + tx * this.cell,
      y: this.offsetY + ty * this.cell,
    };
  }

  /** Centre screen pixel of a tile. */
  tileCenter(tx: number, ty: number): { x: number; y: number } {
    const tl = this.tileToScreen(tx, ty);
    return { x: tl.x + this.cell / 2, y: tl.y + this.cell / 2 };
  }

  /** Screen pixel of a fractional tile position (used for movement). */
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: this.offsetX + wx * this.cell,
      y: this.offsetY + wy * this.cell,
    };
  }
}