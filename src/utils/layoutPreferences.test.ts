import { describe, it, expect } from "vitest";
import {
  STORAGE_KEY,
  CONSOLE_MIN,
  CONSOLE_MAX_RATIO,
  EDITOR_MIN,
  LOWER_CONTENT_MIN,
  HANDLE_PX,
  clampSidebarWidth,
  clampConsoleHeight,
  clampEditorHeight,
  loadLayoutPreferences,
  saveLayoutPreferences,
  resolveLayoutPreferences,
  type LayoutBounds,
  type StorageLike,
} from "@/utils/layoutPreferences";

const FAKE_BOUNDS: LayoutBounds = {
  availableWidth: 1280,
  viewportHeight: 900,
  paneHeight: 560,
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
    expect(clampSidebarWidth(9000, 1280)).toBe(1280 - 360 - 14);
  });

  it("passes values inside the valid range through rounded", () => {
    expect(clampSidebarWidth(600, 1280)).toBe(600);
    expect(clampSidebarWidth(600.7, 1280)).toBe(601);
  });

  it("handles very small workspaces without producing invalid bounds", () => {
    expect(clampSidebarWidth(500, 300)).toBe(320);
  });
});

describe("clampConsoleHeight", () => {
  it("uses 100px as the floor", () => {
    expect(clampConsoleHeight(0, 900)).toBe(CONSOLE_MIN);
  });

  it("caps at 45% of the viewport height", () => {
    const cap = Math.floor(900 * CONSOLE_MAX_RATIO);
    expect(clampConsoleHeight(10000, 900)).toBe(cap);
  });

  it("keeps valid heights and rounds fractional input", () => {
    expect(clampConsoleHeight(240, 900)).toBe(240);
    expect(clampConsoleHeight(240.4, 900)).toBe(240);
  });

  it("never lets the cap fall below the floor on tiny screens", () => {
    expect(clampConsoleHeight(500, 120)).toBe(CONSOLE_MIN);
  });
});

describe("clampEditorHeight", () => {
  it("uses 180px as the floor", () => {
    expect(clampEditorHeight(0, 500)).toBe(EDITOR_MIN);
  });

  it("reserves room for the lower content and handle", () => {
    expect(clampEditorHeight(2000, 500)).toBe(500 - LOWER_CONTENT_MIN - HANDLE_PX);
  });

  it("passes valid values through", () => {
    expect(clampEditorHeight(300, 700)).toBe(300);
  });

  it("never lets the cap fall below the floor", () => {
    expect(clampEditorHeight(100, 150)).toBe(EDITOR_MIN);
  });
});

describe("resolveLayoutPreferences", () => {
  it("fills sensible defaults when nothing is stored", () => {
    const resolved = resolveLayoutPreferences(null, FAKE_BOUNDS);
    expect(resolved.sidebarWidth).toBe(Math.floor(1280 * 0.38));
    expect(resolved.consoleHeight).toBe(220);
    expect(resolved.editorHeight).toBe(Math.floor(560 * 0.55));
  });

  it("clamps stored values that are outside valid bounds", () => {
    const resolved = resolveLayoutPreferences(
      { sidebarWidth: 9000, consoleHeight: 1, editorHeight: 9999 },
      FAKE_BOUNDS,
    );
    expect(resolved.sidebarWidth).toBe(clampSidebarWidth(9000, 1280));
    expect(resolved.consoleHeight).toBe(CONSOLE_MIN);
    expect(resolved.editorHeight).toBe(clampEditorHeight(9999, 560));
  });

  it("ignores non-numeric junk and falls back to defaults", () => {
    const junk = {
      sidebarWidth: "wide" as unknown,
      consoleHeight: NaN as unknown,
      editorHeight: Infinity as unknown,
    } as never;
    const resolved = resolveLayoutPreferences(junk, FAKE_BOUNDS);
    expect(resolved.sidebarWidth).toBe(Math.floor(1280 * 0.38));
    expect(resolved.consoleHeight).toBe(220);
    expect(resolved.editorHeight).toBe(Math.floor(560 * 0.55));
  });
});

describe("loadLayoutPreferences", () => {
  it("returns null when storage has no entry", () => {
    expect(loadLayoutPreferences(memoryStorage())).toBeNull();
  });

  it("returns null when storage is unavailable", () => {
    expect(loadLayoutPreferences(null)).toBeNull();
  });

  it("parses a stored preference object", () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ sidebarWidth: 640, consoleHeight: 200, editorHeight: 300 }),
    });
    expect(loadLayoutPreferences(storage)).toEqual({
      sidebarWidth: 640,
      consoleHeight: 200,
      editorHeight: 300,
    });
  });

  it("returns null for malformed JSON", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: "{not json" });
    expect(loadLayoutPreferences(storage)).toBeNull();
  });

  it("returns null for non-object payloads", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify([1, 2]) });
    expect(loadLayoutPreferences(storage)).toBeNull();
  });

  it("drops non-numeric members while keeping numeric ones", () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ sidebarWidth: 500, consoleHeight: "tall" }),
    });
    const prefs = loadLayoutPreferences(storage);
    expect(prefs?.sidebarWidth).toBe(500);
    expect(prefs?.consoleHeight).toBeUndefined();
  });
});

describe("saveLayoutPreferences", () => {
  it("round-trips through localStorage", () => {
    const storage = memoryStorage();
    saveLayoutPreferences({ sidebarWidth: 700, consoleHeight: 250, editorHeight: 260 }, storage);
    expect(loadLayoutPreferences(storage)).toEqual({
      sidebarWidth: 700,
      consoleHeight: 250,
      editorHeight: 260,
    });
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