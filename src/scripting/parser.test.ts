import { describe, it, expect } from "vitest";
import { Parser } from "@/scripting/parser/Parser";
import { expectSyntaxError } from "@/scripting/testHarness";
import { ScriptSyntaxError } from "@/scripting/ScriptSyntaxError";
import type { Program } from "@/scripting/parser/AST";

function first(stmtKind: string, source: string) {
  const program: Program = new Parser().parse(source);
  const stmt = program.statements[0];
  expect(stmt.kind).toBe(stmtKind);
  return stmt;
}

describe("FarmScript lexer", () => {
  it("tokenizes a simple program", () => {
    const program: Program = new Parser().parse("move(North)\nmove(East)\n");
    expect(program.statements).toHaveLength(2);
  });

  it("rejects an unexpected character", () => {
    expectSyntaxError("move(North) @garbage");
  });

  it("rejects inconsistent indentation", () => {
    const source = "if can_harvest():\n    harvest()\n  move(North)\n";
    try {
      new Parser().parse(source);
      throw new Error("Expected a syntax error");
    } catch (err) {
      expect(err).toBeInstanceOf(ScriptSyntaxError);
    }
  });
});

describe("FarmScript parser", () => {
  it("parses a function call statement", () => {
    const stmt = first("call", "move(North)\n") as Extract<
      Program["statements"][number],
      { kind: "call" }
    >;
    expect(stmt.expr.callee).toBe("move");
    expect(stmt.expr.args).toHaveLength(1);
  });

  it("parses an assignment and compound assignment", () => {
    const asm = first("assignment", "x = 5\n") as Extract<
      Program["statements"][number],
      { kind: "assignment" }
    >;
    expect(asm.target).toBe("x");
    expect(asm.op).toBe("=");
    expect(asm.value.kind).toBe("number");

    const cmpd = first("assignment", "x += 1\n") as Extract<
      Program["statements"][number],
      { kind: "assignment" }
    >;
    expect(cmpd.op).toBe("+=");
  });

  it("parses an if/else statement", () => {
    const stmt = first(
      "if",
      "if can_harvest():\n    harvest()\nelse:\n    move(West)\n",
    ) as Extract<Program["statements"][number], { kind: "if" }>;
    expect(stmt.branches).toHaveLength(1);
    expect(stmt.branches[0].body).toHaveLength(1);
    expect(stmt.elseBody).toHaveLength(1);
  });

  it("parses an elif chain", () => {
    const stmt = first(
      "if",
      "if get_position_x() == 0:\n    move(East)\nelif get_position_x() == 1:\n    move(West)\nelse:\n    move(North)\n",
    ) as Extract<Program["statements"][number], { kind: "if" }>;
    expect(stmt.branches).toHaveLength(2);
    expect(stmt.elseBody).toHaveLength(1);
  });

  it("parses a for loop with range", () => {
    const stmt = first(
      "for",
      "for i in range(4):\n    move(North)\n",
    ) as Extract<Program["statements"][number], { kind: "for" }>;
    expect(stmt.varName).toBe("i");
    expect(stmt.iterable.kind).toBe("call");
    expect(stmt.body).toHaveLength(1);
  });

  it("parses a while loop", () => {
    const stmt = first(
      "while",
      "while get_position_y() > 6:\n    move(North)\n",
    ) as Extract<Program["statements"][number], { kind: "while" }>;
    expect(stmt.cond.kind).toBe("binary");
    expect(stmt.body).toHaveLength(1);
  });

  it("parses a function definition with a return", () => {
    const stmt = first(
      "def",
      "def go(n):\n    move(North)\n    return n + 1\n",
    ) as Extract<Program["statements"][number], { kind: "def" }>;
    expect(stmt.name).toBe("go");
    expect(stmt.params).toEqual(["n"]);
    expect(stmt.body.map((s) => s.kind)).toEqual(["call", "return"]);
  });

  it("uses correct operator precedence", () => {
    const stmt = first(
      "assignment",
      "y = 1 + 2 * 3\n",
    ) as Extract<Program["statements"][number], { kind: "assignment" }>;
    const value = stmt.value as { kind: "binary"; op: string; right: { kind: string; op: string } };
    expect(value.kind).toBe("binary");
    expect(value.op).toBe("+");
    expect(value.right.kind).toBe("binary");
    expect(value.right.op).toBe("*");
  });

  it("rejects trailing garbage", () => {
    expectSyntaxError("move(North) move(East)");
  });

  it("rejects an unterminated expression", () => {
    expectSyntaxError("x =");
    expectSyntaxError("move(North");
    expectSyntaxError("move(");
  });

  it("rejects a missing block body", () => {
    expectSyntaxError("if True:\n\nmove(North)");
  });
});