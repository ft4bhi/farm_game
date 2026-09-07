import {
  KEYWORD_TO_TYPE,
  Token,
  TokenType,
} from "@/scripting/lexer/Token";
import { ScriptSyntaxError } from "@/scripting/ScriptSyntaxError";

const TWO_CHAR: Record<string, TokenType> = {
  "==": TokenType.EQEQ,
  "!=": TokenType.NE,
  "<=": TokenType.LE,
  ">=": TokenType.GE,
  "+=": TokenType.PLUS_EQ,
  "-=": TokenType.MINUS_EQ,
  "*=": TokenType.STAR_EQ,
  "/=": TokenType.SLASH_EQ,
};

const ONE_CHAR: Record<string, TokenType> = {
  "(": TokenType.LPAREN,
  ")": TokenType.RPAREN,
  ":": TokenType.COLON,
  ",": TokenType.COMMA,
  "+": TokenType.PLUS,
  "-": TokenType.MINUS,
  "*": TokenType.STAR,
  "/": TokenType.SLASH,
  "=": TokenType.EQ,
  "<": TokenType.LT,
  ">": TokenType.GT,
};

const TAB_WIDTH = 4;

/**
 * Tokenizes the FarmScript language into a flat token stream including
 * NEWLINE / INDENT / DEDENT tokens, mirroring Python's block structure.
 */
export class Lexer {
  private readonly tokens: Token[] = [];
  private readonly indentStack: number[] = [0];

  tokenize(source: string): Token[] {
    this.tokens.length = 0;
    this.indentStack.length = 0;
    this.indentStack.push(0);

    const rawLines = source.split("\n");
    // Normalize \r\n as well as stray \r.
    const lines = rawLines.map((line) => line.replace(/\r$/, ""));

    for (let i = 0; i < lines.length; i += 1) {
      const lineNo = i + 1;
      const text = lines[i];

      if (this.isBlank(text)) continue;

      const indent = this.measureIndent(text);
      const content = text.slice(indent);

      if (content.startsWith("#")) continue;

      this.emitIndentChange(indent, lineNo);
      this.tokenizeLine(content, lineNo);

      // Significant newline (not at EOF).
      if (i < lines.length - 1) {
        this.tokens.push({ type: TokenType.NEWLINE, text: "\n", line: lineNo, col: 0 });
      }
    }

    // Close any open indents at EOF.
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      this.tokens.push({ type: TokenType.DEDENT, text: "", line: lines.length, col: 0 });
    }
    this.tokens.push({
      type: TokenType.EOF,
      text: "",
      line: lines.length,
      col: 0,
    });
    return this.tokens;
  }

  private isBlank(line: string): boolean {
    return line.trim() === "";
  }

  private measureIndent(line: string): number {
    let col = 0;
    for (const ch of line) {
      if (ch === " ") col += 1;
      else if (ch === "\t") col += TAB_WIDTH;
      else break;
    }
    return col;
  }

  private emitIndentChange(indent: number, lineNo: number): void {
    const top = this.indentStack[this.indentStack.length - 1];
    if (indent > top) {
      this.indentStack.push(indent);
      this.tokens.push({ type: TokenType.INDENT, text: "", line: lineNo, col: 0 });
      return;
    }
    if (indent < top) {
      while (
        this.indentStack.length > 1 &&
        this.indentStack[this.indentStack.length - 1] > indent
      ) {
        this.indentStack.pop();
        this.tokens.push({ type: TokenType.DEDENT, text: "", line: lineNo, col: 0 });
      }
      if (this.indentStack[this.indentStack.length - 1] !== indent) {
        throw new ScriptSyntaxError(
          "Indentation does not match any outer block level.",
          lineNo,
        );
      }
    }
  }

  private tokenizeLine(line: string, lineNo: number): void {
    let i = 0;
    let col = 0;

    while (i < line.length) {
      const ch = line[i];

      if (ch === " " || ch === "\t") {
        col += ch === "\t" ? TAB_WIDTH : 1;
        i += 1;
        continue;
      }

      // Inline comment.
      if (ch === "#") {
        break;
      }

      // Number: integer or decimal.
      if (/[0-9]/.test(ch)) {
        let j = i;
        while (j < line.length && /[0-9]/.test(line[j])) j += 1;
        if (line[j] === "." && /[0-9]/.test(line[j + 1] ?? "")) {
          j += 1;
          while (j < line.length && /[0-9]/.test(line[j])) j += 1;
        }
        const text = line.slice(i, j);
        this.tokens.push({ type: TokenType.NUMBER, text, line: lineNo, col });
        i = j;
        continue;
      }

      // Identifier or keyword.
      if (/[A-Za-z_]/.test(ch)) {
        let j = i;
        while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j += 1;
        const text = line.slice(i, j);
        const keyword = KEYWORD_TO_TYPE[text];
        this.tokens.push({
          type: keyword ?? TokenType.IDENT,
          text,
          line: lineNo,
          col,
        });
        i = j;
        continue;
      }

      // String literal.
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let j = i + 1;
        let value = "";
        let closed = false;
        while (j < line.length) {
          const c = line[j];
          if (c === quote) {
            closed = true;
            j += 1;
            break;
          }
          if (c === "\\" && j + 1 < line.length) {
            const next = line[j + 1];
            const escapes: Record<string, string> = { n: "\n", t: "\t", "\\": "\\", '"': '"', "'": "'" };
            value += escapes[next] ?? next;
            j += 2;
            continue;
          }
          value += c;
          j += 1;
        }
        if (!closed) {
          throw new ScriptSyntaxError("Unterminated string literal.", lineNo);
        }
        this.tokens.push({ type: TokenType.STRING, text: value, line: lineNo, col });
        i = j;
        continue;
      }

      // Operators.
      const two = line.slice(i, i + 2);
      const twoType = TWO_CHAR[two];
      if (twoType) {
        this.tokens.push({ type: twoType, text: two, line: lineNo, col });
        i += 2;
        continue;
      }
      const oneType = ONE_CHAR[ch];
      if (oneType) {
        this.tokens.push({ type: oneType, text: ch, line: lineNo, col });
        i += 1;
        col += 1;
        continue;
      }

      throw new ScriptSyntaxError(
        `Unexpected character '${ch}'.`,
        lineNo,
      );
    }
  }
}