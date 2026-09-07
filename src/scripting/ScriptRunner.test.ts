import { describe, it, expect, afterEach } from "vitest";
import { EventBus } from "@/events/Bus";
import { Simulation } from "@/engine/Simulation";
import { UnlockSystem } from "@/progression/UnlockSystem";
import { ChallengeManager } from "@/progression/ChallengeManager";
import { ScriptRunner } from "@/scripting/ScriptRunner";

function makeRunner(unlockedUpgrades: string[] = ["basic_farming"]) {
  const bus = new EventBus();
  const sim = new Simulation(bus);
  const unlocks = new UnlockSystem(bus, unlockedUpgrades);
  const challenges = new ChallengeManager(bus, sim, unlocks);
  const runner = new ScriptRunner(bus, sim, unlocks, challenges);
  runner.speed = "fast";
  return { bus, sim, unlocks, challenges, runner };
}

describe("ScriptRunner", () => {
  afterEach(() => {
    // No timers should still be pending between tests.
  });

  it("starts idle", () => {
    const { runner } = makeRunner();
    expect(runner.status).toBe("idle");
  });

  it("reports a syntax error immediately", async () => {
    const { runner } = makeRunner();
    await runner.start("move(North\n", "run");
    expect(runner.status).toBe("error");
    expect(runner.detailSnapshot().errorLine).not.toBeNull();
    expect(runner.detailSnapshot().errorMessage).toMatch(/\)/);
  });

  it("blocks features that are not unlocked yet", async () => {
    const { runner } = makeRunner();
    // can_harvest needs the "sensor" feature.
    await runner.start("if can_harvest():\n    move(North)\n", "run");
    expect(runner.status).toBe("error");
    expect(runner.detailSnapshot().errorMessage).toMatch(/Sensors upgrade/i);
  });

  it("blocks loop syntax before loops are unlocked", async () => {
    const { runner } = makeRunner();
    await runner.start("for i in range(2):\n    move(North)\n", "run");
    expect(runner.status).toBe("error");
    expect(runner.detailSnapshot().errorMessage).toMatch(/loops upgrade/i);
  });

  it("finishes a program and reports the outcome", async () => {
    const { runner, sim } = makeRunner(["basic_farming", "sensor", "loop", "function"]);
    await runner.start("move(North)\nmove(West)\n", "run");
    expect(runner.status).toBe("finished");
    expect(sim.worker).toMatchObject({ x: 3, y: 9 });
    expect(runner.detailSnapshot().actionsUsed).toBe(2);
    expect(runner.detailSnapshot().ticksUsed).toBeGreaterThan(0);
  });

  it("reports a blocked move as a runtime error", async () => {
    const { runner, sim } = makeRunner(["basic_farming", "sensor", "loop", "function"]);
    await runner.start("move(South)\n", "run");
    expect(runner.status).toBe("error");
    expect(runner.detailSnapshot().errorMessage).toMatch(/Cannot move South/);
    expect(sim.worker).toMatchObject({ x: 4, y: 10 });
  });
});