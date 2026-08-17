import type { Vec2 } from "../types/puppet";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, alpha: number) =>
  from + (to - from) * alpha;

export const damp = (current: number, target: number, smoothing = 0.14) =>
  current + (target - current) * smoothing;

export const dist = (a: Vec2, b: Vec2) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const vec = (x = 0, y = 0): Vec2 => ({ x, y });
