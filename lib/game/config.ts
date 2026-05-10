export type MotionType = 'none' | 'vertical' | 'horizontal';
export type TargetLayout = 'single' | 'dual';

export interface Phase {
  start: number;
  end: number;
  name: string;
  description: string;
  platformWidth: { min: number; max: number };
  targetLayout: TargetLayout;
  motionType: MotionType;
  dualXOffset?: number;
}

export const CONFIG = {
  canvas: { width: 600, height: 720 },
  platform: {
    height: 16,
    currentWidth: 80,
    edgeMargin: 40,
    color: '#d0d0d0',
    moving: {
      vertical: { amplitude: 62, speed: 2.15 },
      horizontal: { amplitude: 56, speed: 1.65 },
    },
  },
  player: {
    width: 25,
    height: 50,
    color: '#000000',
    chargeColor: '#FFC20A',
    maxVisualChargeTime: 1.2,
    edgeMargin: 20,
  },
  physics: {
    gravity: 1400,
    maxJumpSpeed: 950,
    jumpAngle: -Math.PI / 3,
    chargeCoefficient: 0.011,
    chargeGamma: 0.65,
  },
  world: {
    platformYOffset: 140,
    scrollSpeed: 450,
  },
  animation: {
    chargeScale: 0.14,
    minScaleY: 0.68,
    scaleBeta: 0.6,
    springOmega: 11,
    springZeta: 0.32,
  },
  trials: {
    total: 18,
    phases: [
      { start: 1, end: 3, name: 'Static Wide', description: 'Single landing platform with a generous width.', platformWidth: { min: 132, max: 150 }, targetLayout: 'single', motionType: 'none' },
      { start: 4, end: 6, name: 'Static Narrow', description: 'Single landing platform with a tighter width.', platformWidth: { min: 102, max: 120 }, targetLayout: 'single', motionType: 'none' },
      { start: 7, end: 9, name: 'Vertical Moving', description: 'Single target platform oscillating vertically.', platformWidth: { min: 94, max: 112 }, targetLayout: 'single', motionType: 'vertical' },
      { start: 10, end: 12, name: 'Horizontal Moving', description: 'Single target platform sliding horizontally.', platformWidth: { min: 92, max: 110 }, targetLayout: 'single', motionType: 'horizontal' },
      { start: 13, end: 15, name: 'Dual Side-by-Side', description: 'Two target platforms placed side-by-side.', platformWidth: { min: 84, max: 100 }, targetLayout: 'dual', motionType: 'none', dualXOffset: 150 },
      { start: 16, end: 18, name: 'Dual Moving Vertical', description: 'Two side-by-side targets oscillating vertically.', platformWidth: { min: 78, max: 94 }, targetLayout: 'dual', motionType: 'vertical', dualXOffset: 120 },
    ] as Phase[],
  },
} as const;

export const PLATFORM_Y = CONFIG.canvas.height - CONFIG.world.platformYOffset;
export const PLATFORM_ANCHOR_X = CONFIG.platform.edgeMargin + CONFIG.platform.currentWidth / 2;
export const PLATFORM_RIGHT_CENTER_X = CONFIG.canvas.width - CONFIG.platform.edgeMargin - CONFIG.platform.currentWidth / 2;
export const PLAYER_INITIAL_Y = PLATFORM_Y - CONFIG.platform.height - CONFIG.player.height / 2;
export const TOTAL_TRIALS = CONFIG.trials.total;
