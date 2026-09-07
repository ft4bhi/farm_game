/** Errors raised while a program executes (as opposed to parse errors). */
export class RuntimeError extends Error {
  readonly line: number;
  constructor(message: string, line: number) {
    super(`Line ${line}\n\n${message}`);
    this.name = "RuntimeError";
    this.line = line;
  }
}