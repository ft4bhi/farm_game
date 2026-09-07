export class ScriptSyntaxError extends Error {
  readonly line: number;
  constructor(message: string, line: number) {
    super(`Line ${line}\n\n${message}`);
    this.name = "ScriptSyntaxError";
    this.line = line;
  }
}