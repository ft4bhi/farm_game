import { describe, it, expect } from "vitest";
import {
  STORAGE_KEY,
  HANDLE_PX,
  clampSidebarWidth,
  loadLayoutPreferences,
  saveLayoutPreferences,
  resolveLayoutPreferences,
  type LayoutBounds,
  type StorageLike,
} from "@/utils/layoutPreferences";

const FAKE_BOUNDS: LayoutBounds = {
  availableWidth: 1280,
};

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

describe("clampSidebarWidth", () => {
  it("clamps to the configured minimum", () => {
    expect(clampSidebarWidth(10, 1280)).toBe(320);
  });

  it("never leaves less than the minimum farm width + handle", () => {
    expect(clampSidebarWidth(9000, 1280)).toBe(1280 - 360 - HANDLE_PX);
  });

  it("passes values inside the valid range through rounded", () => {
    expect(clampSidebarWidth(600, 1280)).toBe(600);
    expect(clampSidebarWidth(600.7, 1280)).toBe(601);
  });

  it("handles very small workspaces without producing invalid bounds", () => {
    expect(clampSidebarWidth(500, 300)).toBe(320);
  });
});

describe("resolveLayoutPreferences", () => {
  it("fills a sensible default when nothing is stored", () => {
    const resolved = resolveLayoutPreferences(null, FAKE_BOUNDS);
    expect(resolved.sidebarWidth).toBe(Math.floor(1280 * 0.32));
  });

  it("clamps stored values that are outside valid bounds", () => {
    const resolved = resolveLayoutPreferences({ sidebarWidth: 9000 }, FAKE_BOUNDS);
    expect(resolved.sidebarWidth).toBe(clampSidebarWidth(9000, 1280));
  });

  it("clamps very small stored values up to the minimum", () => {
    const resolved = resolveLayoutPreferences({ sidebarWidth: 1 }, FAKE_BOUNDS);
    expect(resolved.sidebarWidth).toBe(320);
  });

  it("ignores non-numeric junk and falls back to defaults", () => {
    const junk = { sidebarWidth: "wide" as unknown } as never;
    const resolved = resolveLayoutPreferences(junk, FAKE_BOUNDS);
    expect(resolved.sidebarWidth).toBe(Math.floor(1280 * 0.32));
  });
});

describe("loadLayoutPreferences", () => {
  it("returns null when storage has no entry", () => {
    expect(loadLayoutPreferences(memoryStorage())).toBeNull();
  });

  it("returns null when storage is unavailable", () => {
    expect(loadLayoutPreferences(null)).toBeNull();
  });

  it("parses a stored sidebar width", () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ sidebarWidth: 640 }),
    });
    expect(loadLayoutPreferences(storage)).toEqual({ sidebarWidth: 640 });
  });

  it("returns null for malformed JSON", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: "{not json" });
    expect(loadLayoutPreferences(storage)).toBeNull();
  });

  it("returns null for non-object payloads", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify([1, 2]) });
    expect(loadLayoutPreferences(storage)).toBeNull();
  });

  it("drops obsolete members (console/editor sizes) and keeps the sidebar", () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({
        sidebarWidth: 500,
        consoleHeight: 220,
        editorHeight: 300,
      }),
    });
    expect(loadLayoutPreferences(storage)).toEqual({ sidebarWidth: 500 });
  });
});

describe("saveLayoutPreferences", () => {
  it("round-trips through localStorage", () => {
    const storage = memoryStorage();
    saveLayoutPreferences({ sidebarWidth: 700 }, storage);
    expect(loadLayoutPreferences(storage)).toEqual({ sidebarWidth: 700 });
  });

  it("writes under the farmforge.layout.v1 key", () => {
    const storage = memoryStorage();
    saveLayoutPreferences({ sidebarWidth: 400 }, storage);
    expect(storage.getItem(STORAGE_KEY)).toContain('"sidebarWidth":400');
  });

  it("returns false without storage", () => {
    expect(saveLayoutPreferences({}, null)).toBe(false);
  });
});