import { describe, it, expect } from "vitest";
import { makeSimulation, runOk } from "@/scripting/testHarness";
import { Simulation } from "@/engine/Simulation";
import { GameActionError } from "@/engine/GameActionError";
import { TileType } from "@/data/tiles";
import { UnlockSystem } from "@/progression/UnlockSystem";
import { ChallengeManager } from "@/progression/ChallengeManager";
import { ScriptRunner } from "@/scripting/ScriptRunner";
import { EventBus } from "@/events/Bus";

function makeUnlockedRunner() {
  const bus = new EventBus();
  const sim = new Simulation(bus);
  const unlocks = new UnlockSystem(bus, sim.state.progression.unlockedUpgrades);
  const challenges = new ChallengeManager(bus, sim, unlocks);
  const runner = new ScriptRunner(bus, sim, unlocks, challenges);
  runner.speed = "fast";
  return { bus, sim, unlocks, challenges, runner };
}

describe("machine actions", () => {
  it("tills cleared ground into Soil and counts the cell", () => {
    const sim = makeSimulation();
    sim.executeCommand("move", ["West"]); // (3,10) cleared ground
    const r = sim.executeCommand("till", []);
    expect(r.ok).toBe(true);
    expect(sim.world.getTile(3, 10).type).toBe(TileType.SOIL);
    expect(sim.stats().cellsTilled).toBe(1);
  });

  it("makes a tilled cell plantable", () => {
    const sim = makeSimulation();
    sim.executeCommand("move", ["West"]);
    sim.executeCommand("till", []);
    sim.executeCommand("plant", ["Carrot"]);
    expect(sim.world.getTile(3, 10).crop).not.toBeNull();
  });

  it("refuses to till soil, water or obstacles", () => {
    const sim = makeSimulation();
    sim.executeCommand("move", ["North"]); // (4,9) is already Soil
    expect(() => sim.executeCommand("till", [])).toThrow(GameActionError);
    expect(sim.stats().cellsTilled).toBe(0);
  });

  it("clears a rock in front of the FieldBot into cleared ground", () => {
    const sim = makeSimulation();
    sim.executeCommand("move", ["West"]); // (3,10)
    sim.executeCommand("move", ["West"]); // (2,10)
    sim.executeCommand("move", ["West"]); // (1,10)
    const r = sim.executeCommand("clear", []);
    expect(r.ok).toBe(true);
    expect(sim.world.getTile(0, 10).type).toBe(TileType.GRASS);
    expect(sim.stats().rocksCleared).toBe(1);
    // The reclaimed tile is now walkable: the bot can step onto it.
    expect(() => sim.executeCommand("move", ["West"])).not.toThrow();
    expect(sim.worker).toMatchObject({ x: 0, y: 10 });
  });

  it("rejects clear() when no rock is ahead", () => {
    const sim = makeSimulation();
    // (4,9) ahead is Soil, not a rock.
    expect(() => sim.executeCommand("clear", [])).toThrow(GameActionError);
  });

  it("suggests the future TreeHarvester when clearing a tree", () => {
    const sim = makeSimulation();
    sim.executeCommand("move", ["North"]); // (4,9)
    sim.executeCommand("move", ["West"]); // (3,9)
    sim.executeCommand("move", ["South"]); // (3,10) facing South, (3,11) tree
    expect(() => sim.executeCommand("clear", [])).toThrow(/TreeHarvester/);
  });

  it("clears a rock, tills it and farms it in one program", () => {
    const sim = makeSimulation();
    const result = runOk(
      "move(West)\n" +
        "move(West)\n" +
        "move(West)\n" +
        "clear()\n" +
        "move(West)\n" +
        "till()\n" +
        "plant(Carrot)\n" +
        "water()\n" +
        "water()\n" +
        "water()\n" +
        "water()\n" +
        "harvest()\n",
      sim,
    );
    expect(result.error).toBeNull();
    expect(sim.world.getTile(0, 10).type).toBe(TileType.SOIL);
    expect(sim.world.getTile(0, 10).crop).toBeNull();
    expect(sim.stats().rocksCleared).toBe(1);
    expect(sim.stats().cellsTilled).toBe(1);
    expect(sim.stats().totalHarvested).toBe(1);
    expect(sim.resources.has("carrot", 1)).toBe(true);
  });

  it("requires the RockCutter upgrade to call clear()", async () => {
    const { runner } = makeUnlockedRunner();
    await runner.start("clear()\n", "run");
    expect(runner.status).toBe("error");
    expect(runner.detailSnapshot().errorMessage).toMatch(/RockCutter upgrade/i);
  });
});

describe("cleared_field mission", () => {
  const missionScript =
    "move(North)\n" +
    "for i in range(4):\n" +
    "    plant(Carrot)\n" +
    "    water()\n" +
    "    water()\n" +
    "    water()\n" +
    "    water()\n" +
    "    harvest()\n";

  /**
   * FieldBot must end facing North on (4,9)?—no: at (4,10) facing North (the
   * start pose) or anywhere the two rocks can still be approached.
   * This helper assumes the bot is on (4,9) facing North:
   *   rock (4,11) is directly south of start; rock (0,10) is west.
   */
  function clearTwoRocks(sim: ReturnType<typeof makeSimulation>) {
    // Back up onto (4,10) facing South and shatter the rock below.
    sim.executeCommand("move", ["South"]);
    sim.executeCommand("clear", []);
    // Walk west to the edge rock and shatter it too.
    sim.executeCommand("move", ["West"]);
    sim.executeCommand("move", ["West"]);
    sim.executeCommand("move", ["West"]);
    sim.executeCommand("clear", []);
  }

  it("completes once 2 rocks are cleared and 4 carrots are harvested", () => {
    const { sim, challenges } = makeUnlockedRunner();
    runOk(missionScript, sim); // ends on (4,9) facing North + 4 carrots
    clearTwoRocks(sim);

    expect(sim.stats().rocksCleared).toBe(2);
    expect(sim.stats().totalHarvested).toBe(4);

    challenges.reportRun({
      usedLoop: true,
      harvestsInRun: 4,
      instructionsUsed: 0,
      ticksUsed: 0,
    });

    expect(sim.state.progression.completedChallenges).toContain("cleared_field");
    const view = challenges.list().find((c) => c.id === "cleared_field");
    expect(view?.completed).toBe(true);
    expect(view?.progressDone).toBe(6);
    expect(view?.progressTotal).toBe(6);
  });

  it("shows combined progress before the mission is complete", () => {
    const { sim, challenges } = makeUnlockedRunner();
    // Clear the rock below start first: step up, face South, clear.
    sim.executeCommand("move", ["North"]); // (4,9)
    sim.executeCommand("move", ["South"]); // (4,10) facing South
    sim.executeCommand("clear", []); // clears (4,11)
    runOk(missionScript, sim); // ends on (4,9) facing North + 4 carrots

    const view = challenges.list().find((c) => c.id === "cleared_field");
    expect(view?.completed).toBe(false);
    expect(view?.progressDone).toBe(5);
    expect(view?.progressTotal).toBe(6);
  });
});