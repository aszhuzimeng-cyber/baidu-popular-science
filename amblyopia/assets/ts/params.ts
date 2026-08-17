export type VisionMode = 'normal' | 'blur' | 'misalignment' | 'occlusion';

export interface VisualParams {
  leftUsage: number;
  rightUsage: number;
  leftPathOpacity: number;
  rightPathOpacity: number;
  /** 右眼异常输入在中央整合画面里的可见程度（仅控制 overlay opacity）。 */
  abnormalContribution: number;
  /** 双眼空间感、前后层次、杯口深度提示的强度。 */
  depthStrength: number;
  /** 由 depthStrength 派生：杯口吸附范围。 */
  snapStrength: number;
  /** 由 depthStrength 派生：杯口发光环强度。 */
  cupGlowStrength: number;
  /** 右眼大脑画面随持续时间弱化的强度（0=不弱化，1=最弱；仅右眼卡片）。 */
  rightEyeAttenuation: number;
  /** 错位：重影偏移缩放（1→0，仅 misalignment）。 */
  misalignOffsetScale: number;
  /** 错位：重影可见度（1→0，仅 misalignment）。 */
  misalignGhostStrength: number;
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

/** 双眼空间感随 time 的下限（与 interaction 共用）。 */
export const DEPTH_MIN = 0.28;

/** 将 depthStrength 映射到 0–1（1=正常空间线索，0=长期异常最弱）。 */
export function depthChannelT(depthStrength: number): number {
  return clamp((depthStrength - DEPTH_MIN) / (1 - DEPTH_MIN));
}
const ABNORMAL_START = 0.58;
const ABNORMAL_END = 0.02;

/** 从 depthStrength 派生深度通道子参数（与 abnormalContribution 无关）。 */
function deriveFromDepth(depthStrength: number, valueAtMin: number): number {
  const t = clamp((depthStrength - DEPTH_MIN) / (1 - DEPTH_MIN));
  return lerp(valueAtMin, 1, t);
}

/** 左眼参考画面用的固定参数（不受 mode / time 影响）。 */
export const REFERENCE_VISUAL_PARAMS: VisualParams = {
  leftUsage: 0.5,
  rightUsage: 0.5,
  leftPathOpacity: 1,
  rightPathOpacity: 1,
  abnormalContribution: 0,
  depthStrength: 1,
  snapStrength: 1,
  cupGlowStrength: 1,
  rightEyeAttenuation: 0,
  misalignOffsetScale: 0,
  misalignGhostStrength: 0,
};

function usageTimeBand(t: number): 0 | 1 | 2 {
  if (t < 0.33) return 0;
  if (t < 0.67) return 1;
  return 2;
}

/** 异常模式下双眼来源占比（仅驱动底部色条，不展示具体数值）。 */
function getAbnormalBinocularUsage(t: number): { leftUsage: number; rightUsage: number } {
  const band = usageTimeBand(t);
  if (band === 0) {
    return { leftUsage: 0.5, rightUsage: 0.5 };
  }
  if (band === 1) {
    return { leftUsage: 0.62, rightUsage: 0.38 };
  }
  return { leftUsage: 0.92, rightUsage: 0.08 };
}

/** 异常形态固定；time 连续改变叠层可见度、空间感、使用比例与右眼弱化。 */
export function getVisualParams(mode: VisionMode, timeProgress: number): VisualParams {
  const t = clamp(timeProgress);

  if (mode === 'normal') {
    return { ...REFERENCE_VISUAL_PARAMS };
  }

  const depthStrength = lerp(1, DEPTH_MIN, t);
  const { leftUsage, rightUsage } = getAbnormalBinocularUsage(t);
  const isMisalign = mode === 'misalignment';

  return {
    leftUsage,
    rightUsage,
    leftPathOpacity: lerp(0.82, 1, t),
    rightPathOpacity: lerp(1, 0.12, t),
    abnormalContribution: lerp(ABNORMAL_START, ABNORMAL_END, t),
    depthStrength,
    snapStrength: deriveFromDepth(depthStrength, 0.34),
    cupGlowStrength: deriveFromDepth(depthStrength, 0.12),
    rightEyeAttenuation: t,
    misalignOffsetScale: isMisalign ? lerp(1, 0.08, t) : 0,
    misalignGhostStrength: isMisalign ? lerp(1, 0.08, t) : 0,
  };
}
