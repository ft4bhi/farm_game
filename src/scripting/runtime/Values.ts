/** Values manipulated by the FarmScript runtime. */
export type LangValue =
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "string"; value: string }
  | { kind: "constant"; id: string }
  | { kind: "none" }
  | { kind: "range"; start: number; stop: number; step: number };

export const num = (value: number): LangValue => ({ kind: "number", value });
export const bool = (value: boolean): LangValue => ({ kind: "boolean", value });
export const str = (value: string): LangValue => ({ kind: "string", value });
export const constant = (id: string): LangValue => ({ kind: "constant", id });
export const noneValue = (): LangValue => ({ kind: "none" });

export function makeRange(start: number, stop: number, step = 1): LangValue {
  return { kind: "range", start, stop, step };
}

export function isTruthy(value: LangValue): boolean {
  switch (value.kind) {
    case "number":
      return value.value !== 0;
    case "boolean":
      return value.value;
    case "string":
      return value.value.length > 0;
    case "constant":
      return true;
    case "none":
      return false;
    case "range":
      return false;
  }
}

export function langToString(value: LangValue): string {
  switch (value.kind) {
    case "number":
      return Number.isInteger(value.value)
        ? String(value.value)
        : String(Math.round(value.value * 100) / 100);
    case "boolean":
      return value.value ? "True" : "False";
    case "string":
      return value.value;
    case "constant":
      return value.id;
    case "none":
      return "None";
    case "range":
      return `range(${value.start}, ${value.stop}, ${value.step})`;
  }
}

/** Deep equality between two language values. */
export function langEquals(a: LangValue, b: LangValue): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "number":
      return b.kind === "number" && a.value === b.value;
    case "boolean":
      return b.kind === "boolean" && a.value === b.value;
    case "string":
      return b.kind === "string" && a.value === b.value;
    case "constant":
      return b.kind === "constant" && a.id === b.id;
    case "none":
      return b.kind === "none";
    case "range":
      return (
        b.kind === "range" &&
        a.start === b.start &&
        a.stop === b.stop &&
        a.step === b.step
      );
  }
}