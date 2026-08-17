import type { PuppetPartId } from "../types/puppet";

export type ScatteredPartSlot = { x: number; y: number };

export const SCATTERED_TRAY_LAYOUT_VERSION = "user-reference-current-v7";
export const SCATTERED_TRAY_RIGHT_SHIFT_PX = 34;

export const SCATTERED_TRAY_FIXED_SLOTS: Record<PuppetPartId, ScatteredPartSlot> = {
  head: { x: 0.411, y: 0.626 },
  torso: { x: 0.41, y: 0.476 },
  rightUpperArm: { x: 0.227, y: 0.202 },
  leftUpperArm: { x: 0.119, y: 0.41 },
  pelvis: { x: 0.067, y: 0.295 },
  rightForearm: { x: 0.106, y: 0.45 },
  leftForearm: { x: 0.226, y: 0.655 },
  leftLeg: { x: 0.132, y: 0.602 },
  rightLeg: { x: 0.309, y: 0.361 },
};

export const SCATTERED_TRAY_LAYOUT_BY_CHARACTER: Record<string, Record<PuppetPartId, ScatteredPartSlot>> = {
  "role-1": SCATTERED_TRAY_FIXED_SLOTS,
  "role-2": SCATTERED_TRAY_FIXED_SLOTS,
  "role-3": SCATTERED_TRAY_FIXED_SLOTS,
  "role-4": SCATTERED_TRAY_FIXED_SLOTS,
};

export const SCATTERED_TRAY_SHIFT_DOWN_RATIO = 0;
export const SCATTERED_TRAY_GROUP_SHIFT_DOWN_PX = 50;

export const SCATTERED_TRAY_TILT_DEG: Partial<Record<PuppetPartId, number>> = {
  head: 0,
  leftUpperArm: -35,
  leftForearm: -35,
  pelvis: 0,
  rightUpperArm: 45,
  rightForearm: 45,
  torso: 0,
  leftLeg: 0,
  rightLeg: 0,
};

export const SCATTERED_TRAY_Z_INDEX: Record<PuppetPartId, number> = {
  head: 70,
  leftUpperArm: 28,
  leftForearm: 58,
  pelvis: 48,
  rightUpperArm: 42,
  rightForearm: 62,
  torso: 50,
  leftLeg: 26,
  rightLeg: 24,
};

export const SCATTERED_TRAY_SAFE_INSET = {
  left: -180,
  right: -210,
  top: -140,
  bottom: -90,
};
