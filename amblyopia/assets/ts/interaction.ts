import type { VisionMode } from './params.js';
import { clamp, DEPTH_MIN, depthChannelT, lerp } from './params.js';

export type SuccessCertainty = 'clear' | 'uncertain';
export type ProximityState = 'far' | 'hint' | 'drop';

export interface InteractionParams {
  depthStrength: number;
  dropZoneScale: number;
  snapRadiusScale: number;
  rimGlowOpacity: number;
  trajectoryOpacity: number;
  shadowOpacity: number;
  hintZoneScale: number;
  snapJitterWorld: number;
  successOffsetWorld: number;
  successCertainty: SuccessCertainty;
  /** 异常长期：拖动时珠子相对指针的世界坐标偏差。 */
  spatialDragBiasX: number;
  spatialDragBiasZ: number;
  /** 弱视长期：柱顶光圈显示延迟（ms）。 */
  glowDelayMs: number;
  /** 靠近柱顶时的水平磁吸（0=无）。 */
  magneticPull: number;
  depthDriftWorld: number;
}

export interface TargetDropZoneScreen {
  cx: number;
  cy: number;
  radiusX: number;
  radiusY: number;
}

/** @deprecated 保留别名，便于渐进迁移。 */
export type CupDropZoneScreen = TargetDropZoneScreen;

export const HINT_ZONE_SCALE = 1.35;

export function getInteractionParams(
  mode: VisionMode,
  timeProgress: number
): InteractionParams {
  if (mode === 'normal') {
    return {
      depthStrength: 1,
      dropZoneScale: 1,
      snapRadiusScale: 1,
      rimGlowOpacity: 1,
      trajectoryOpacity: 1,
      shadowOpacity: 1,
      hintZoneScale: HINT_ZONE_SCALE,
      snapJitterWorld: 0,
      successOffsetWorld: 0,
      successCertainty: 'clear',
      spatialDragBiasX: 0,
      spatialDragBiasZ: 0,
      glowDelayMs: 0,
      magneticPull: 0.72,
      depthDriftWorld: 0,
    };
  }

  const t = clamp(timeProgress);
  const depthStrength = lerp(1, DEPTH_MIN, t);
  const depthT = depthChannelT(depthStrength);
  const biasT = clamp((t - 0.35) / 0.65);

  return {
    depthStrength,
    dropZoneScale: lerp(1, 0.16, t),
    snapRadiusScale: lerp(1, 0.14, t),
    rimGlowOpacity: lerp(1, 0.025, t),
    trajectoryOpacity: lerp(1, 0.018, t),
    shadowOpacity: lerp(1, 0.04, t),
    hintZoneScale: lerp(1.02, HINT_ZONE_SCALE * 0.72, depthT),
    snapJitterWorld: lerp(0, 0.052, t),
    successOffsetWorld: lerp(0, 0.045, t),
    successCertainty: t > 0.45 ? 'uncertain' : 'clear',
    spatialDragBiasX:
      mode === 'misalignment'
        ? lerp(0, -0.055, biasT)
        : lerp(0, -0.028, biasT),
    spatialDragBiasZ: lerp(0, 0.04, biasT) * (mode === 'occlusion' ? 1 : 0.72),
    glowDelayMs: lerp(0, 450, t),
    magneticPull: lerp(0.44, 0.012, t),
    depthDriftWorld: lerp(0, mode === 'misalignment' ? 0.082 : 0.064, t),
  };
}

export function ellipseContains(
  bx: number,
  by: number,
  zone: TargetDropZoneScreen,
  scale = 1
): boolean {
  const dx = (bx - zone.cx) / (zone.radiusX * scale);
  const dy = (by - zone.cy) / (zone.radiusY * scale);
  return dx * dx + dy * dy <= 1;
}

export function getProximityState(
  bx: number,
  by: number,
  zone: TargetDropZoneScreen,
  snapRadiusScale: number,
  hintZoneScale = HINT_ZONE_SCALE
): ProximityState {
  if (ellipseContains(bx, by, zone, snapRadiusScale)) return 'drop';
  if (ellipseContains(bx, by, zone, hintZoneScale)) return 'hint';
  return 'far';
}
