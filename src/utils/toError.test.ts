import { describe, it, expect } from "vitest";
import { toError } from "@/utils/toError";

describe("toError", () => {
  it("passes real Error instances through unchanged", () => {
    const original = new Error("FarmScript runtime error");
    const result = toError(original);
    expect(result).toBe(original);
    expect(result.message).toBe("FarmScript runtime error");
  });

  it("passes TypeError (subclass of Error) through unchanged", () => {
    const original = new TypeError("out of range");
    expect(toError(original)).toBe(original);
  });

  it("normalizes a raw DOM-style event into a real Error", () => {
    const fakeEvent = {
      type: "error",
      message: "",
      filename: "/_next/static/media/editor.worker.js",
      lineno: 1,
      colno: 7,
      constructor: { name: "Event" },
    };
    const result = toError(fakeEvent);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain("/_next/static/media/editor.worker.js");
    expect(result.message).toContain("1:7");
  });

  it("never produces the opaque '[object Event]' string as a message", () => {
    const result = toError({ type: "error", message: "[object Event]" });
    expect(result).toBeInstanceOf(Error);
    expect(result.message).not.toMatch(/^\[object \w+\]$/);
  });

  it("keeps a meaningful message from a failing resource event", () => {
    const fakeEvent = {
      message: "Failed to load resource",
      filename: "/_next/static/media/worker.x.js",
      lineno: 0,
      colno: 0,
      constructor: { name: "ErrorEvent" },
    };
    const result = toError(fakeEvent);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain("Failed to load resource");
    expect(result.message).toContain("/_next/static/media/worker.x.js");
  });

  it("uses the fallback message for values with no diagnostics", () => {
    const result = toError(7, "Monaco web worker failed to load");
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("Monaco web worker failed to load");
    expect(result.cause).toBe(7);
  });

  it("treats null and undefined as non-errors", () => {
    expect(toError(null, "fallback").message).toBe("fallback");
    expect(toError(undefined, "fallback").message).toBe("fallback");
  });
});