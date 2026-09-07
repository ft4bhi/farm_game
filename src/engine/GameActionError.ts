/** Thrown when a game action is illegal in the current world state. */
export class GameActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameActionError";
  }
}