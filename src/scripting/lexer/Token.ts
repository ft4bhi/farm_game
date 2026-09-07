export const enum TokenType {
  NUMBER = "number",
  STRING = "string",

  IDENT = "ident",

  IF = "if",
  ELIF = "elif",
  ELSE = "else",
  FOR = "for",
  IN = "in",
  WHILE = "while",
  DEF = "def",
  RETURN = "return",
  AND = "and",
  OR = "or",
  NOT = "not",
  TRUE = "true",
  FALSE = "false",
  NONE = "none",

  LPAREN = "(",
  RPAREN = ")",
  COLON = ":",
  COMMA = ",",

  PLUS = "+",
  MINUS = "-",
  STAR = "*",
  SLASH = "/",

  EQ = "=",
  EQEQ = "==",
  NE = "!=",
  LT = "<",
  GT = ">",
  LE = "<=",
  GE = ">=",

  PLUS_EQ = "+=",
  MINUS_EQ = "-=",
  STAR_EQ = "*=",
  SLASH_EQ = "/=",

  NEWLINE = "newline",
  INDENT = "indent",
  DEDENT = "dedent",
  EOF = "eof",
}

export interface Token {
  type: TokenType;
  /** Raw text of the token (numbers keep their source representation). */
  text: string;
  /** 1-based line number. */
  line: number;
  /** Column (0-based) of the token start. */
  col: number;
}

export const KEYWORD_TO_TYPE: Record<string, TokenType> = {
  if: TokenType.IF,
  elif: TokenType.ELIF,
  else: TokenType.ELSE,
  for: TokenType.FOR,
  in: TokenType.IN,
  while: TokenType.WHILE,
  def: TokenType.DEF,
  return: TokenType.RETURN,
  and: TokenType.AND,
  or: TokenType.OR,
  not: TokenType.NOT,
  True: TokenType.TRUE,
  False: TokenType.FALSE,
  None: TokenType.NONE,
};