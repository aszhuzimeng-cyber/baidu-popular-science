import { clamp, depthChannelT, lerp, type VisionMode } from './params.js';

/** 中央整合画面的空间深度线索（与异常叠层 blur 分离）。 */
export interface SpatialSceneParams {
  /** 1 = 强透视立体，0 = 压平 */
  perspectiveT: number;
  /** 接触阴影强度倍率 */
  shadowStrength: number;
  /** 珠子阴影相对物体的水平偏移（世界单位） */
  shadowMisalign: number;
  /** 阴影扩散倍率（>1 更软、更糊） */
  shadowSpread: number;
  /** 小柱顶圆面可见度 */
  pegTopContrast: number;
  /** 珠孔内缘对比度 */
  beadHoleContrast: number;
  /** 遮挡分层清晰度 */
  occlusionClarity: number;
  /** 入口光圈稳定度 */
  glowStability: number;
  /** 光圈世界坐标漂移幅度 */
  glowWorldOffset: number;
  /** 桌面透视 / 底座阴影 */
  deskDepthT: number;
  /** 雾效远近（压低 = 更平面） */
  fogDepthT: number;
  /** 中央 blur 叠层强度（仅 blur 模式，且刻意减弱） */
  centralBlurScale: number;
  /** 拖动时靠近柱顶的磁吸强度 */
  magneticPull: number;
  /** Very subtle residual ghost; long-term amblyopia should feel suppressed, not doubled. */
  fusionGhostStrength: number;
  /** Screen-pixel offset for the residual weak-eye ghost. */
  fusionGhostOffsetPx: number;
  /** Local ambiguity drawn around the peg entry and ring edge while aiming. */
  targetAmbiguity: number;
}

const NORMAL_SPATIAL: SpatialSceneParams = {
  perspectiveT: 1,
  shadowStrength: 1.24,
  shadowMisalign: 0,
  shadowSpread: 1,
  pegTopContrast: 1,
  beadHoleContrast: 1,
  occlusionClarity: 1,
  glowStability: 1,
  glowWorldOffset: 0,
  deskDepthT: 1,
  fogDepthT: 1,
  centralBlurScale: 0,
  magneticPull: 0.14,
  fusionGhostStrength: 0,
  fusionGhostOffsetPx: 0,
  targetAmbiguity: 0,
};

export function getSpatialSceneParams(
  mode: VisionMode,
  timeProgress: number,
  depthStrength: number
): SpatialSceneParams {
  if (mode === 'normal') {
    return { ...NORMAL_SPATIAL };
  }

  const t = clamp(timeProgress);
  const depthT = depthChannelT(depthStrength);
  const loss = 1 - depthT;

  return {
    perspectiveT: depthT,
    shadowStrength: lerp(1.08, 0.075, loss),
    shadowMisalign: lerp(0, 0.012, loss),
    shadowSpread: lerp(1, 4.4, loss),
    pegTopContrast: lerp(0.035, 1, depthT),
    beadHoleContrast: lerp(0.05, 1, depthT),
    occlusionClarity: lerp(0.018, 1, depthT),
    glowStability: lerp(0.08, 1, depthT),
    glowWorldOffset: 0,
    deskDepthT: depthT,
    fogDepthT: lerp(0.42, 1, depthT),
    centralBlurScale: mode === 'blur' ? lerp(1.28, 0.62, depthT) : 0,
    magneticPull: lerp(0.02, 0.14, depthT),
    fusionGhostStrength: lerp(0.055, 0, depthT),
    fusionGhostOffsetPx: lerp(5, 0, depthT),
    targetAmbiguity: lerp(1.35, 0, depthT),
  };
}
