export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const mapRange = (val: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  outMin + (outMax - outMin) * ((val - inMin) / (inMax - inMin));

export const lerp = (cur: number, tar: number, speed: number) => cur + (tar - cur) * speed;
