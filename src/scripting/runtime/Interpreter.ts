import type {
  Program,
  Statement,
  Expr,
} from "@/scripting/parser/AST";
import {
  bool,
  constant,
  isTruthy,
  langEquals,
  langToString,
  makeRange,
  noneValue,
  num,
  str,
  type LangValue,
} from "@/scripting/runtime/Values";
import { RuntimeContext, Scope } from "@/scripting/runtime/RuntimeContext";
import { RuntimeError } from "@/scripting/runtime/RuntimeError";
import { getCommand } from "@/data/commands";

export type EngineArg = string | number | boolean | null;

/** Yielded to the driver when a statement or loop begins (for highlighting). */
export interface LineStep {
  kind: "step";
  line: number;
}

/** Yielded when the program calls a game command; the driver sends the result back. */
export interface HostRequest {
  kind: "host";
  name: string;
  args: EngineArg[];
  line: number;
}

export type ExecYield = LineStep | HostRequest;

/** Used internally to unwind `return` from a generator-based function body. */
class ReturnSignal {
  constructor(readonly value: LangValue) {}
}

type RunGen = Generator<ExecYield, void, EngineArg>;
type ExprGen = Generator<ExecYield, LangValue, EngineArg>;

/**
 * Tree-walking interpreter for FarmScript. It runs in lock-step with the
 * simulation: every statement marks its line, and every game command yields a
 * HostRequest. The generator-based design lets the driver pause, stop, step
 * and animate without ever evaluating arbitrary JavaScript.
 */
export class Interpreter {
  constructor(
    private readonly program: Program,
    private readonly ctx: RuntimeContext,
  ) {}

  /** Entry point. The caller drives this generator one "tick" at a time. */
  begin(): RunGen {
    return this.execBody(this.program.statements);
  }

  private *execBody(stmts: Statement[]): RunGen {
    for (const stmt of stmts) {
      yield* this.execStatement(stmt);
    }
  }

  private *mark(line: number): RunGen {
    this.ctx.bump(line);
    yield { kind: "step", line };
  }

  private *execStatement(stmt: Statement): RunGen {
    switch (stmt.kind) {
      case "assignment": {
        yield* this.mark(stmt.line);
        let value = yield* this.evalExpr(stmt.value);
        if (stmt.op !== "=") {
          const current = this.ctx.currentScope.lookup(stmt.target);
          if (current === undefined) {
            throw new RuntimeError(
              `Assignment needs a starting value: name '${stmt.target}' is not defined.`,
              stmt.line,
            );
          }
          value = this.applyCompound(stmt.op, current, value, stmt.line);
        }
        this.ctx.currentScope.define(stmt.target, value);
        return;
      }
      case "call": {
        yield* this.mark(stmt.line);
        yield* this.evalExpr(stmt.expr);
        return;
      }
      case "if": {
        yield* this.mark(stmt.line);
        let done = false;
        for (const branch of stmt.branches) {
          const cond = yield* this.evalExpr(branch.cond);
          if (isTruthy(cond)) {
            yield* this.execBody(branch.body);
            done = true;
            break;
          }
        }
        if (!done && stmt.elseBody) {
          yield* this.execBody(stmt.elseBody);
        }
        return;
      }
      case "for": {
        yield* this.mark(stmt.line);
        const iterable = yield* this.evalExpr(stmt.iterable);
        const rng = this.toRange(iterable, stmt.line);
        const step = rng.step;
        let i = rng.start;
        while (step > 0 ? i < rng.stop : i > rng.stop) {
          yield* this.mark(stmt.line);
          this.ctx.currentScope.define(stmt.varName, num(i));
          yield* this.execBody(stmt.body);
          i += step;
        }
        return;
      }
      case "while": {
        yield* this.mark(stmt.line);
        while (isTruthy(yield* this.evalExpr(stmt.cond))) {
          yield* this.mark(stmt.line);
          yield* this.execBody(stmt.body);
        }
        return;
      }
      case "def": {
        yield* this.mark(stmt.line);
        const closure = this.ctx.currentScope;
        this.ctx.defineFunction({
          name: stmt.name,
          params: stmt.params,
          body: stmt.body,
          closure,
        });
        return;
      }
      case "return": {
        yield* this.mark(stmt.line);
        const value = stmt.value
          ? yield* this.evalExpr(stmt.value)
          : noneValue();
        throw new ReturnSignal(value);
      }
    }
  }

  private toRange(value: LangValue, line: number): { start: number; stop: number; step: number } {
    if (value.kind === "range") return value;
    if (value.kind === "number") {
      return { start: 0, stop: Math.floor(value.value), step: 1 };
    }
    throw new RuntimeError(
      `'for ... in' requires range(...) but found ${langToString(value)}.`,
      line,
    );
  }

  private applyCompound(
    op: "=" | "+=" | "-=" | "*=" | "/=",
    current: LangValue,
    value: LangValue,
    line: number,
  ): LangValue {
    switch (op) {
      case "=":
        return value;
      case "+=":
        return this.binary("+", current, value, line);
      case "-=":
        return this.binary("-", current, value, line);
      case "*=":
        return this.binary("*", current, value, line);
      case "/=":
        return this.binary("/", current, value, line);
    }
  }

  private *evalExpr(expr: Expr): ExprGen {
    switch (expr.kind) {
      case "number":
        return num(expr.value);
      case "string":
        return str(expr.value);
      case "bool":
        return bool(expr.value);
      case "none":
        return noneValue();
      case "name":
        return this.ctx.resolveName(expr.name, expr.line);
      case "call":
        return yield* this.evalCall(expr);
      case "unary": {
        const operand = yield* this.evalExpr(expr.operand);
        if (expr.op === "not") return bool(!isTruthy(operand));
        if (operand.kind !== "number") {
          throw new RuntimeError(
            `Cannot negate ${langToString(operand)} (expected a number).`,
            expr.line,
          );
        }
        return num(-operand.value);
      }
      case "binary":
        return yield* this.evalBinary(expr);
    }
  }

  private *evalBinary(
    expr: Extract<Expr, { kind: "binary" }>,
  ): ExprGen {
    if (expr.op === "and" || expr.op === "or") {
      const left = yield* this.evalExpr(expr.left);
      if (expr.op === "and") {
        return isTruthy(left) ? yield* this.evalExpr(expr.right) : left;
      }
      return isTruthy(left) ? left : yield* this.evalExpr(expr.right);
    }
    const left = yield* this.evalExpr(expr.left);
    const right = yield* this.evalExpr(expr.right);
    return this.binary(expr.op, left, right, expr.line);
  }

  private binary(
    op: Extract<Expr, { kind: "binary" }>["op"],
    left: LangValue,
    right: LangValue,
    line: number,
  ): LangValue {
    switch (op) {
      case "+":
        if (left.kind === "number" && right.kind === "number") {
          return num(left.value + right.value);
        }
        if (left.kind === "string" && right.kind === "string") {
          return str(left.value + right.value);
        }
        break;
      case "-":
        if (left.kind === "number" && right.kind === "number") {
          return num(left.value - right.value);
        }
        break;
      case "*":
        if (left.kind === "number" && right.kind === "number") {
          return num(left.value * right.value);
        }
        break;
      case "/":
        if (left.kind === "number" && right.kind === "number") {
          if (right.value === 0) {
            throw new RuntimeError("Division by zero.", line);
          }
          return num(left.value / right.value);
        }
        break;
      case "==":
        return bool(langEquals(left, right));
      case "!=":
        return bool(!langEquals(left, right));
      case "<":
      case ">":
      case "<=":
      case ">=":
        if (left.kind === "number" && right.kind === "number") {
          switch (op) {
            case "<": return bool(left.value < right.value);
            case ">": return bool(left.value > right.value);
            case "<=": return bool(left.value <= right.value);
            case ">=": return bool(left.value >= right.value);
          }
        }
        break;
      case "and":
      case "or":
        break;
    }
    throw new RuntimeError(
      `Operator '${op}' is not supported between ${langToString(left)} and ${langToString(right)}.`,
      line,
    );
  }

  private *evalCall(
    call: Extract<Expr, { kind: "call" }>,
  ): ExprGen {
    const args: LangValue[] = [];
    for (const arg of call.args) {
      args.push(yield* this.evalExpr(arg));
    }

    const name = call.callee;

    if (name === "range") {
      return this.callRange(args, call.line);
    }

    const userFn = this.ctx.getFunction(name);
    if (userFn) {
      if (args.length !== userFn.params.length) {
        throw new RuntimeError(
          `${name}() expects ${userFn.params.length} argument(s) but got ${args.length}.`,
          call.line,
        );
      }
      const scope = new Scope(userFn.closure);
      userFn.params.forEach((param, index) => scope.define(param, args[index]));
      const previous = this.ctx.currentScope;
      this.ctx.currentScope = scope;
      try {
        yield* this.execBody(userFn.body);
      } catch (err) {
        if (err instanceof ReturnSignal) return err.value;
        throw err;
      } finally {
        this.ctx.currentScope = previous;
      }
      return noneValue();
    }

    const command = getCommand(name);
    if (command) {
      if (args.length !== command.arity) {
        throw new RuntimeError(
          `${name}() expects ${command.arity} argument(s) but got ${args.length}.`,
          call.line,
        );
      }
      const engineArgs: EngineArg[] = args.map((v) => this.toEngineArg(v, call.line));
      const result = yield {
        kind: "host",
        name,
        args: engineArgs,
        line: call.line,
      } as HostRequest;
      return this.fromEngineArg(result);
    }

    throw new RuntimeError(
      `Unknown function: ${name}()`,
      call.line,
    );
  }

  private callRange(args: LangValue[], line: number): LangValue {
    if (args.length === 0 || args.length > 3) {
      throw new RuntimeError(
        `range() expects 1 to 3 arguments but got ${args.length}.`,
        line,
      );
    }
    const numbers = args.map((a, i) => {
      if (a.kind !== "number") {
        throw new RuntimeError(
          `range() argument ${i + 1} must be a number but got ${langToString(a)}.`,
          line,
        );
      }
      return Math.trunc(a.value);
    });
    const [a, b, c] = numbers;
    if (args.length === 1) return makeRange(0, a, 1);
    if (args.length === 2) return makeRange(a, b, 1);
    if (c === 0) throw new RuntimeError("range() step cannot be zero.", line);
    return makeRange(a, b, c);
  }

  private toEngineArg(value: LangValue, line: number): EngineArg {
    switch (value.kind) {
      case "number":
        return value.value;
      case "boolean":
        return value.value;
      case "string":
        return value.value;
      case "constant":
        return value.id;
      case "none":
        return null;
      case "range":
        throw new RuntimeError(
          "A range cannot be passed as an argument to a command.",
          line,
        );
    }
  }

  private fromEngineArg(value: EngineArg | undefined): LangValue {
    if (value === undefined || value === null) return noneValue();
    if (typeof value === "number") return num(value);
    if (typeof value === "boolean") return bool(value);
    return constant(value);
  }
}

/** Convenience factory. Returns a fresh generator for the program. */
export function interpretProgram(
  program: Program,
  ctx: RuntimeContext,
): RunGen {
  return new Interpreter(program, ctx).begin();
}