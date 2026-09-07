"use client";

import { EXECUTION_SPEEDS, type ExecutionSpeed } from "@/data/config";

export type ScriptStatusLabel =
  | "idle"
  | "running"
  | "paused"
  | "finished"
  | "stopped"
  | "error";

interface ControlBarProps {
  status: ScriptStatusLabel;
  executionSpeed: ExecutionSpeed;
  onRun: () => void;
  onPause: () => void;
  onStep: () => void;
  onStop: () => void;
  onReset: () => void;
  onSpeedChange: (speed: ExecutionSpeed) => void;
}

const STATUS_LABEL: Record<ScriptStatusLabel, string> = {
  idle: "Idle",
  running: "Running",
  paused: "Paused",
  finished: "Finished",
  stopped: "Stopped",
  error: "Error",
};

/** Run / pause / step / stop / reset plus execution speed. */
export default function ControlBar({
  status,
  executionSpeed,
  onRun,
  onPause,
  onStep,
  onStop,
  onReset,
  onSpeedChange,
}: ControlBarProps) {
  const isRunning = status === "running";
  const isPaused = status === "paused";
  const active = isRunning || isPaused;

  return (
    <div className="farm-controls">
      <button
        className="ctrl-btn primary"
        onClick={onRun}
        title="Run the program (or resume when paused)"
      >
        {isPaused ? "▶ Resume" : "▶ RUN"}
      </button>
      <button
        className="ctrl-btn"
        onClick={onPause}
        disabled={!isRunning}
        title="Pause execution"
      >
        ⏸ PAUSE
      </button>
      <button
        className="ctrl-btn"
        onClick={onStep}
        disabled={isRunning}
        title="Execute one action at a time"
      >
        ⏭ STEP
      </button>
      <button
        className="ctrl-btn danger"
        onClick={onStop}
        disabled={!active}
        title="Stop execution safely"
      >
        ⏹ STOP
      </button>
      <button
        className="ctrl-btn"
        onClick={onReset}
        disabled={isRunning}
        title="Reset to the start of this run"
      >
        ↺ RESET
      </button>

      <label className="ctrl-speed">
        Speed
        <select
          value={executionSpeed}
          onChange={(e) => onSpeedChange(e.target.value as ExecutionSpeed)}
        >
          {Object.entries(EXECUTION_SPEEDS).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
      </label>

      <span className="hud-status" data-status={status}>
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
}