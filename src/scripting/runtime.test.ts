import { describe, it, expect } from "vitest";
import { makeSimulation, runOk, runScript } from "@/scripting/testHarness";

describe("FarmScript runtime", () => {
  it("runs a single action", () => {
    const sim = makeSimulation();
    const r = runOk("move(North)\n", sim);
    expect(sim.worker).toMatchObject({ x: 4, y: 9 });
    expect(r.actionCount).toBe(1);
    expect(r.error).toBeNull();
  });

  it("sequentially executes multiple actions", () => {
    const sim = makeSimulation();
    runOk("move(North)\nmove(North)\nmove(West)\n", sim);
    expect(sim.worker).toMatchObject({ x: 3, y: 8 });
  });

  it("supports one-line if/else", () => {
    const sim = makeSimulation();
    runOk("if get_ground_type() == Grass:\n    move(North)\nelse:\n    move(West)\n", sim);
    // Start tile is grass, so move North.
    expect(sim.worker).toMatchObject({ x: 4, y: 9 });
  });

  it("sensors can drive decisions", () => {
    const sim = makeSimulation();
    // Walk North over grass, stopping as soon as the tile is no longer grass
    // (the soil field starts at y=9).
    runOk(
      "while get_ground_type() != Soil:\n    can_harvest()\n    move(North)\n",
      sim,
    );
    expect(sim.worker).toMatchObject({ x: 4, y: 9 });
  });

  it("for loops repeat a body", () => {
    const sim = makeSimulation();
    const r = runOk("for i in range(4):\n    move(North)\n", sim);
    expect(sim.worker).toMatchObject({ x: 4, y: 6 });
    expect(r.actionCount).toBe(4);
  });

  it("for loops skip bodies of zero length", () => {
    const sim = makeSimulation();
    const r = runOk("for i in range(0):\n    move(North)\n", sim);
    expect(sim.worker).toMatchObject({ x: 4, y: 10 });
    expect(r.actionCount).toBe(0);
  });

  it("while loops respect their condition", () => {
    const sim = makeSimulation();
    runOk("while get_position_y() > 6:\n    move(North)\n", sim);
    expect(sim.worker).toMatchObject({ x: 4, y: 6 });
  });

  it("user-defined functions can be called repeatedly", () => {
    const sim = makeSimulation();
    runOk("def go():\n    move(North)\ngo()\ngo()\n", sim);
    expect(sim.worker).toMatchObject({ x: 4, y: 8 });
  });

  it("user functions can take parameters and return values", () => {
    const sim = makeSimulation();
    runOk(
      "def step_toward(d):\n    move(d)\ns = 0\nwhile s < 2:\n    step_toward(West)\n    s += 1\n",
      sim,
    );
    expect(sim.worker).toMatchObject({ x: 2, y: 10 });
  });

  it("evaluates arithmetic with correct precedence", () => {
    const sim = makeSimulation();
    runOk("x = 2 + 3 * 4\nif x == 14:\n    move(North)\n", sim);
    expect(sim.worker).toMatchObject({ x: 4, y: 9 });
  });

  it("supports comparisons and boolean logic", () => {
    const sim = makeSimulation();
    runOk(
      "a = 5\nb = 2\nif a > b and not (a == b):\n    move(West)\n",
      sim,
    );
    expect(sim.worker).toMatchObject({ x: 3, y: 10 });
  });

  it("reports an unknown function as a runtime error", () => {
    const sim = makeSimulation();
    const r = runScript("frobnice()\n", sim);
    expect(r.error).not.toBeNull();
    expect(r.error?.message).toMatch(/Unknown function: frobnice/);
  });

  it("reports a blocked move as a runtime error", () => {
    const sim = makeSimulation();
    const r = runScript("move(South)\n", sim);
    expect(r.error?.message).toMatch(/Cannot move South/);
  });

  it("reports using an undefined name", () => {
    const sim = makeSimulation();
    const r = runScript("move(nope)\n", sim);
    expect(r.error?.message).toMatch(/not defined/);
  });

  it("reports division by zero", () => {
    const sim = makeSimulation();
    const r = runScript("x = 1 / 0\n", sim);
    expect(r.error?.message).toMatch(/Division by zero/);
  });

  it("enforces the instruction budget for runaway loops", () => {
    const sim = makeSimulation();
    const r = runScript("while True:\n    x = 1\n", sim, { maxSteps: 100 });
    expect(r.error?.message).toMatch(/instruction budget/);
  });

  it("supports a full harvest workflow for one carrot", () => {
    const sim = makeSimulation();
    runOk(
      [
        "for i in range(1):",
        "    move(North)",
        "    plant(Carrot)",
        "    water()",
        "    water()",
        "    water()",
        "    water()",
        "    if can_harvest():",
        "        harvest()",
      ].join("\n") + "\n",
      sim,
    );
    expect(sim.resources.get("carrot")).toBe(1);
    expect(sim.resources.get("coin")).toBe(1);
    expect(sim.resources.get("seed_carrot")).toBe(23);
    expect(sim.state.progression.stats.totalHarvested).toBe(1);
  });
});