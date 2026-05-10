'use client';

import { useEffect, useRef } from 'react';
import { CONFIG } from '@/lib/game/config';
import { GameEngine } from '@/lib/game/engine';
import { renderGame } from '@/lib/game/render';

interface GameCanvasProps {
  engine: GameEngine;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  paused?: boolean;
}

export function GameCanvas({ engine, onPointerDown, onPointerUp, paused = false }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) {
        engine.tick(dt);
      }
      renderGame(ctx, engine);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [engine]);

  return (
    <canvas
      ref={canvasRef}
      width={CONFIG.canvas.width}
      height={CONFIG.canvas.height}
      className="game-canvas"
      aria-label="Jump game canvas"
      onPointerDown={(e) => {
        e.preventDefault();
        onPointerDown?.();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onPointerUp?.();
      }}
      onPointerCancel={() => onPointerUp?.()}
      onTouchStart={(e) => e.preventDefault()}
    />
  );
}
