"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { Game, type HudSnapshot } from "@/game/Game";
import type { ConsoleMessage } from "@/components/Console";
import type { ChallengeView } from "@/progression/ChallengeManager";
import type { ExecutionDetail } from "@/scripting/ScriptRunner";
import { DEFAULT_SETTINGS, type ExecutionSpeed, type GameSettings } from "@/data/config";
import { RESOURCE_DEFINITIONS } from "@/data/resources";

import GameCanvas from "@/components/GameCanvas";
import ResourceBar from "@/components/ResourceBar";
import Console from "@/components/Console";
import ControlBar, { type ScriptStatusLabel } from "@/components/ControlBar";
import ChallengePanel from "@/components/ChallengePanel";
import ResizeHandle from "@/components/ResizeHandle";
import {
  CONSOLE_MAX_RATIO,
  CONSOLE_MIN,
  EDITOR_MIN,
  FARM_MIN,
  HANDLE_PX,
  LOWER_CONTENT_MIN,
  SIDEBAR_MIN,
  clampConsoleHeight,
  clampEditorHeight,
  clampSidebarWidth,
  loadLayoutPreferences,
  resolveLayoutPreferences,
  saveLayoutPreferences,
} from "@/utils/layoutPreferences";

const CodeEditor = dynamic(() => import("@/components/CodeEditor"), {
  ssr: false,
  loading: () => <div className="editor-fallback" style={{ height: "100%" }} />,
});

interface UpgradeView {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  order: number;
}

const EMPTY_DETAIL: ExecutionDetail = {
  currentLine: null,
  errorLine: null,
  errorMessage: null,
  ticksUsed: 0,
  actionsUsed: 0,
  instructionsUsed: 0,
};

let messageId = 0;

interface Toast {
  id: number;
  html: React.ReactNode;
}

interface LayoutMetrics {
  sidebarWidth: number;
  consoleHeight: number;
  editorHeight: number;
}

const ZERO_LAYOUT: LayoutMetrics = { sidebarWidth: 0, consoleHeight: 0, editorHeight: 0 };

export default function GameShell() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const sidePaneRef = useRef<HTMLDivElement | null>(null);

  const [script, setScript] = useState("");
  const [resources, setResources] = useState<Record<string, number>>({});
  const [detail, setDetail] = useState<ExecutionDetail>(EMPTY_DETAIL);
  const [status, setStatus] = useState<string>("idle");
  const [challenges, setChallenges] = useState<ChallengeView[]>([]);
  const [upgrades, setUpgrades] = useState<UpgradeView[]>([]);
  const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS });
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Responsive/ resizable workspace layout -------------------------------------------------
  const [layout, setLayout] = useState<LayoutMetrics>(ZERO_LAYOUT);
  const [layoutReady, setLayoutReady] = useState(false);
  const [space, setSpace] = useState({ workspaceW: 0, paneH: 0 });

  // Measure real container sizes only after mount (SSR-safe), before paint.
  useLayoutEffect(() => {
    const availableWidth = Math.max(1, workspaceRef.current?.clientWidth ?? window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const paneHeight = Math.max(
      1,
      sidePaneRef.current?.clientHeight ?? Math.floor(viewportHeight * 0.62),
    );
    setLayout(
      resolveLayoutPreferences(loadLayoutPreferences(), { availableWidth, viewportHeight, paneHeight }),
    );
    setSpace({ workspaceW: availableWidth, paneH: paneHeight });
    setLayoutReady(true);
  }, []);

  // Keep aria bounds in sync as the console/editor moves panes around.
  useLayoutEffect(() => {
    const ws = workspaceRef.current;
    const pane = sidePaneRef.current;
    if (!ws || !pane || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setSpace({
        workspaceW: workspaceRef.current?.clientWidth ?? 0,
        paneH: sidePaneRef.current?.clientHeight ?? 0,
      });
    });
    observer.observe(ws);
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);

  // Persist preferences (debounced) once a real layout has been measured.
  useEffect(() => {
    if (!layoutReady) return;
    const timer = setTimeout(() => saveLayoutPreferences(layout), 250);
    return () => clearTimeout(timer);
  }, [layoutReady, layout]);

  const applySidebarDelta = useCallback((delta: number) => {
    const availableWidth = Math.max(1, workspaceRef.current?.clientWidth ?? window.innerWidth);
    setLayout((prev) => ({
      ...prev,
      sidebarWidth: clampSidebarWidth(prev.sidebarWidth + delta, availableWidth),
    }));
  }, []);

  // The console handle sits above the console: dragging up (negative delta) grows it.
  const applyConsoleDelta = useCallback((delta: number) => {
    const viewportHeight = Math.max(1, window.innerHeight);
    setLayout((prev) => ({
      ...prev,
      consoleHeight: clampConsoleHeight(prev.consoleHeight - delta, viewportHeight),
    }));
  }, []);

  const applyEditorDelta = useCallback((delta: number) => {
    const paneHeight = Math.max(1, sidePaneRef.current?.clientHeight ?? window.innerHeight);
    setLayout((prev) => ({
      ...prev,
      editorHeight: clampEditorHeight(prev.editorHeight + delta, paneHeight),
    }));
  }, []);

  const resetLayout = useCallback(() => {
    const availableWidth = Math.max(1, workspaceRef.current?.clientWidth ?? window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const paneHeight = Math.max(
      1,
      sidePaneRef.current?.clientHeight ?? Math.floor(viewportHeight * 0.62),
    );
    setLayout(resolveLayoutPreferences(null, { availableWidth, viewportHeight, paneHeight }));
  }, []);

  const layoutStyle = layoutReady
    ? ({
        "--sidebar-width": `${layout.sidebarWidth}px`,
        "--console-height": `${layout.consoleHeight}px`,
        "--editor-height": `${layout.editorHeight}px`,
      } as React.CSSProperties)
    : undefined;

  const viewportHeight =
    layoutReady && typeof window !== "undefined" ? Math.max(1, window.innerHeight) : 1;

  // ---------------------------------------------------------------- game wiring

  const latestDetail = useRef<ExecutionDetail | null>(null);
  const detailFrame = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(canvas);
    gameRef.current = game;
    const snap: HudSnapshot = game.hudSnapshot();

    setScript(snap.script);
    setResources(snap.resources);
    setStatus(snap.status);
    setChallenges(snap.challenges);
    setUpgrades(snap.upgrades);
    setSettings(snap.settings);

    const initial = game.bootMessagesSnapshot();
    setMessages(
      initial.map((m) => ({
        id: ++messageId,
        level: m.level,
        text: m.text,
        line: m.line,
      })),
    );

    const pushMessage = (m: {
      level: ConsoleMessage["level"];
      text: string;
      line?: number | null;
    }) => {
      setMessages((prev) => {
        const next = [
          ...prev,
          { id: ++messageId, level: m.level, text: m.text, line: m.line ?? null },
        ];
        return next.length > 300 ? next.slice(next.length - 300) : next;
      });
    };

    const queueDetail = (d: ExecutionDetail) => {
      latestDetail.current = d;
      if (detailFrame.current === null) {
        detailFrame.current = requestAnimationFrame(() => {
          detailFrame.current = null;
          if (latestDetail.current) setDetail(latestDetail.current);
        });
      }
    };

    const bus = game.bus;
    const off = [
      bus.on("resource.changed", (r) => setResources(r)),
      bus.on("execution.status", ({ status: s }) => setStatus(s)),
      bus.on("execution.detail", queueDetail),
      bus.on("console.message", pushMessage),
      bus.on("challenge.completed", ({ challengeId, rewards }) => {
        setChallenges(game.challenges.list());
        const label = rewards
          ? Object.entries(rewards)
              .map(([id, n]) => `${RESOURCE_DEFINITIONS[id]?.icon ?? id} ${n}`)
              .join(" ")
          : "";
        pushToast(
          <p>
            ✅ <strong>Goal complete!</strong>
            <br />
            {label ? `You earned ${label}.` : "A new chapter begins."}
          </p>,
        );
      }),
      bus.on("upgrade.unlocked", ({ upgradeId }) => {
        setUpgrades(game.hudSnapshot().upgrades);
        pushToast(
          <p>
            ⚙ <strong>New capability unlocked!</strong>
            <br />
            Check the Capabilities list to see what changed.
          </p>,
        );
      }),
    ];

    return () => {
      off.forEach((fn) => fn());
      if (detailFrame.current !== null) cancelAnimationFrame(detailFrame.current);
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const pushToast = useCallback((html: React.ReactNode) => {
    const id = ++messageId;
    setToasts((prev) => [...prev.slice(-2), { id, html }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const handleRun = () => {
    const game = gameRef.current;
    if (!game) return;
    if (status === "paused") game.resume();
    else game.run();
  };

  const handleStep = () => gameRef.current?.step();
  const handlePause = () => gameRef.current?.pause();
  const handleStop = () => gameRef.current?.stop();
  const handleReset = () => gameRef.current?.reset();

  const handleSpeedChange = (speed: ExecutionSpeed) => {
    const game = gameRef.current;
    if (!game) return;
    game.setSpeed(speed);
    setSettings({ ...game.getSettings() });
  };

  const handleScriptChange = (next: string) => {
    setScript(next);
    gameRef.current?.setScript(next);
  };

  const handleLoadSample = (sample: string) => {
    handleScriptChange(sample);
  };

  const handleResetAll = () => {
    const game = gameRef.current;
    if (!game) return;
    if (!window.confirm("Reset ALL progress, the farm and the script?")) return;
    game.resetAllProgress();
    setScript(game.getScript());
    setResources(game.simulation.resources.all());
    setStatus("idle");
    setDetail(EMPTY_DETAIL);
    setChallenges(game.challenges.list());
    setUpgrades(game.hudSnapshot().upgrades);
    setMessages((prev) => [...prev, {
      id: ++messageId,
      level: "system",
      text: "Fresh farm created.",
      line: null,
    }]);
  };

  const currentChallengeId =
    challenges.find((c) => !c.completed)?.id ?? null;

  return (
    <div className="farm-app" style={layoutStyle}>
      <header className="farm-topbar">
        <div className="brand">
          <span className="bot">🤖</span>
          <span>FarmForge</span>
        </div>
        <ResourceBar resources={resources} />
        <span className="hud-ops">ops: {detail.ticksUsed}</span>
        <span className="hud-status" data-status={status}>
          {statusLabel(status)}
        </span>
      </header>

      <div ref={workspaceRef} className="farm-workspace">
        <div className="farm-pane">
          <GameCanvas ref={canvasRef} />
        </div>

        <ResizeHandle
          className="farm-split-handle"
          orientation="vertical"
          label="Resize the farm and editor panels"
          onResize={applySidebarDelta}
          onReset={resetLayout}
          ariaValueNow={layout.sidebarWidth}
          ariaValueMin={SIDEBAR_MIN}
          ariaValueMax={Math.max(SIDEBAR_MIN, space.workspaceW - FARM_MIN - HANDLE_PX)}
        />

        <div ref={sidePaneRef} className="farm-side-pane">
          <div className="editor-section">
            <div className="farm-panel-title">
              <span>🛸 main.py</span>
              <span className="tiny">
                {scriptHint(status, detail)}
              </span>
            </div>
            <ControlBar
              status={status as ScriptStatusLabel}
              executionSpeed={settings.executionSpeed}
              onRun={handleRun}
              onPause={handlePause}
              onStep={handleStep}
              onStop={handleStop}
              onReset={handleReset}
              onSpeedChange={handleSpeedChange}
            />
            <div className="editor-host">
              <CodeEditor
                value={script}
                onChange={handleScriptChange}
                currentLine={detail.currentLine}
                errorLine={detail.errorLine}
                errorMessage={detail.errorMessage}
              />
            </div>
          </div>

          <ResizeHandle
            className="editor-split-handle"
            orientation="horizontal"
            label="Resize the editor and content panels"
            onResize={applyEditorDelta}
            onReset={resetLayout}
            ariaValueNow={layout.editorHeight}
            ariaValueMin={EDITOR_MIN}
            ariaValueMax={Math.max(EDITOR_MIN, space.paneH - LOWER_CONTENT_MIN - HANDLE_PX)}
          />

          <div className="lower-content">
            <ChallengePanel
              challenges={challenges}
              upgrades={upgrades}
              onLoadSample={handleLoadSample}
              currentChallengeId={currentChallengeId}
            />
            <section className="content-section">
              <div className="farm-panel-title">
                <span>Farm</span>
                <button className="mini-btn" onClick={handleResetAll}>
                  Reset all
                </button>
              </div>
              <div className="content-body">
                <div className="challenge">
                  <div className="ch-goal" style={{ margin: 0 }}>
                    The FieldBot starts on the grass at the south-west of the
                    farm. Head North to reach the soil field.
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <ResizeHandle
        className="console-handle"
        orientation="horizontal"
        label="Resize the execution console"
        onResize={applyConsoleDelta}
        onReset={resetLayout}
        ariaValueNow={layout.consoleHeight}
        ariaValueMin={CONSOLE_MIN}
        ariaValueMax={Math.max(CONSOLE_MIN, Math.floor(viewportHeight * CONSOLE_MAX_RATIO))}
      />

      <div className="farm-console-card">
        <div className="farm-panel-title">
          <span>Execution Console</span>
          <button
            className="mini-btn"
            onClick={() => setMessages([])}
          >
            Clear
          </button>
        </div>
        <Console messages={messages} />
      </div>

      <div className="toast-stack">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            {t.html}
          </div>
        ))}
      </div>
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "running":
      return "Running";
    case "paused":
      return "Paused";
    case "finished":
      return "Finished";
    case "stopped":
      return "Stopped";
    case "error":
      return "Error";
    default:
      return status;
  }
}

function scriptHint(status: string, detail: ExecutionDetail): string {
  if (detail.errorLine !== null) {
    return `error on line ${detail.errorLine}`;
  }
  if (detail.currentLine !== null) return `executing line ${detail.currentLine}`;
  if (status === "finished") return `ran in ${detail.instructionsUsed} steps`;
  return "edit, then press RUN";
}