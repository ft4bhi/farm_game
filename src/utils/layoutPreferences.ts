/**
 * Layout preference persistence for the FarmForge workspace shell.
 *
 * Pure logic (clamping, defaults, validation) lives here so it can be unit
 * tested without a DOM. Browsers pass real `localStorage`; tests pass a fake.
 */

export interface LayoutPreferences {
  sidebarWidth?: number;
}

export interface LayoutBounds {
  /** Width of the farm/active-panel workspace, in CSS pixels. */
  availableWidth: number;
}

export const STORAGE_KEY = "farmforge.layout.v1";

/** Minimum width of the right sidebar, in px. */
export const SIDEBAR_MIN = 320;
/** Minimum width of the farm view, in px. */
export const FARM_MIN = 360;
/** Drag lane of a resize handle, in px (matches --handle-w in CSS). */
export const HANDLE_PX = 14;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function clampSidebarWidth(value: number, availableWidth: number): number {
  const max = Math.max(SIDEBAR_MIN, Math.floor(availableWidth - FARM_MIN - HANDLE_PX));
  return clamp(Math.round(value), SIDEBAR_MIN, max);
}

function toPositiveNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.round(value);
}

/**
 * Fills in sensible defaults and clamps every stored value to valid bounds.
 * `raw` may come straight from `loadLayoutPreferences` (possibly malformed).
 */
export function resolveLayoutPreferences(
  raw: LayoutPreferences | null | undefined,
  bounds: LayoutBounds,
): Required<LayoutPreferences> {
  const defaultSidebar = clampSidebarWidth(
    Math.floor(bounds.availableWidth * 0.32),
    bounds.availableWidth,
  );
  return {
    sidebarWidth: clampSidebarWidth(
      toPositiveNumber(raw?.sidebarWidth) ?? defaultSidebar,
      bounds.availableWidth,
    ),
  };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Reads stored preferences. Returns null when absent or unreadable. */
export function loadLayoutPreferences(
  storage: StorageLike | null = defaultStorage(),
): LayoutPreferences | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const p = parsed as Record<string, unknown>;
    const pick = (key: string): number | undefined => {
      const v = p[key];
      return typeof v === "number" && Number.isFinite(v) ? (v as number) : undefined;
    };
    return {
      sidebarWidth: pick("sidebarWidth"),
    };
  } catch {
    return null;
  }
}

export function saveLayoutPreferences(
  prefs: LayoutPreferences,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}