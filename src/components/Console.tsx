"use client";

import { useEffect, useRef } from "react";

export interface ConsoleMessage {
  id: number;
  level: "system" | "info" | "ok" | "error" | "warn";
  text: string;
  line: number | null;
}

interface ConsoleProps {
  messages: ConsoleMessage[];
}

/** Scrolling execution log. Auto-scrolls unless the user scrolls up. */
export default function Console({ messages }: ConsoleProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const stickBottom = useRef(true);

  const onScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    stickBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  useEffect(() => {
    const el = bodyRef.current;
    if (el && stickBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="console-body" ref={bodyRef} onScroll={onScroll}>
      {messages.length === 0 ? (
        <div className="console-line" data-level="system">
          No program run yet. Write some code and press RUN.
        </div>
      ) : (
        messages.map((m) => (
          <div
            className="console-line"
            data-level={m.level}
            key={m.id}
          >
            [{m.level.toUpperCase()}] {m.line ? `Line ${m.line} — ` : ""}
            {m.text}
          </div>
        ))
      )}
    </div>
  );
}