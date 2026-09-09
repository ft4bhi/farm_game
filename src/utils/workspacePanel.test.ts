import { describe, it, expect } from "vitest";
import {
  WORKSPACE_STORAGE_KEY,
  LEGACY_WORKSPACE_STORAGE_KEY,
  DEFAULT_ACTIVE_PANEL,
  isWorkspacePanel,
  resolveActivePanel,
  loadActivePanel,
  saveActivePanel,
  type StorageLike,
} from "@/utils/workspacePanel";

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key: string) {
      return data.has(key) ? (data.get(key) as string) : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}

const V2 = WORKSPACE_STORAGE_KEY;
const V1 = LEGACY_WORKSPACE_STORAGE_KEY;

describe("isWorkspacePanel", () => {
  it("accepts the three known panels", () => {
    expect(isWorkspacePanel("code")).toBe(true);
    expect(isWorkspacePanel("missions")).toBe(true);
    expect(isWorkspacePanel("console")).toBe(true);
  });

  it("rejects every other value", () => {
    expect(isWorkspacePanel("")) .toBe(false);
    expect(isWorkspacePanel("sandbox")).toBe(false);
    expect(isWorkspacePanel(0)).toBe(false);
    expect(isWorkspacePanel(null)).toBe(false);
    expect(isWorkspacePanel(undefined)).toBe(false);
  });
});

describe("resolveActivePanel", () => {
  it("passes known panels through", () => {
    expect(resolveActivePanel("missions")).toBe("missions");
    expect(resolveActivePanel("console")).toBe("console");
    expect(resolveActivePanel("code")).toBe("code");
  });

  it("defaults unknown/missing values to CODE", () => {
    expect(resolveActivePanel("banana")).toBe(DEFAULT_ACTIVE_PANEL);
    expect(resolveActivePanel(null)).toBe(DEFAULT_ACTIVE_PANEL);
    expect(resolveActivePanel(undefined)).toBe(DEFAULT_ACTIVE_PANEL);
  });
});

describe("loadActivePanel", () => {
  it("defaults to CODE when storage is unavailable", () => {
    expect(loadActivePanel(null)).toBe("code");
  });

  it("defaults to CODE when nothing is stored", () => {
    expect(loadActivePanel(memoryStorage())).toBe("code");
  });

  it("loads a previously stored panel", () => {
    const storage = memoryStorage({ [V2]: JSON.stringify({ activePanel: "console" }) });
    expect(loadActivePanel(storage)).toBe("console");
  });

  it("falls back to CODE on an invalid stored value", () => {
    const storage = memoryStorage({ [V2]: JSON.stringify({ activePanel: "spreadsheet" }) });
    expect(loadActivePanel(storage)).toBe("code");
  });

  it("falls back to CODE on malformed or non-object payloads", () => {
    expect(loadActivePanel(memoryStorage({ [V2]: "{oops" }))).toBe("code");
    expect(loadActivePanel(memoryStorage({ [V2]: JSON.stringify(["code"]) }))).toBe("code");
    expect(loadActivePanel(memoryStorage({ [V2]: JSON.stringify("code") }))).toBe("code");
    expect(loadActivePanel(memoryStorage({ [V2]: "null" }))).toBe("code");
  });

  it("ignores the legacy v1 visibility record and starts at CODE", () => {
    const storage = memoryStorage({
      [V1]: JSON.stringify({ code: false, missions: false, console: true }),
    });
    expect(loadActivePanel(storage)).toBe("code");
  });
});

describe("saveActivePanel", () => {
  it("writes under the farmforge.workspace.v2 key", () => {
    const storage = memoryStorage();
    expect(saveActivePanel("missions", storage)).toBe(true);
    expect(storage.getItem(V2)).toBe(JSON.stringify({ activePanel: "missions" }));
  });

  it("round-trips and removes any legacy v1 record", () => {
    const storage = memoryStorage({ [V1]: JSON.stringify({ code: false }) });
    saveActivePanel("console", storage);
    expect(storage.getItem(V1)).toBeNull();
    expect(loadActivePanel(storage)).toBe("console");
  });

  it("can move the active panel between all three values", () => {
    const storage = memoryStorage();
    saveActivePanel("code", storage);
    expect(loadActivePanel(storage)).toBe("code");
    saveActivePanel("console", storage);
    expect(loadActivePanel(storage)).toBe("console");
    saveActivePanel("missions", storage);
    expect(loadActivePanel(storage)).toBe("missions");
  });

  it("returns false without storage", () => {
    expect(saveActivePanel("code", null)).toBe(false);
  });
});