import { describe, it, expect } from "vitest";
import { SaveSystem, SaveError, type StorageLike, type SavePayload } from "@/persistence/SaveSystem";
import { makeSimulation } from "@/scripting/testHarness";
import { EventBus } from "@/events/Bus";
import { Simulation } from "@/engine/Simulation";
import type { GameSettings } from "@/data/config";

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

function makePayload(overrides: Partial<SavePayload> = {}): SavePayload {
  const sim = makeSimulation();
  return {
    version: 1,
    savedAt: Date.now(),
    game: sim.capture(),
    script: "move(North)",
    settings: { executionSpeed: "normal", renderQuality: "full" },
    ...overrides,
  };
}

describe("SaveSystem", () => {
  it("has no save on a fresh storage", () => {
    const sys = new SaveSystem(memoryStorage());
    expect(sys.hasSave()).toBe(false);
    expect(sys.load()).toBeNull();
  });

  it("round-trips a payload", () => {
    const store = memoryStorage();
    const sys = new SaveSystem(store);
    sys.save(makePayload());
    expect(sys.hasSave()).toBe(true);
    const loaded = sys.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.script).toBe("move(North)");
    expect(loaded!.game.version).toBe(1);
  });

  it("persists resources and progress through the game layer", () => {
    const store = memoryStorage();
    const sim = makeSimulation();
    sim.resources.add("carrot", 7);
    sim.state.progression.completedChallenges.push("first_crop");

    const sys = new SaveSystem(store);
    const payload = makePayload({ game: sim.capture(), script: "harvest()" });
    sys.save(payload);
    const loaded = sys.load()!;

    const fresh = makeSimulation();
    const restored = new Simulation(new EventBus(), loaded.game);
    expect(restored.resources.get("carrot")).toBe(7);
    expect(restored.state.progression.completedChallenges).toContain("first_crop");
    expect(fresh.resources.get("carrot")).toBe(0);
  });

  it("rejects corrupted JSON", () => {
    const store = memoryStorage();
    store.setItem("farmforge.save.v1", "{not json");
    const sys = new SaveSystem(store);
    expect(() => sys.load()).toThrow(SaveError);
    expect(sys.hasSave()).toBe(false);
  });

  it("rejects a wrong version", () => {
    const store = memoryStorage();
    const sys = new SaveSystem(store);
    sys.save(makePayload({ version: 99 }));
    expect(() => sys.load()).toThrow(/version/);
  });

  it("rejects a missing script field", () => {
    const store = memoryStorage();
    const sys = new SaveSystem(store);
    const payload = makePayload() as unknown as { script?: string };
    delete payload.script;
    sys.save(payload as SavePayload);
    expect(() => sys.load()).toThrow(/no script/);
  });

  it("falls back to default settings for invalid speed values", () => {
    const store = memoryStorage();
    const sys = new SaveSystem(store);
    const payload = makePayload({
      settings: { executionSpeed: "warp", renderQuality: "full" } as unknown as GameSettings,
    });
    sys.save(payload);
    expect(sys.load()!.settings.executionSpeed).toBe("normal");
  });

  it("clears a save", () => {
    const store = memoryStorage();
    const sys = new SaveSystem(store);
    sys.save(makePayload());
    sys.clear();
    expect(sys.hasSave()).toBe(false);
    expect(sys.load()).toBeNull();
  });
});