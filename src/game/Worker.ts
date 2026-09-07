import type { Direction } from "@/game/Direction";

/** State of the autonomous FieldBot. */
export interface WorkerState {
  x: number;
  y: number;
  facing: Direction;
}

export function createWorker(x: number, y: number): WorkerState {
  return { x, y, facing: "North" };
}

export function cloneWorker(worker: WorkerState): WorkerState {
  return { x: worker.x, y: worker.y, facing: worker.facing };
}