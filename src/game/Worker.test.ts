import { describe, it, expect } from "vitest";
import { makeSimulation } from "@/scripting/testHarness";
import { GameActionError } from "@/engine/GameActionError";

describe("Worker movement", () => {
  it("starts at the configured position facing North", () => {
    const sim = makeSimulation();
    expect(sim.worker).toMatchObject({ x: 4, y: 10, facing: "North" });
  });

  it("moves North onto the soil field", () => {
    const sim = makeSimulation();
    const r = sim.executeCommand("move", ["North"]);
    expect(r.ok).toBe(true);
    expect(sim.worker).toMatchObject({ x: 4, y: 9, facing: "North" });
  });

  it("moves in all four directions and turns to face the direction", () => {
    const sim = makeSimulation();
    sim.executeCommand("move", ["North"]);
    sim.executeCommand("move", ["West"]);
    expect(sim.worker).toMatchObject({ x: 3, y: 9, facing: "West" });
    sim.executeCommand("move", ["East"]);
    expect(sim.worker).toMatchObject({ x: 4, y: 9, facing: "East" });
    sim.executeCommand("move", ["South"]);
    expect(sim.worker).toMatchObject({ x: 4, y: 10, facing: "South" });
  });

  it("refuses to move onto a blocked tile", () => {
    const sim = makeSimulation();
    expect(() => sim.executeCommand("move", ["South"])).toThrow(GameActionError);
    expect(sim.worker).toMatchObject({ x: 4, y: 10 });
  });

  it("stops the robot at the tree border", () => {
    const sim = makeSimulation();
    sim.executeCommand("move", ["West"]); // (4,10) -> (3,10)
    sim.executeCommand("move", ["West"]); // (3,10) -> (2,10)
    sim.executeCommand("move", ["West"]); // (2,10) -> (1,10)
    expect(sim.worker.x).toBe(1);
    expect(() => sim.executeCommand("move", ["West"])).toThrow(GameActionError);
    expect(sim.worker).toMatchObject({ x: 1, y: 10 });
  });

  it("rejects invalid directions", () => {
    const sim = makeSimulation();
    expect(() => sim.executeCommand("move", ["Up"])).toThrow(/Invalid direction/);
  });
});