"use client";

import { useCallback, useEffect, useRef } from "react";

interface ResizeHandleProps {
  orientation: "vertical" | "horizontal";
  label: string;
  /** Reports signed pixel movement along the handle's axis. */
  onResize: (deltaPx: number) => void;
  /** Restores defaults (e.g. on double-click). */
  onReset?: () => void;
  ariaValueNow: number;
  ariaValueMin: number;
  ariaValueMax: number;
  keyboardStep?: number;
  className?: string;
}

/**
 * A slim, accessible drag handle between two panels. Uses pointer capture so
 * dragging stays smooth even when the pointer leaves the element, and doubles
 * as a two-way separatable control for keyboard users (arrow keys).
 */
export default function ResizeHandle({
  orientation,
  label,
  onResize,
  onReset,
  ariaValueNow,
  ariaValueMin,
  ariaValueMax,
  keyboardStep = 24,
  className,
}: ResizeHandleProps) {
  const lastPos = useRef(0);

  const cleanBody = useCallback(() => {
    document.body.classList.remove(
      "resize-dragging",
      "resize-dragging-vertical",
      "resize-dragging-horizontal",
    );
  }, []);

  useEffect(() => cleanBody, [cleanBody]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    lastPos.current = orientation === "vertical" ? e.clientX : e.clientY;
    document.body.classList.add(
      "resize-dragging",
      orientation === "vertical"
        ? "resize-dragging-vertical"
        : "resize-dragging-horizontal",
    );
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (!target.hasPointerCapture(e.pointerId)) return;
    const pos = orientation === "vertical" ? e.clientX : e.clientY;
    const delta = pos - lastPos.current;
    lastPos.current = pos;
    if (delta !== 0) onResize(delta);
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }
    cleanBody();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let delta = 0;
    if (orientation === "vertical") {
      if (e.key === "ArrowLeft") delta = -keyboardStep;
      else if (e.key === "ArrowRight") delta = keyboardStep;
    } else if (e.key === "ArrowUp") delta = -keyboardStep;
    else if (e.key === "ArrowDown") delta = keyboardStep;
    if (delta === 0) return;
    e.preventDefault();
    e.stopPropagation();
    onResize(delta);
  };

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-valuenow={Math.round(ariaValueNow)}
      aria-valuemin={Math.round(ariaValueMin)}
      aria-valuemax={Math.round(ariaValueMax)}
      aria-disabled={false}
      tabIndex={0}
      className={`resize-handle ${orientation}${className ? ` ${className}` : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={cleanBody}
      onDoubleClick={onReset}
      onKeyDown={onKeyDown}
    />
  );
}