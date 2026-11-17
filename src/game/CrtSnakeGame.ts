/**
 * An original grid-snake clone — not a ROM, not an emulator, no licensed assets. Exists so
 * the D-pad/buttons zone has something genuinely playable behind it instead of a static image.
 * Projected onto the Game Boy's in-scene screen by ScreenGamePlane.ts; this class only owns
 * simulation + a flat, low-res, four-shade-green render of the board.
 */

type Vec2 = { x: number; y: number };
type GameState = "ready" | "playing" | "gameover";

export interface CrtSnakeGameOptions {
  canvas: HTMLCanvasElement;
  cols?: number;
  rows?: number;
  cellPx?: number;
  onScoreChange?: (score: number, best: number) => void;
  onStateChange?: (state: GameState) => void;
}

const PALETTE = {
  bg: "#0f380f",
  grid: "#153f15",
  body: "#4f7942",
  bodyLight: "#8bac0f",
  head: "#9bbc0f",
  food: "#c8e88a",
};

const BEST_SCORE_KEY = "gb-splat-portfolio:snake-best";
const DIRS: Record<string, Vec2> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

export class CrtSnakeGame {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cols: number;
  private readonly rows: number;
  private readonly cellPx: number;
  private readonly onScoreChange: ((score: number, best: number) => void) | undefined;
  private readonly onStateChange: ((state: GameState) => void) | undefined;

  private snake: Vec2[] = [];
  private direction: Vec2 = { x: 1, y: 0 };
  private queuedDirection: Vec2 = { x: 1, y: 0 };
  private food: Vec2 = { x: 0, y: 0 };
  private score = 0;
  private best = 0;
  private state: GameState = "ready";

  private tickMs = 140;
  private accumulator = 0;
  private lastFrameTime = 0;
  private rafId: number | null = null;
  private running = false;

  constructor(options: CrtSnakeGameOptions) {
    this.canvas = options.canvas;
    this.cols = options.cols ?? 20;
    this.rows = options.rows ?? 18;
    this.cellPx = options.cellPx ?? 16;
    this.onScoreChange = options.onScoreChange;
    this.onStateChange = options.onStateChange;

    this.canvas.width = this.cols * this.cellPx;
    this.canvas.height = this.rows * this.cellPx;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.best = Number(localStorage.getItem(BEST_SCORE_KEY) ?? 0) || 0;
    this.resetBoard();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    window.addEventListener("keydown", this.handleKeydown);
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
    this.draw();
  }

  destroy(): void {
    this.running = false;
    window.removeEventListener("keydown", this.handleKeydown);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  private resetBoard(): void {
    const cx = Math.floor(this.cols / 2);
    const cy = Math.floor(this.rows / 2);
    this.snake = [
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
      { x: cx - 3, y: cy },
    ];
    this.direction = { x: 1, y: 0 };
    this.queuedDirection = { x: 1, y: 0 };
    this.score = 0;
    this.tickMs = 140;
    this.spawnFood();
    this.setState("ready");
    this.onScoreChange?.(this.score, this.best);
  }

  private setState(state: GameState): void {
    this.state = state;
    this.onStateChange?.(state);
  }

  private spawnFood(): void {
    let candidate: Vec2;
    do {
      candidate = {
        x: Math.floor(Math.random() * this.cols),
        y: Math.floor(Math.random() * this.rows),
      };
    } while (this.snake.some((s) => s.x === candidate.x && s.y === candidate.y));
    this.food = candidate;
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (this.state === "ready" && DIRS[event.key]) {
      this.setState("playing");
    }
    if (this.state === "gameover" && (event.key === " " || event.key === "Enter")) {
      this.resetBoard();
      return;
    }

    const next = DIRS[event.key];
    if (!next) return;
    event.preventDefault();
    // Ignore a direct reversal into the snake's own neck.
    if (next.x === -this.direction.x && next.y === -this.direction.y) return;
    this.queuedDirection = next;
  };

  private readonly loop = (time: number): void => {
    if (!this.running) return;
    const dt = time - this.lastFrameTime;
    this.lastFrameTime = time;

    if (this.state === "playing") {
      this.accumulator += dt;
      while (this.accumulator >= this.tickMs) {
        this.accumulator -= this.tickMs;
        this.step();
      }
    }

    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private step(): void {
    this.direction = this.queuedDirection;
    const head = this.snake[0];
    if (!head) return;

    const next: Vec2 = { x: head.x + this.direction.x, y: head.y + this.direction.y };

    const hitWall = next.x < 0 || next.y < 0 || next.x >= this.cols || next.y >= this.rows;
    const hitSelf = this.snake.some((s) => s.x === next.x && s.y === next.y);
    if (hitWall || hitSelf) {
      this.best = Math.max(this.best, this.score);
      localStorage.setItem(BEST_SCORE_KEY, String(this.best));
      this.onScoreChange?.(this.score, this.best);
      this.setState("gameover");
      return;
    }

    this.snake.unshift(next);

    if (next.x === this.food.x && next.y === this.food.y) {
      this.score += 1;
      this.tickMs = Math.max(70, 140 - this.score * 4);
      this.onScoreChange?.(this.score, this.best);
      this.spawnFood();
    } else {
      this.snake.pop();
    }
  }

  private draw(): void {
    const { ctx, cellPx } = this;
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellPx + 0.5, 0);
      ctx.lineTo(x * cellPx + 0.5, this.canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellPx + 0.5);
      ctx.lineTo(this.canvas.width, y * cellPx + 0.5);
      ctx.stroke();
    }

    this.snake.forEach((segment, i) => {
      ctx.fillStyle = i === 0 ? PALETTE.head : i % 2 === 0 ? PALETTE.bodyLight : PALETTE.body;
      ctx.fillRect(segment.x * cellPx + 1, segment.y * cellPx + 1, cellPx - 2, cellPx - 2);
    });

    const pulse = 0.7 + Math.sin(performance.now() / 180) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.food;
    ctx.fillRect(this.food.x * cellPx + 2, this.food.y * cellPx + 2, cellPx - 4, cellPx - 4);
    ctx.globalAlpha = 1;

    if (this.state === "ready") {
      this.drawCenteredText("PRESS A DIRECTION", this.canvas.height / 2);
    } else if (this.state === "gameover") {
      this.drawCenteredText("GAME OVER", this.canvas.height / 2 - 10);
      this.drawCenteredText("PRESS SPACE TO RETRY", this.canvas.height / 2 + 10, 9);
    }
  }

  private drawCenteredText(text: string, y: number, size = 12): void {
    const { ctx } = this;
    ctx.save();
    ctx.font = `${size}px "Press Start 2P", monospace`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(15, 56, 15, 0.75)";
    ctx.fillRect(0, y - size, this.canvas.width, size * 2);
    ctx.fillStyle = PALETTE.head;
    ctx.fillText(text, this.canvas.width / 2, y + size / 3);
    ctx.restore();
  }
}
