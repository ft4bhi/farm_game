import { Token, TokenType } from "@/scripting/lexer/Token";
import { Lexer } from "@/scripting/lexer/Lexer";
import { ScriptSyntaxError } from "@/scripting/ScriptSyntaxError";
import type {
  Program,
  Statement,
  Expr,
  BinaryOp,
  IfStmt,
  ForStmt,
  WhileStmt,
} from "@/scripting/parser/AST";

type Maybe<T> = T | null;

const ASSIGNMENT_OPS = new Set([
  TokenType.EQ,
  TokenType.PLUS_EQ,
  TokenType.MINUS_EQ,
  TokenType.STAR_EQ,
  TokenType.SLASH_EQ,
]);

/**
 * Recursive-descent parser for the FarmScript language. Consumes a flat
 * token stream (with INDENT/DEDENT) and produces an AST.
 */
export class Parser {
  private tokens: Token[] = [];
  private pos = 0;
  /** True when the most recent parseStatement() was a block statement. */
  private lastStatementWasBlock = false;

  parse(source: string): Program {
    const lexer = new Lexer();
    this.tokens = lexer.tokenize(source);
    this.pos = 0;

    const statements = this.parseTopBlock();
    this.expect(TokenType.EOF, "Unexpected tokens after program.");
    return { statements };
  }

  // ---- block helpers ---------------------------------------------------

  private advance(): Token {
    const token = this.tokens[this.pos];
    this.pos += 1;
    return token;
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private expect(type: TokenType, message: string): Token {
    if (this.peek().type !== type) {
      const found = this.describeToken(this.peek());
      throw new ScriptSyntaxError(`${message}\nExpected ${type} but found ${found}.`, this.peek().line);
    }
    return this.advance();
  }

  private describeToken(token: Token): string {
    if (token.type === TokenType.EOF) return "end of program";
    if (token.type === TokenType.NEWLINE) return "end of line";
    return `'${token.text}'`;
  }

  private skipNewlines(): void {
    while (this.check(TokenType.NEWLINE)) this.advance();
  }

  private parseTopBlock(): Statement[] {
    const statements: Statement[] = [];
    this.skipNewlines();
    while (!this.check(TokenType.EOF)) {
      if (this.check(TokenType.DEDENT)) {
        this.advance();
        continue;
      }
      statements.push(this.parseStatement());
      this.consumeStatementEnd();
      this.skipNewlines();
    }
    return statements;
  }

  /**
   * Consumes the end of a statement. A block statement (if/for/while/def)
   * absorbs the trailing newline while closing its own indentation, so after
   * it the next statement starts immediately with the DEDENT already gone.
   */
  private consumeStatementEnd(): void {
    if (this.check(TokenType.NEWLINE)) {
      this.advance();
      return;
    }
    if (this.check(TokenType.EOF) || this.check(TokenType.DEDENT)) {
      return;
    }
    if (this.lastStatementWasBlock) {
      return;
    }
    throw new ScriptSyntaxError(
      "Expected a newline after the statement.",
      this.peek().line,
    );
  }

  private parseIndentedBlock(what: string): Statement[] {
    if (this.check(TokenType.NEWLINE)) this.advance();
    this.expect(
      TokenType.INDENT,
      `Expected an indented block after ${what}.`,
    );
    const statements: Statement[] = [];
    while (!this.check(TokenType.DEDENT) && !this.check(TokenType.EOF)) {
      statements.push(this.parseStatement());
      this.consumeStatementEnd();
      this.skipNewlines();
    }
    this.expect(TokenType.DEDENT, `Unterminated block after ${what}.`);
    return statements;
  }

  // ---- statements --------------------------------------------------------

  private parseStatement(): Statement {
    const token = this.peek();
    const isBlock = [
      TokenType.IF,
      TokenType.FOR,
      TokenType.WHILE,
      TokenType.DEF,
    ].includes(token.type);

    let stmt: Statement;
    switch (token.type) {
      case TokenType.IDENT: {
        const next = this.peek(1);
        if (next.type === TokenType.EQ || ASSIGNMENT_OPS.has(next.type)) {
          stmt = this.parseAssignment();
        } else {
          stmt = this.parseCallStatement();
        }
        break;
      }
      case TokenType.IF:
        stmt = this.parseIf();
        break;
      case TokenType.FOR:
        stmt = this.parseFor();
        break;
      case TokenType.WHILE:
        stmt = this.parseWhile();
        break;
      case TokenType.DEF:
        stmt = this.parseFunctionDef();
        break;
      case TokenType.RETURN:
        stmt = this.parseReturn();
        break;
      default:
        throw new ScriptSyntaxError(
          `Cannot start a statement with ${this.describeToken(token)}.`,
          token.line,
        );
    }

    // Block statements absorb their own trailing newline + DEDENT; record that
    // so the caller knows not to demand another newline afterwards.
    this.lastStatementWasBlock = isBlock;
    return stmt;
  }

  private parseAssignment(): Statement {
    const target = this.advance(); // IDENT
    const opToken = this.advance();
    let op: "=" | "+=" | "-=" | "*=" | "/=";
    switch (opToken.type) {
      case TokenType.EQ: op = "="; break;
      case TokenType.PLUS_EQ: op = "+="; break;
      case TokenType.MINUS_EQ: op = "-="; break;
      case TokenType.STAR_EQ: op = "*="; break;
      default: op = "/="; break;
    }
    const value = this.parseExpression();
    return { kind: "assignment", target: target.text, op, value, line: target.line };
  }

  private parseCallStatement(): Statement {
    const expr = this.parsePrimary();
    if (expr.kind !== "call") {
      throw new ScriptSyntaxError(
        "Only function calls are allowed as statements.",
        expr.line,
      );
    }
    return { kind: "call", expr, line: expr.line };
  }

  private parseIf(): IfStmt {
    const start = this.advance(); // 'if'
    const branches: { cond: Expr; body: Statement[] }[] = [];
    let cond = this.parseExpression();
    this.expect(TokenType.COLON, "Expected ':' after the if condition.");
    let body = this.parseIndentedBlock("the 'if' condition");
    branches.push({ cond, body });

    while (this.check(TokenType.NEWLINE)) this.advance();

    while (this.check(TokenType.ELIF)) {
      this.advance();
      cond = this.parseExpression();
      this.expect(TokenType.COLON, "Expected ':' after the elif condition.");
      body = this.parseIndentedBlock("the 'elif' condition");
      branches.push({ cond, body });
      while (this.check(TokenType.NEWLINE)) this.advance();
    }

    let elseBody: Statement[] | null = null;
    if (this.check(TokenType.ELSE)) {
      this.advance();
      this.expect(TokenType.COLON, "Expected ':' after 'else'.");
      elseBody = this.parseIndentedBlock("'else'");
    }

    return { kind: "if", branches, elseBody, line: start.line };
  }

  private parseFor(): ForStmt {
    const start = this.advance(); // 'for'
    const varToken = this.expect(TokenType.IDENT, "Expected a loop variable after 'for'.");
    this.expect(TokenType.IN, "Expected 'in' in the for-loop.");
    const iterable = this.parseExpression();
    this.expect(TokenType.COLON, "Expected ':' after the for-loop header.");
    const body = this.parseIndentedBlock("the 'for' loop");
    return { kind: "for", varName: varToken.text, iterable, body, line: start.line };
  }

  private parseWhile(): WhileStmt {
    const start = this.advance(); // 'while'
    const cond = this.parseExpression();
    this.expect(TokenType.COLON, "Expected ':' after the while condition.");
    const body = this.parseIndentedBlock("the 'while' loop");
    return { kind: "while", cond, body, line: start.line };
  }

  private parseFunctionDef(): Statement {
    const start = this.advance(); // 'def'
    const name = this.expect(TokenType.IDENT, "Expected a function name after 'def'.");
    this.expect(TokenType.LPAREN, "Expected '(' after the function name.");
    const params: string[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        const param = this.expect(TokenType.IDENT, "Expected a parameter name.");
        params.push(param.text);
      } while (this.check(TokenType.COMMA) && (this.advance(), true));
    }
    this.expect(TokenType.RPAREN, "Expected ')' to close the parameter list.");
    this.expect(TokenType.COLON, "Expected ':' after the function header.");
    const body = this.parseIndentedBlock("the 'def' function");
    return { kind: "def", name: name.text, params, body, line: start.line };
  }

  private parseReturn(): Statement {
    const start = this.advance(); // 'return'
    if (this.check(TokenType.NEWLINE) || this.check(TokenType.EOF)) {
      return { kind: "return", value: null, line: start.line };
    }
    const value = this.parseExpression();
    return { kind: "return", value, line: start.line };
  }

  // ---- expressions --------------------------------------------------------

  private parseExpression(): Expr {
    return this.parseOr();
  }

  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.check(TokenType.OR)) {
      const op = this.advance();
      const right = this.parseAnd();
      left = { kind: "binary", op: "or", left, right, line: op.line };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseNot();
    while (this.check(TokenType.AND)) {
      const op = this.advance();
      const right = this.parseNot();
      left = { kind: "binary", op: "and", left, right, line: op.line };
    }
    return left;
  }

  private parseNot(): Expr {
    if (this.check(TokenType.NOT)) {
      const op = this.advance();
      return { kind: "unary", op: "not", operand: this.parseNot(), line: op.line };
    }
    return this.parseComparison();
  }

  private parseComparison(): Expr {
    let left = this.parseAdditive();
    while (true) {
      let op: BinaryOp | null = null;
      switch (this.peek().type) {
        case TokenType.EQEQ: op = "=="; break;
        case TokenType.NE: op = "!="; break;
        case TokenType.LT: op = "<"; break;
        case TokenType.GT: op = ">"; break;
        case TokenType.LE: op = "<="; break;
        case TokenType.GE: op = ">="; break;
        default: break;
      }
      if (!op) break;
      const opToken = this.advance();
      const right = this.parseAdditive();
      left = { kind: "binary", op, left, right, line: opToken.line };
    }
    return left;
  }

  private parseAdditive(): Expr {
    let left = this.parseMultiplicative();
    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const opToken = this.advance();
      const right = this.parseMultiplicative();
      left = {
        kind: "binary",
        op: opToken.type === TokenType.PLUS ? "+" : "-",
        left,
        right,
        line: opToken.line,
      };
    }
    return left;
  }

  private parseMultiplicative(): Expr {
    let left = this.parseUnary();
    while (this.check(TokenType.STAR) || this.check(TokenType.SLASH)) {
      const opToken = this.advance();
      const right = this.parseUnary();
      left = {
        kind: "binary",
        op: opToken.type === TokenType.STAR ? "*" : "/",
        left,
        right,
        line: opToken.line,
      };
    }
    return left;
  }

  private parseUnary(): Expr {
    if (this.check(TokenType.MINUS)) {
      const op = this.advance();
      return { kind: "unary", op: "-", operand: this.parseUnary(), line: op.line };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expr {
    const token = this.peek();
    switch (token.type) {
      case TokenType.NUMBER: {
        this.advance();
        const value = Number(token.text);
        if (!Number.isFinite(value)) {
          throw new ScriptSyntaxError(`Invalid number '${token.text}'.`, token.line);
        }
        return { kind: "number", value, line: token.line };
      }
      case TokenType.STRING:
        this.advance();
        return { kind: "string", value: token.text, line: token.line };
      case TokenType.TRUE:
        this.advance();
        return { kind: "bool", value: true, line: token.line };
      case TokenType.FALSE:
        this.advance();
        return { kind: "bool", value: false, line: token.line };
      case TokenType.NONE:
        this.advance();
        return { kind: "none", line: token.line };
      case TokenType.IDENT: {
        this.advance();
        if (this.check(TokenType.LPAREN)) {
          return this.parseCallArgs(token);
        }
        return { kind: "name", name: token.text, line: token.line };
      }
      case TokenType.LPAREN: {
        this.advance();
        const expr = this.parseExpression();
        this.expect(TokenType.RPAREN, "Expected ')' to close the parenthesised expression.");
        return expr;
      }
      default:
        throw new ScriptSyntaxError(
          `Unexpected ${this.describeToken(token)} in expression.`,
          token.line,
        );
    }
  }

  private parseCallArgs(callee: Token): Expr {
    this.advance(); // consume '('
    const args: Expr[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.check(TokenType.COMMA) && (this.advance(), true));
    }
    this.expect(TokenType.RPAREN, "Expected ')' to close the argument list.");
    return { kind: "call", callee: callee.text, args, line: callee.line };
  }
}

/** Convenience factory so the module can be used as `parseScript(source)`. */
export function parseScript(source: string): Program {
  return new Parser().parse(source);
}