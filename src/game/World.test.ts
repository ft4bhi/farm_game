import { describe, it, expect } from "vitest";
import { World } from "@/game/World";
import { WORLD_CONFIG } from "@/data/world";

describe("World", () => {
  it("has the expected starter dimensions and start tile", () => {
    const world = new World();
    expect(world.width).toBe(WORLD_CONFIG.width);
    expect(world.height).toBe(WORLD_CONFIG.height);
    expect(world.width).toBe(16);
    expect(world.height).toBe(12);
    expect(world.startX).toBe(4);
    expect(world.startY).toBe(10);
    expect(world.getTile(world.startX, world.startY).type).toBe("grass");
  });

  it("has a soil field directly north of the start position", () => {
    const world = new World();
    expect(world.getTile(4, 10).type).toBe("grass");
    expect(world.getTile(4, 9).type).toBe("soil");
    expect(world.getTile(4, 8).type).toBe("soil");
  });

  it("encloses the play area with trees", () => {
    const world = new World();
    expect(world.getTile(0, 0).type).toBe("tree");
    expect(world.getTile(0, 6).type).toBe("tree");
    expect(world.getTile(15, 6).type).toBe("tree");
    expect(world.getTile(3, 11).type).toBe("tree");
  });

  it("reports bounds and blocking correctly", () => {
    const world = new World();
    expect(world.inBounds(4, 10)).toBe(true);
    expect(world.inBounds(-1, 0)).toBe(false);
    expect(world.inBounds(16, 0)).toBe(false);
    expect(world.isBlocked(4, 11)).toBe(true);
    expect(world.isBlocked(-1, -1)).toBe(true);
    expect(world.isWalkable(4, 10)).toBe(true);
    expect(world.isWalkable(4, 9)).toBe(true);
    expect(world.isWalkable(0, 0)).toBe(false);
    expect(() => world.getTile(-1, 0)).toThrow();
  });

  it("marks only soil as plantable", () => {
    const world = new World();
    expect(world.isPlantable(4, 9)).toBe(true);
    expect(world.isPlantable(4, 10)).toBe(false);
    expect(world.isPlantable(0, 0)).toBe(false);
  });

  it("computes target positions for each direction", () => {
    const world = new World();
    expect(world.targetPosition(4, 10, "North")).toEqual({ x: 4, y: 9 });
    expect(world.targetPosition(4, 10, "South")).toEqual({ x: 4, y: 11 });
    expect(world.targetPosition(4, 10, "East")).toEqual({ x: 5, y: 10 });
    expect(world.targetPosition(4, 10, "West")).toEqual({ x: 3, y: 10 });
  });
});