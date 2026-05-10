import { CONFIG } from './config';
import { GameEngine } from './engine';

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function hexToRgb(hex: string) {
  const n = hex.replace('#', '');
  const v = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function interpolateColor(from: string, to: string, progress: number) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const t = clamp(progress, 0, 1);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function getPlayerRenderColor(engine: GameEngine) {
  if (engine.player.state !== 'charging') return CONFIG.player.color;
  const progress = clamp(engine.player.chargeTime / CONFIG.player.maxVisualChargeTime, 0, 1);
  return interpolateColor(CONFIG.player.color, CONFIG.player.chargeColor, progress);
}

export function renderGame(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const w = CONFIG.canvas.width;
  const h = CONFIG.canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Platforms
  ctx.fillStyle = CONFIG.platform.color;
  for (const p of engine.getPlatforms()) {
    ctx.fillRect(p.left, p.top, p.width, p.height);
  }

  // Player
  ctx.save();
  ctx.translate(engine.player.x, engine.player.y);
  ctx.scale(engine.player.scaleX, engine.player.scaleY);
  ctx.fillStyle = getPlayerRenderColor(engine);
  ctx.fillRect(
    -CONFIG.player.width / 2,
    -CONFIG.player.height / 2,
    CONFIG.player.width,
    CONFIG.player.height,
  );
  ctx.restore();
}
