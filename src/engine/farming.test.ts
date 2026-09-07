import { describe, it, expect } from "vitest";
import { makeSimulation } from "@/scripting/testHarness";
import { GameActionError } from "@/engine/GameActionError";

describe("Farming (carrot)", () => {
  function soilSim() {
    const sim = makeSimulation();
    sim.worker.x = 5;
    sim.worker.y = 8;
    return sim;
  }

  it("plants a seed on soil and consumes one seed resource", () => {
    const sim = soilSim();
    expect(sim.resources.get("seed_carrot")).toBe(24);
    const r = sim.executeCommand("plant", ["Carrot"]);
    expect(r.ok).toBe(true);
    expect(sim.resources.get("seed_carrot")).toBe(23);
    expect(sim.world.getTile(5, 8).crop).toMatchObject({ id: "carrot" });
  });

  it("refuses to plant on grass or on an occupied tile", () => {
    const sim = makeSimulation();
    // robot on grass at (3,10)
    expect(() => sim.executeCommand("plant", ["Carrot"])).toThrow(/Soil/);

    sim.worker.x = 5;
    sim.worker.y = 8;
    sim.executeCommand("plant", ["Carrot"]);
    expect(() => sim.executeCommand("plant", ["Carrot"])).toThrow(/already growing/);
  });

  it("rejects unknown crop types", () => {
    const sim = soilSim();
    expect(() => sim.executeCommand("plant", ["Potato"])).toThrow(/Unknown crop type/);
  });

  it("refuses to water a tile with no crop", () => {
    const sim = soilSim();
    expect(() => sim.executeCommand("water", [])).toThrow(/no crop/);
  });

  it("water adds a fixed boost per call", () => {
    const sim = soilSim();
    sim.executeCommand("plant", ["Carrot"]);
    sim.executeCommand("water", []);
    expect(sim.world.getTile(5, 8).crop?.progress).toBeCloseTo(0.25);
  });

  it("won't harvest an immature crop", () => {
    const sim = soilSim();
    sim.executeCommand("plant", ["Carrot"]);
    sim.executeCommand("water", []);
    expect(() => sim.executeCommand("harvest", [])).toThrow(/not mature/);
  });

  it("harvests a mature crop and grants rewards", () => {
    const sim = soilSim();
    sim.executeCommand("plant", ["Carrot"]);
    for (let i = 0; i < 4; i += 1) sim.executeCommand("water", []);
    expect(sim.world.getTile(5, 8).crop?.progress).toBe(1);
    expect(sim.executeCommand("can_harvest", []).returnValue).toBe(true);
    const r = sim.executeCommand("harvest", []);
    expect(r.ok).toBe(true);
    expect(sim.world.getTile(5, 8).crop).toBeNull();
    expect(sim.resources.get("carrot")).toBe(1);
    expect(sim.resources.get("coin")).toBe(1);
    expect(sim.state.progression.stats.totalHarvested).toBe(1);
    expect(() => sim.executeCommand("harvest", [])).toThrow(/nothing growing/);
  });

  it("grows crops passively over time", () => {
    const sim = soilSim();
    sim.executeCommand("plant", ["Carrot"]);
    // Carrot grows in 30s of simulated time.
    sim.update(15);
    expect(sim.world.getTile(5, 8).crop?.progress).toBeCloseTo(0.5);
    sim.update(15);
    expect(sim.world.getTile(5, 8).crop?.progress).toBe(1);
    expect(sim.executeCommand("can_harvest", []).returnValue).toBe(true);
  });

  it("sensors read the world state", () => {
    const sim = soilSim();
    expect(sim.executeCommand("get_ground_type", []).returnValue).toBe("Soil");
    expect(sim.executeCommand("get_entity_type", []).returnValue).toBeNull();
    sim.executeCommand("plant", ["Carrot"]);
    expect(sim.executeCommand("get_entity_type", []).returnValue).toBe("Carrot");
    expect(sim.executeCommand("can_harvest", []).returnValue).toBe(false);
    expect(sim.executeCommand("get_position_x", []).returnValue).toBe(5);
    expect(sim.executeCommand("get_position_y", []).returnValue).toBe(8);
    expect(sim.executeCommand("get_world_width", []).returnValue).toBe(16);
    expect(sim.executeCommand("get_world_height", []).returnValue).toBe(12);
  });

  it("players cannot call unknown commands", () => {
    const sim = soilSim();
    expect(() => sim.executeCommand("fly", [])).toThrow(/Unknown command/);
  });
});