/**
 * Convert an arbitrary thrown value into a real `Error`.
 *
 * Monaco's internal web-worker error handling calls its global unexpected
 * error handler with whatever the worker reports - when a worker fails to
 * load that value is a raw DOM event (an `ErrorEvent`) rather than an
 * `Error`. `ErrorHandler` then rethrows that value and the browser displays
 * it as the cryptic "[object Event]". This helper guarantees the value that
 * leaves our code is always a genuine `Error` so the app never surfaces a
 * raw DOM event.
 *
 * Real `Error` instances are returned unchanged so their message and stack
 * are preserved. Everything else (DOM events, strings, objects, ...) is
 * folded into a new `Error` that keeps whatever diagnostic detail exists.
 */
export function toError(
  value: unknown,
  fallbackMessage = "Unknown error",
): Error {
  if (value instanceof Error) {
    return value;
  }

  if (
    typeof DOMException !== "undefined" &&
    value instanceof DOMException
  ) {
    return new Error(value.message, { cause: value });
  }

  const message = extractDiagnostics(value);
  const error = new Error(message || fallbackMessage, { cause: value });
  error.name = "Error";
  return error;
}

function extractDiagnostics(value: unknown): string {
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const rawMessage = typeof record.message === "string" ? record.message : "";
    // Chrome stringifies a raw DOM event via Object#toString as "[object
    // Event]" - that is never a useful message, drop it.
    const message = /^\[object \w+\]$/.test(rawMessage.trim())
      ? ""
      : rawMessage.trim();
    const filename = typeof record.filename === "string" ? record.filename.trim() : "";
    if (filename !== "") {
      const lineno = typeof record.lineno === "number" ? record.lineno : null;
      const colno = typeof record.colno === "number" ? record.colno : null;
      const where =
        lineno !== null
          ? colno !== null
            ? `${filename}:${lineno}:${colno}`
            : `${filename}:${lineno}`
          : filename;
      return message !== "" ? `${message} (${where})` : `Failed to load resource (${where})`;
    }
    return message;
  }
  return "";
}