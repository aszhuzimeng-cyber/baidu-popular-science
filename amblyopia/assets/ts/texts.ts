import type { VisionMode } from './params.js';
import type { ProximityState } from './interaction.js';

const RIGHT_TAGS: Record<VisionMode, string> = {
  normal: '两眼都清晰',
  blur: '高度屈光不正',
  misalignment: '斜视',
  occlusion: '先天性白内障 / 上睑下垂',
};

const STAGE_TEXT: Record<VisionMode, [string, string, string]> = {
  normal: [
    '刚开始，两边画面都清晰，大脑可以一起使用两路信息。',
    '持续一段时间后，两边画面仍然一起参与，空间判断保持稳定。',
    '清晰稳定的输入长期持续时，两边画面可以持续一起参与。',
  ],
  blur: [
    '刚开始，大脑仍在尝试使用两边画面，即使其中一路有些发糊。',
    '持续一段时间后，大脑开始更多依赖清晰、稳定的一边。',
    '长期未干预时，大脑可能少用异常侧信息，立体感下降，进而可能形成弱视。',
  ],
  misalignment: [
    '刚开始，两路画面对不上，大脑仍在尝试合成稳定画面。',
    '持续一段时间后，大脑开始更多依赖对得上的那一路画面。',
    '长期未干预时，大脑可能少用异常侧信息，立体感下降，进而可能形成弱视。',
  ],
  occlusion: [
    '刚开始，大脑仍在尝试使用两边画面，即使其中一路不完整。',
    '持续一段时间后，大脑开始更多依赖完整、稳定的一边。',
    '长期未干预时，大脑可能少用异常侧信息，立体感下降，进而可能形成弱视。',
  ],
};

export interface StageChildDevNote {
  lead: string;
  emphasis: string;
}

const STAGE_CHILD_DEV_NOTE: Partial<Record<VisionMode, StageChildDevNote>> = {
  blur: {
    lead: '视觉发育期，长期异常画面会让大脑减少对该眼的使用，',
    emphasis: '可能形成弱视',
  },
  misalignment: {
    lead: '视觉发育期，长期异常画面会让大脑减少对该眼的使用，',
    emphasis: '可能形成弱视',
  },
  occlusion: {
    lead: '视觉发育期，长期异常画面会让大脑减少对该眼的使用，',
    emphasis: '可能形成弱视',
  },
};

function band(t: number): 0 | 1 | 2 {
  if (t < 0.33) return 0;
  if (t < 0.67) return 1;
  return 2;
}

/** 各时间段均可进行圆环套柱操作。 */
export function isBeadInteractionPhase(_t: number): boolean {
  return true;
}

/** @deprecated */
export const isBallInteractionPhase = isBeadInteractionPhase;

export function getBeadSceneHint(t: number): string {
  return isBeadInteractionPhase(t) ? '拖动圆环体验套圈' : '';
}

/** @deprecated */
export const getBallSceneHint = getBeadSceneHint;

export function getStageText(mode: VisionMode, timeProgress: number): string {
  return STAGE_TEXT[mode][band(timeProgress)];
}

export function getStageChildDevNote(mode: VisionMode, timeProgress: number): StageChildDevNote | null {
  if (band(timeProgress) !== 2) return null;
  return STAGE_CHILD_DEV_NOTE[mode] ?? null;
}

export function getRightEyeTag(mode: VisionMode): string {
  return RIGHT_TAGS[mode];
}

export function getDragProximityHint(
  proximity: ProximityState,
  mode: VisionMode,
  t: number
): string {
  if (proximity === 'drop') {
    return t < 0.67 ? '确定位置后松手' : '继续靠近，确定位置后松手';
  }
  if (mode !== 'normal') {
    return '继续靠近，确定位置后松手';
  }
  if (proximity === 'hint') {
    return '继续靠近，确定位置后松手';
  }
  return '拖动圆环，从上方对准小柱顶部后松手套入。';
}

export interface SuccessFeedback {
  title: string;
  subtitle: string;
}

export function getSuccessFeedback(mode: VisionMode, t: number): SuccessFeedback {
  if (mode === 'normal' || t < 0.67) {
    return {
      title: '已对准',
      subtitle: '两边画面一起参与，圆环与小柱的前后关系比较清楚。',
    };
  }
  return {
    title: '已对准',
    subtitle: '空间位置变得不太好判断。',
  };
}

export function getMissFeedback(): string {
  return '差一点，请从上方对准柱顶。';
}

export function shouldShowCoordinationWeakPopup(mode: VisionMode, t: number): boolean {
  return mode !== 'normal' && t >= 0.67;
}

export function getCoordinationWeakFeedback(): SuccessFeedback {
  return {
    title: '双眼配合变弱',
    subtitle: '精细对准可能变难。',
  };
}

export type NarrationCue = 'intro' | 'normal' | 'blur' | 'misalignment' | 'occlusion';

const LONG_TERM_AMBLYOPIA_WARNING =
  '长期未干预时，大脑可能少用异常侧信息，立体感下降，进而可能形成弱视。';

export const NARRATION_SCRIPTS: Record<NarrationCue, string> = {
  intro:
    '这是一个弱视常见形成机制的演示。你可以选择左眼或右眼作为异常侧，观察大脑如何逐渐减少使用不清晰、不稳定或不完整的一路视觉信息。中间是双眼整合后的画面，左下和右下分别显示左眼和右眼提供的画面。',
  normal: '两只眼画面都清楚稳定，大脑可以一起使用两边信息。',
  blur: `模拟异常侧画面长期发糊，常见于两眼度数差异较大，或高度屈光不正。${LONG_TERM_AMBLYOPIA_WARNING}`,
  misalignment: `模拟两只眼看到的方向不一致，比如斜视时，左右眼画面对不上。${LONG_TERM_AMBLYOPIA_WARNING}`,
  occlusion: `模拟异常侧画面不完整，比如先天性白内障或明显上睑下垂影响视线。${LONG_TERM_AMBLYOPIA_WARNING}`,
};
