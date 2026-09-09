/**
 * Single active workspace panel for the FarmForge shell.
 *
 * Instead of independently showing or hiding CODE / MISSIONS / CONSOLE, exactly
 * one panel is active at a time and fills the right-hand workspace. The active
 * panel is persisted under `farmforge.workspace.v2`. The old `v1` visibility
 * record (independent on/off flags) is deliberately ignored: when no `v2`
 * record exists, the default active panel is CODE regardless of which panels
 * used to be visible.
 */

export type WorkspacePanel = "code" | "missions" | "console";

export const WORKSPACE_PANELS: readonly WorkspacePanel[] = [
  "code",
  "missions",
  "console",
];

export const DEFAULT_ACTIVE_PANEL: WorkspacePanel = "code";

export const WORKSPACE_STORAGE_KEY = "farmforge.workspace.v2";
export const LEGACY_WORKSPACE_STORAGE_KEY = "farmforge.workspace.v1";

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

export function isWorkspacePanel(value: unknown): value is WorkspacePanel {
  return value === "code" || value === "missions" || value === "console";
}

/** Coerces an arbitrary value to a valid panel id, defaulting to CODE. */
export function resolveActivePanel(raw: unknown): WorkspacePanel {
  return isWorkspacePanel(raw) ? raw : DEFAULT_ACTIVE_PANEL;
}

/**
 * Reads the stored active panel. Absent, malformed, or otherwise unusable data
 * falls back to CODE and never throws.
 */
export function loadActivePanel(
  storage: StorageLike | null = defaultStorage(),
): WorkspacePanel {
  if (!storage) return DEFAULT_ACTIVE_PANEL;
  try {
    const raw = storage.getItem(WORKSPACE_STORAGE_KEY);
    if (raw != null) {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        const active = (parsed as Record<string, unknown>).activePanel;
        if (isWorkspacePanel(active)) return active;
      }
    }
  } catch {
    // fall through to the default below
  }
  return DEFAULT_ACTIVE_PANEL;
}

/** Persists the active panel and clears any legacy v1 visibility record. */
export function saveActivePanel(
  panel: WorkspacePanel,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({ activePanel: panel }));
    storage.removeItem(LEGACY_WORKSPACE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}