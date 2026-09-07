/** Abstract syntax tree for the FarmScript language. */

export interface Program {
  statements: Statement[];
}

export type Statement =
  | AssignmentStmt
  | CallStmt
  | IfStmt
  | ForStmt
  | WhileStmt
  | FunctionDefStmt
  | ReturnStmt;

export interface AssignmentStmt {
  kind: "assignment";
  target: string;
  /** "=", "+=", "-=", "*=" or "/=". */
  op: "=" | "+=" | "-=" | "*=" | "/=";
  value: Expr;
  line: number;
}

export interface CallStmt {
  kind: "call";
  expr: CallExpr;
  line: number;
}

export interface IfStmt {
  kind: "if";
  branches: { cond: Expr; body: Statement[] }[];
  elseBody: Statement[] | null;
  line: number;
}

export interface ForStmt {
  kind: "for";
  varName: string;
  iterable: Expr;
  body: Statement[];
  line: number;
}

export interface WhileStmt {
  kind: "while";
  cond: Expr;
  body: Statement[];
  line: number;
}

export interface FunctionDefStmt {
  kind: "def";
  name: string;
  params: string[];
  body: Statement[];
  line: number;
}

export interface ReturnStmt {
  kind: "return";
  value: Expr | null;
  line: number;
}

export type Expr =
  | NumberLit
  | StringLit
  | BoolLit
  | NoneLit
  | NameExpr
  | CallExpr
  | BinaryExpr
  | UnaryExpr;
// | RangeCallExpr (represented as CallExpr with callee "range")

export interface NumberLit {
  kind: "number";
  value: number;
  line: number;
}

export interface StringLit {
  kind: "string";
  value: string;
  line: number;
}

export interface BoolLit {
  kind: "bool";
  value: boolean;
  line: number;
}

export interface NoneLit {
  kind: "none";
  line: number;
}

export interface NameExpr {
  kind: "name";
  name: string;
  line: number;
}

export interface CallExpr {
  kind: "call";
  callee: string;
  args: Expr[];
  line: number;
}

export type BinaryOp = "+" | "-" | "*" | "/" | "==" | "!=" | "<" | ">" | "<=" | ">=" | "and" | "or";

export interface BinaryExpr {
  kind: "binary";
  op: BinaryOp;
  left: Expr;
  right: Expr;
  line: number;
}

export interface UnaryExpr {
  kind: "unary";
  op: "not" | "-";
  operand: Expr;
  line: number;
}