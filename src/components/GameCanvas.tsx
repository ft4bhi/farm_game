import { forwardRef } from "react";

const GameCanvas = forwardRef<HTMLCanvasElement>(function GameCanvas(_props, ref) {
  return <canvas ref={ref} aria-label="Farm world" />;
});

export default GameCanvas;