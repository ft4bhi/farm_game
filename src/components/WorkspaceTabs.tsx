"use client";

import { useRef } from "react";
import { WORKSPACE_PANELS, type WorkspacePanel } from "@/utils/workspacePanel";

interface WorkspaceTabsProps {
  activePanel: WorkspacePanel;
  onSelect: (panel: WorkspacePanel) => void;
}

const PANEL_LABELS: Record<WorkspacePanel, string> = {
  code: "CODE",
  missions: "MISSIONS",
  console: "CONSOLE",
};

const STEP_KEYS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/** Top-bar segmented control that always has exactly one panel selected. */
export default function WorkspaceTabs({
  activePanel,
  onSelect,
}: WorkspaceTabsProps) {
  const tabRefs = useRef<Record<WorkspacePanel, HTMLButtonElement | null>>({
    code: null,
    missions: null,
    console: null,
  });

  const selectPanel = (panel: WorkspacePanel, focus: boolean) => {
    onSelect(panel);
    if (focus) tabRefs.current[panel]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = STEP_KEYS[e.key];
    if (step !== undefined) {
      e.preventDefault();
      const index = WORKSPACE_PANELS.indexOf(activePanel);
      const next =
        (index + step + WORKSPACE_PANELS.length) % WORKSPACE_PANELS.length;
      selectPanel(WORKSPACE_PANELS[next], true);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      selectPanel(WORKSPACE_PANELS[0], true);
    } else if (e.key === "End") {
      e.preventDefault();
      selectPanel(WORKSPACE_PANELS[WORKSPACE_PANELS.length - 1], true);
    }
  };

  return (
    <div
      className="panel-tabs"
      role="tablist"
      aria-label="Active workspace panel"
      onKeyDown={onKeyDown}
    >
      {WORKSPACE_PANELS.map((panel) => {
        const active = activePanel === panel;
        return (
          <button
            key={panel}
            ref={(el) => {
              tabRefs.current[panel] = el;
            }}
            type="button"
            role="tab"
            className={`panel-tab${active ? " panel-tab-active" : ""}`}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            title={`Show the ${PANEL_LABELS[panel]} panel`}
            onClick={() => onSelect(panel)}
          >
            {PANEL_LABELS[panel]}
            {active && <span className="panel-tab-check">✓</span>}
          </button>
        );
      })}
    </div>
  );
}