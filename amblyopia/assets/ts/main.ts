import { getInteractionParams } from './interaction.js';
import { getVisualParams, type VisionMode, type VisualParams } from './params.js';
import {
  getCoordinationWeakFeedback,
  getBeadSceneHint,
  getDragProximityHint,
  getRightEyeTag,
  getStageText,
  getSuccessFeedback,
  isBeadInteractionPhase,
  shouldShowCoordinationWeakPopup,
} from './texts.js';
import {
  applyCentralSceneAppearance,
  canThreadBeadAtScreen,
  applyInteractionAppearance,
  applySpatialDepthAppearance,
  clampBeadToDesk,
  computeDeskPlayBounds,
  drawCentralOverlay,
  drawInteractionOverlay,
  getBeadDefaultPosition,
  getBeadDropCueForScene,
  getBeadSnapPosition,
  getPegDropZoneScreen,
  getPegTipScreen,
  initThreeScene,
  isPointerOnBead,
  placeBeadFromDragPointer,
  resetDragPointerState,
  type DragPointerState,
  projectToScreen,
  renderBaseScene,
  renderClearEyePreview,
  renderLeftEyePreview,
  renderRightEyePreview,
  resizeRenderer,
  type SceneContext,
} from './three-scene.js';
import { getSpatialSceneParams } from './spatial-depth.js';
import {
  BEAD_CENTER_Y,
  BEAD_MAJOR_R,
  type BeadThreadVisualPhase,
  getBeadHoverY,
  getMinClearanceRadius,
  getPegAxisXZ,
  snapBeadOntoPegAxis,
} from './bead-peg.js';
import { Vector3 } from '../libs/three.module.js';
import { clamp, lerp } from './params.js';
import { createAutoDemo } from './auto-demo.js';
import {
  isNarrationEnabled,
  narrationCueForMode,
  setNarrationEnabled,
  speakNarration,
  speakNarrationText,
  primeNarrationOnGesture,
} from './narration.js';

interface AppState {
  mode: VisionMode;
  affectedEye: EyeSide;
  timeProgress: number;
  beadDragging: boolean;
  beadThreaded: boolean;
  beadThreadPhase: BeadThreadVisualPhase;
  interventionExpanded: boolean;
}

type EyeSide = 'left' | 'right';

const state: AppState = {
  mode: 'normal',
  affectedEye: 'right',
  timeProgress: 0,
  beadDragging: false,
  beadThreaded: false,
  beadThreadPhase: 'none',
  interventionExpanded: false,
};

let sceneCtx: SceneContext;
let successTimer: ReturnType<typeof setTimeout> | null = null;
let threadedTimer: ReturnType<typeof setTimeout> | null = null;
let missHintTimer: ReturnType<typeof setTimeout> | null = null;
let animFrame: number | null = null;
let rimPulse = 0;
let showMissHint = false;
let showBlockedDragHint = false;
let blockedDragHintTimer: ReturnType<typeof setTimeout> | null = null;
let beadHomeDirty = true;
let lastBeadHomeSyncW = 0;
let lastBeadHomeSyncH = 0;

const dragPointer: DragPointerState = {
  lastScreenX: 0,
  lastScreenY: 0,
  grabOffsetX: 0,
  grabOffsetZ: 0,
  ready: false,
};
const dragStartScreen = { x: 0, y: 0 };
const dragStartBeadPos = new Vector3();
const missBounceFrom = new Vector3();

const mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const overlayCanvas = document.getElementById('overlay-canvas') as HTMLCanvasElement;
const leftThumb = document.getElementById('left-thumb') as HTMLCanvasElement;
const rightThumb = document.getElementById('right-thumb') as HTMLCanvasElement;
const timeSlider = document.getElementById('time-slider') as HTMLInputElement;
const timeCard = document.querySelector('.time-card')!;
const stageCaption = document.getElementById('stage-caption')!;
const modeExplanation = document.getElementById('mode-explanation')!;
const stageChildNote = document.getElementById('stage-child-note')!;
const stageChildNoteLead = document.getElementById('stage-child-note-lead')!;
const stageChildNoteEmphasis = document.getElementById('stage-child-note-emphasis')!;
const interventionToggle = document.getElementById('intervention-toggle') as HTMLButtonElement;
const interventionModal = document.getElementById('intervention-modal')!;
const interventionClose = document.getElementById('intervention-close')!;
const interventionInputCopy = document.getElementById('intervention-input-copy')!;
const beadSceneHint = document.getElementById('ball-scene-hint')!;
const beadSceneHintPill = document.getElementById('ball-scene-hint-pill')!;
const successToast = document.getElementById('success-toast')!;
const successIcon = successToast.querySelector('.success-icon') as HTMLSpanElement;
const successTitle = document.getElementById('success-title')!;
const successSubtitle = document.getElementById('success-subtitle')!;
const usageBar = document.getElementById('usage-bar')!;
const usageModule = document.getElementById('usage-module')!;
const helpBtn = document.getElementById('help-btn')!;
const voiceBtn = document.getElementById('voice-btn')!;
const helpOverlay = document.getElementById('help-overlay')!;
const helpClose = document.getElementById('help-close')!;
const labBrandBtn = document.getElementById('lab-brand-btn')!;
const introModal = document.getElementById('intro-modal')!;
const introClose = document.getElementById('intro-close')!;
const modePanel = document.getElementById('mode-panel')!;
const modePanelTitle = document.getElementById('mode-panel-title')!;
const modeButtons = document.querySelectorAll<HTMLButtonElement>('.mode-btn');
const affectedEyeButtons = document.querySelectorAll<HTMLButtonElement>('.affected-eye-btn');
const leftEyeTag = document.getElementById('left-eye-tag')!;
const rightEyeTag = document.getElementById('right-eye-tag')!;
const timeMarks = document.querySelectorAll<HTMLSpanElement>('.time-marks span');
const TIME_SLIDER_STEPS = 10000;
const INTERVENTION_NARRATION =
  '弱视确诊后，应尽早规范干预。先通过配镜或处理相关病因改善视觉输入，再在医生指导下进行限时遮盖或适龄视觉活动，帮助弱视眼更多参与。治疗期间还需定期复查，并根据恢复情况调整方案。';
let beadSceneHintShown = false;
let beadMissCount = 0;
let coordinationPopupShown = false;
let autoDemoActive = false;
let introNarrationPlayed = false;

function syncVoiceButton(): void {
  const on = isNarrationEnabled();
  const label = on && !introNarrationPlayed ? '播放语音讲解' : on ? '关闭语音讲解' : '开启语音讲解';
  voiceBtn.classList.toggle('is-muted', !on);
  voiceBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  voiceBtn.setAttribute('aria-label', label);
  voiceBtn.title = label;
}

interface SetVisionModeOptions {
  narrate?: boolean;
}

async function speakModeNarration(mode: VisionMode): Promise<void> {
  if (!isNarrationEnabled()) return;
  await speakNarration(narrationCueForMode(mode));
}

async function playIntroNarration(maxWaitMs?: number): Promise<void> {
  if (introNarrationPlayed) return;
  if (!isNarrationEnabled()) return;
  const played = await speakNarration(
    'intro',
    maxWaitMs === undefined ? {} : { maxWaitMs }
  );
  if (played) {
    introNarrationPlayed = true;
    syncVoiceButton();
  }
}

const autoDemo = createAutoDemo({
  setMode: (mode) => setVisionMode(mode, { narrate: true }),
  setTime: (t) => setTimeProgress(t),
  getModeButton: (mode) =>
    document.querySelector<HTMLElement>(`.mode-btn[data-mode="${mode}"]`),
  getTimeSlider: () => timeSlider,
  onActiveChange: (active) => {
    autoDemoActive = active;
  },
  onDemoStart: async () => {
    await playIntroNarration(1800);
  },
});

function initApp(): void {
  sceneCtx = initThreeScene(mainCanvas, () => updateAll());
  syncVoiceButton();
  bindUIEvents();
  window.addEventListener('pointerdown', () => primeNarrationOnGesture(), {
    capture: true,
    passive: true,
  });
  syncViewportAspect();
  const { w, h } = getMainSize();
  resizeRenderer(sceneCtx, w, h);
  updateAll();

  window.addEventListener(
    'pointerdown',
    (e) => {
      if (!autoDemo.isActive()) return;
      if (e.target instanceof Element && e.target.closest('.help-toolbar')) return;
      autoDemo.stop();
    },
    { capture: true }
  );

  requestAnimationFrame(() => {
    requestAnimationFrame(() => autoDemo.start());
  });
}

function syncViewportAspect(): void {
  document.documentElement.style.setProperty(
    '--viewport-aspect',
    `${window.innerWidth} / ${window.innerHeight}`
  );
}

function syncThumbCanvas(thumb: HTMLCanvasElement): void {
  const displayW = thumb.clientWidth;
  let displayH = thumb.clientHeight;
  if (displayH < 2 && displayW > 2) {
    displayH = Math.round((displayW * window.innerHeight) / window.innerWidth);
  }
  if (displayW < 2 || displayH < 2) return;

  const dpr = Math.min(window.devicePixelRatio, 2);
  const bufW = Math.round(displayW * dpr);
  const bufH = Math.round(displayH * dpr);
  if (thumb.width !== bufW || thumb.height !== bufH) {
    thumb.width = bufW;
    thumb.height = bufH;
  }
}

function openIntroModal(): void {
  helpOverlay.hidden = true;
  introModal.hidden = false;
  (introClose as HTMLElement).focus();
}

function closeIntroModal(): void {
  introModal.hidden = true;
  (labBrandBtn as HTMLElement).focus();
}

function bindUIEvents(): void {
  timeSlider.addEventListener('input', () => {
    setTimeProgress(Number(timeSlider.value) / TIME_SLIDER_STEPS);
  });

  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      primeNarrationOnGesture();
      const mode = btn.dataset.mode as VisionMode;
      if (mode) void setVisionMode(mode);
    });
  });

  affectedEyeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      primeNarrationOnGesture();
      const eye = btn.dataset.affectedEye as EyeSide;
      if (!eye || eye === state.affectedEye) return;
      state.affectedEye = eye;
      updateAll();
      void speakNarrationText(`已切换为${eyeName(eye)}异常。`);
    });
  });

  helpBtn.addEventListener('click', () => {
    helpOverlay.hidden = false;
  });
  voiceBtn.addEventListener('click', () => {
    primeNarrationOnGesture();
    const wasEnabled = isNarrationEnabled();
    if (!wasEnabled) {
      setNarrationEnabled(true);
      syncVoiceButton();
      void playIntroNarration();
      return;
    }
    if (!introNarrationPlayed) {
      void playIntroNarration();
      return;
    }
    setNarrationEnabled(false);
    syncVoiceButton();
  });
  interventionToggle.addEventListener('click', () => {
    if (!shouldShowInterventionPrompt()) return;
    primeNarrationOnGesture();
    const willOpen = !state.interventionExpanded;
    state.interventionExpanded = true;
    updateAll();
    if (willOpen) {
      void speakNarrationText(INTERVENTION_NARRATION);
    }
  });
  interventionClose.addEventListener('click', () => {
    state.interventionExpanded = false;
    updateAll();
  });
  interventionModal.addEventListener('click', (e) => {
    if (e.target !== interventionModal) return;
    state.interventionExpanded = false;
    updateAll();
  });
  helpClose.addEventListener('click', () => {
    helpOverlay.hidden = true;
  });
  helpOverlay.addEventListener('click', (e) => {
    if (e.target === helpOverlay) helpOverlay.hidden = true;
  });

  labBrandBtn.addEventListener('click', () => {
    openIntroModal();
  });
  introClose.addEventListener('click', () => {
    closeIntroModal();
  });
  introModal.addEventListener('click', (e) => {
    if (e.target === introModal) closeIntroModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!interventionModal.hidden) {
      state.interventionExpanded = false;
      updateAll();
      return;
    }
    if (!introModal.hidden) {
      closeIntroModal();
      return;
    }
    if (!helpOverlay.hidden) {
      helpOverlay.hidden = true;
    }
  });

  window.addEventListener('pointerdown', handleBeadDragStart, { capture: true });
  window.addEventListener('pointermove', handleBeadDragMove);
  window.addEventListener('pointerup', handleBeadDragEnd);
  window.addEventListener('pointercancel', handleBeadDragEnd);
  window.addEventListener('resize', onResize);

  beadSceneHint.addEventListener('transitionend', (e) => {
    if (e.target !== beadSceneHint || e.propertyName !== 'opacity') return;
    if (!beadSceneHint.classList.contains('visible')) {
      beadSceneHint.hidden = true;
      beadSceneHintPill.textContent = '';
    }
  });
}

function updateBeadSceneHintDisplay(
  text: string,
  beadScreen: { x: number; y: number },
  dragging: boolean,
  readyToDrop = false,
  isMiss = false
): void {
  const { w, h } = getMainSize();
  const rect = mainCanvas.getBoundingClientRect();
  const x = rect.left + (beadScreen.x / w) * rect.width;
  const offsetPx = dragging ? 92 : 64;
  const y = rect.top + (beadScreen.y / h) * rect.height - (offsetPx / h) * rect.height;

  beadSceneHint.style.left = `${x}px`;
  beadSceneHint.style.top = `${y}px`;
  beadSceneHint.style.bottom = '';
  beadSceneHint.classList.toggle('ball-scene-hint--dragging', dragging);
  beadSceneHint.classList.toggle('ball-scene-hint--drop', readyToDrop);
  beadSceneHint.classList.toggle('ball-scene-hint--miss', isMiss);

  if (text) {
    beadSceneHintPill.textContent = text;
    beadSceneHint.hidden = false;
    if (!beadSceneHintShown) {
      beadSceneHintShown = true;
      beadSceneHint.classList.remove('visible');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => beadSceneHint.classList.add('visible'));
      });
    }
    return;
  }

  if (beadSceneHintShown) {
    beadSceneHintShown = false;
    beadSceneHint.classList.remove('visible');
  }
}

function isInteractiveUiTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('.ui-interactive');
}

function cancelAnimations(): void {
  if (animFrame !== null) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
}

async function setVisionMode(mode: VisionMode, options?: SetVisionModeOptions): Promise<void> {
  const modeChanged = state.mode !== mode;
  state.mode = mode;
  state.timeProgress = 0;
  resetIntervention();
  syncTimeSlider();
  endBeadInteractionSession();
  beadHomeDirty = true;
  modeButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  updateAll();

  const shouldNarrate = options?.narrate ?? modeChanged;
  if (shouldNarrate) {
    await speakModeNarration(mode);
  }
}

function setTimeProgress(value: number): void {
  const wasInteractive = isBeadInteractionPhase(state.timeProgress);
  state.timeProgress = Math.min(1, Math.max(0, value));
  if (!shouldShowInterventionPrompt()) resetIntervention();
  syncTimeSlider();
  if (wasInteractive && !isBeadInteractionPhase(state.timeProgress)) {
    endBeadInteractionSession();
  }
  if (!state.beadDragging && animFrame === null) {
    updateAll();
  } else {
    refreshCentralScene();
  }
}

function endBeadInteractionSession(): void {
  if (state.beadDragging) {
    state.beadDragging = false;
    mainCanvas.classList.remove('dragging');
  }
  cancelAnimations();
  if (threadedTimer) {
    clearTimeout(threadedTimer);
    threadedTimer = null;
  }
  showMissHint = false;
  showBlockedDragHint = false;
  state.beadThreaded = false;
  state.beadThreadPhase = 'none';
  beadMissCount = 0;
  coordinationPopupShown = false;
  sceneCtx.pegGlowNearSince = null;
  resetBeadPosition();
}

function syncTimeSlider(): void {
  const next = String(Math.round(state.timeProgress * TIME_SLIDER_STEPS));
  if (timeSlider.value !== next) {
    timeSlider.value = next;
  }
}

function getMainSize(): { w: number; h: number } {
  return { w: window.innerWidth, h: window.innerHeight };
}

function syncOverlaySize(w: number, h: number, dpr: number): void {
  overlayCanvas.width = Math.round(w * dpr);
  overlayCanvas.height = Math.round(h * dpr);
  overlayCanvas.style.width = `${w}px`;
  overlayCanvas.style.height = `${h}px`;
  const ctx = overlayCanvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function shouldHoldBeadPosition(): boolean {
  return state.beadThreadPhase !== 'none' || state.beadDragging || animFrame !== null;
}

function syncIdleBeadHomeIfNeeded(w: number, h: number): void {
  if (shouldHoldBeadPosition()) return;

  const viewportChanged = w !== lastBeadHomeSyncW || h !== lastBeadHomeSyncH;
  if (!beadHomeDirty && !viewportChanged) return;

  sceneCtx.bead.position.copy(getBeadDefaultPosition(sceneCtx));
  beadHomeDirty = false;
  lastBeadHomeSyncW = w;
  lastBeadHomeSyncH = h;
}

function refreshCentralScene(): void {
  const visual = getFeedbackVisualParams(getVisualParams(state.mode, state.timeProgress));
  const { w, h } = getMainSize();
  const dpr = Math.min(window.devicePixelRatio, 2);
  syncOverlaySize(w, h, dpr);

  const ip = getInteractionParams(state.mode, state.timeProgress);
  const spatial = getSpatialSceneParams(state.mode, state.timeProgress, visual.depthStrength);

  applyCentralSceneAppearance(sceneCtx, visual);
  applySpatialDepthAppearance(sceneCtx, spatial);
  resizeRenderer(sceneCtx, w, h);
  syncIdleBeadHomeIfNeeded(w, h);

  const beadScreen = projectToScreen(sceneCtx, sceneCtx.bead.position, w, h);
  const zone = getPegDropZoneScreen(sceneCtx, w, h, ip.dropZoneScale);
  const pegTipScreen = getPegTipScreen(sceneCtx, w, h);
  const dropCue = getBeadDropCueForScene(sceneCtx, w, h, ip, state.beadDragging);
  const proximity = dropCue.proximity;

  applyInteractionAppearance(
    sceneCtx,
    ip,
    proximity,
    state.beadDragging,
    rimPulse,
    state.beadThreadPhase,
    spatial
  );
  renderBaseScene(sceneCtx, w, h);
  drawCentralOverlay(overlayCanvas, mainCanvas, state.mode, visual, spatial);

  const interactionEnabled = isBeadInteractionPhase(state.timeProgress);
  const threading = state.beadThreadPhase !== 'none';
  const canShowIdleBeadHint =
    interactionEnabled &&
    !threading &&
    !isBeadInteractionLocked() &&
    (state.timeProgress < 0.33 || state.timeProgress >= 0.67);
  const sceneHint = state.beadDragging
    ? getDragProximityHint(proximity, state.mode, state.timeProgress)
    : canShowIdleBeadHint
      ? getBeadSceneHint(state.timeProgress)
      : '';

  mainCanvas.classList.toggle('ball-interactive', interactionEnabled && !threading);

  drawInteractionOverlay(
    overlayCanvas,
    ip,
    proximity,
    state.beadDragging,
    beadScreen,
    zone,
    pegTipScreen,
    showBlockedDragHint,
    state.beadDragging ? dragStartScreen : undefined,
    spatial
  );
  updateBeadSceneHintDisplay(
    sceneHint,
    beadScreen,
    state.beadDragging,
    proximity === 'drop' && state.timeProgress < 0.67,
    showMissHint
  );
}

function updateAll(): void {
  updateTimeline();
  updateAffectedEyeUi();
  updateUsageBar(state.mode, state.timeProgress);
  updateEyeCards();
  refreshCentralScene();
  updateStageText();
}

function eyeName(eye: EyeSide): string {
  return eye === 'left' ? '左眼' : '右眼';
}

function replaceAffectedEyeTerms(text: string): string {
  return state.affectedEye === 'left' ? text.replace(/右眼/g, '左眼') : text;
}

function shouldShowInterventionPrompt(): boolean {
  return state.mode !== 'normal' && state.timeProgress >= 0.67;
}

function resetIntervention(): void {
  state.interventionExpanded = false;
}

function getStageMechanismText(): string {
  if (state.mode === 'normal' || state.timeProgress < 0.67) {
    return replaceAffectedEyeTerms(getStageText(state.mode, state.timeProgress));
  }
  return '长期未干预时，大脑可能少用异常侧信息，立体感下降，进而可能形成弱视。';
}

function getInterventionInputCopy(): string {
  return '到专业眼科完成全面检查，由医生明确原因并制定方案，让弱视眼看到的画面更清楚、更稳定。';
}

function getFeedbackVisualParams(params: VisualParams): VisualParams {
  if (!state.interventionExpanded || !shouldShowInterventionPrompt()) {
    return params;
  }
  return {
    ...params,
    rightEyeAttenuation: params.rightEyeAttenuation * 0.78,
    abnormalContribution: Math.min(0.12, params.abnormalContribution + 0.035),
    depthStrength: Math.min(1, params.depthStrength + 0.08),
    snapStrength: Math.min(1, params.snapStrength + 0.08),
    cupGlowStrength: Math.min(1, params.cupGlowStrength + 0.08),
    misalignOffsetScale: params.misalignOffsetScale * 1.18,
    misalignGhostStrength: params.misalignGhostStrength * 1.18,
  };
}

function setEyeTag(el: Element, text: string, affected: boolean): void {
  el.textContent = text;
  el.classList.toggle('eye-tag-blue', affected);
  el.classList.toggle('eye-tag-green', !affected);
}

function updateAffectedEyeUi(): void {
  affectedEyeButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.affectedEye === state.affectedEye);
  });

  modePanel.classList.toggle('mode-panel--left', state.affectedEye === 'left');
  modePanel.classList.toggle('mode-panel--right', state.affectedEye === 'right');
  modePanelTitle.textContent = `${eyeName(state.affectedEye)}状态`;
}

function updateTimeline(): void {
  const t = state.timeProgress;
  timeMarks.forEach((mark) => {
    const threshold = parseFloat(mark.dataset.threshold ?? '0');
    let active = false;
    if (threshold === 0 && t < 0.33) active = true;
    if (threshold === 0.5 && t >= 0.33 && t < 0.67) active = true;
    if (threshold === 1 && t >= 0.67) active = true;
    mark.classList.toggle('active', active);
  });
}

function updateUsageBar(mode: VisionMode, timeProgress: number): void {
  const visual = getVisualParams(mode, timeProgress);
  const leftUsage = state.affectedEye === 'left' ? visual.rightUsage : visual.leftUsage;
  const rightUsage = state.affectedEye === 'left' ? visual.leftUsage : visual.rightUsage;
  const columns = `${leftUsage}fr ${rightUsage}fr`;

  usageBar.style.gridTemplateColumns = columns;
  const usageGap = Math.abs(leftUsage - rightUsage);
  usageBar.dataset.balance = usageGap < 0.05 ? 'equal' : Math.max(leftUsage, rightUsage) < 0.8 ? 'mid' : 'low';
  usageModule.classList.toggle(
    'intervention-participation-active',
    shouldShowInterventionPrompt() && state.interventionExpanded
  );
  usageModule.classList.toggle('intervention-affected-left', state.affectedEye === 'left');
  usageModule.classList.toggle('intervention-affected-right', state.affectedEye === 'right');
}

function updateEyeCards(): void {
  const params = getFeedbackVisualParams(getVisualParams(state.mode, state.timeProgress));
  syncViewportAspect();
  syncThumbCanvas(leftThumb);
  syncThumbCanvas(rightThumb);

  const affectedTag = getRightEyeTag(state.mode);
  setEyeTag(leftEyeTag, state.affectedEye === 'left' ? affectedTag : '画面清晰', state.affectedEye === 'left');
  setEyeTag(rightEyeTag, state.affectedEye === 'right' ? affectedTag : '画面清晰', state.affectedEye === 'right');

  if (state.affectedEye === 'left') {
    renderRightEyePreview(sceneCtx, leftThumb, state.mode, params.rightEyeAttenuation, 'left');
    renderClearEyePreview(sceneCtx, rightThumb, 'right');
  } else {
    renderClearEyePreview(sceneCtx, leftThumb, 'left');
    renderRightEyePreview(sceneCtx, rightThumb, state.mode, params.rightEyeAttenuation, 'right');
  }

  const inputActive = shouldShowInterventionPrompt() && state.interventionExpanded;
  leftThumb.closest('.eye-card')?.classList.toggle('intervention-input-active', inputActive && state.affectedEye === 'left');
  rightThumb.closest('.eye-card')?.classList.toggle('intervention-input-active', inputActive && state.affectedEye === 'right');
}

function updateStageText(): void {
  stageCaption.textContent = getStageMechanismText();
  modeExplanation.textContent = '';

  if (shouldShowInterventionPrompt()) {
    stageChildNoteLead.textContent = '筛查异常，应尽快眼科检查；确诊弱视后，';
    stageChildNoteEmphasis.textContent = '尽早规范干预';
    stageChildNote.classList.add('visible');
    timeCard.classList.add('time-card--has-note');
    timeCard.classList.toggle('time-card--review-active', state.interventionExpanded);
    interventionToggle.hidden = false;
    interventionToggle.textContent = '了解干预方式';
    interventionModal.hidden = !state.interventionExpanded;
    interventionInputCopy.textContent = getInterventionInputCopy();
  } else {
    stageChildNote.classList.remove('visible');
    timeCard.classList.remove('time-card--has-note');
    timeCard.classList.remove('time-card--review-active');
    stageChildNoteLead.textContent = '';
    stageChildNoteEmphasis.textContent = '';
    interventionToggle.hidden = true;
    interventionModal.hidden = true;
    interventionInputCopy.textContent = '';
  }
}

function resetBeadPosition(): void {
  sceneCtx.bead.visible = true;
  sceneCtx.bead.scale.setScalar(1);
  sceneCtx.bead.position.copy(getBeadDefaultPosition(sceneCtx));
  state.beadThreaded = false;
  state.beadThreadPhase = 'none';
  beadHomeDirty = false;
  lastBeadHomeSyncW = sceneCtx.mainViewportWidth;
  lastBeadHomeSyncH = sceneCtx.mainViewportHeight;
}

function onResize(): void {
  updateAll();
}

function getPointerPos(e: PointerEvent): { x: number; y: number } {
  const rect = mainCanvas.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) {
    return { x: e.clientX, y: e.clientY };
  }
  const { w, h } = getMainSize();
  return {
    x: ((e.clientX - rect.left) / rect.width) * w,
    y: ((e.clientY - rect.top) / rect.height) * h,
  };
}

function isBeadInteractionLocked(): boolean {
  return animFrame !== null;
}

function showDragBlockedHintBrief(): void {
  showBlockedDragHint = true;
  refreshCentralScene();
  if (blockedDragHintTimer) clearTimeout(blockedDragHintTimer);
  blockedDragHintTimer = setTimeout(() => {
    showBlockedDragHint = false;
    blockedDragHintTimer = null;
    refreshCentralScene();
  }, 1400);
}

function placeBeadFromPointer(e: PointerEvent): void {
  const { w, h } = getMainSize();
  const pos = getPointerPos(e);
  const ip = getInteractionParams(state.mode, state.timeProgress);
  const bounds = computeDeskPlayBounds(sceneCtx, w, h);
  placeBeadFromDragPointer(sceneCtx, pos.x, pos.y, w, h, ip, bounds, dragPointer);
  sceneCtx.bead.visible = true;
}

function handleBeadDragStart(e: PointerEvent): void {
  if (autoDemoActive) return;
  if (e.button !== 0) return;
  if (isInteractiveUiTarget(e.target)) return;
  if (!isBeadInteractionPhase(state.timeProgress)) return;

  const { w, h } = getMainSize();
  const pos = getPointerPos(e);

  if (!isPointerOnBead(sceneCtx, pos.x, pos.y, w, h)) return;

  if (isBeadInteractionLocked()) {
    showDragBlockedHintBrief();
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  cancelAnimations();
  if (threadedTimer) {
    clearTimeout(threadedTimer);
    threadedTimer = null;
  }

  dragStartScreen.x = pos.x;
  dragStartScreen.y = pos.y;
  dragStartBeadPos.copy(sceneCtx.bead.position);
  resetDragPointerState(
    dragPointer,
    pos.x,
    pos.y,
    sceneCtx,
    w,
    h,
    sceneCtx.bead.position.x,
    sceneCtx.bead.position.z
  );
  state.beadDragging = true;
  state.beadThreaded = false;
  state.beadThreadPhase = 'none';
  sceneCtx.bead.rotation.set(Math.PI / 2, 0, 0);
  showMissHint = false;
  showBlockedDragHint = false;
  mainCanvas.setPointerCapture(e.pointerId);
  mainCanvas.classList.add('dragging');
  refreshCentralScene();
  updateStageText();
}

function handleBeadDragMove(e: PointerEvent): void {
  if (!state.beadDragging) return;
  e.preventDefault();
  placeBeadFromPointer(e);
  refreshCentralScene();
}

function handleBeadDragEnd(e: PointerEvent): void {
  if (!state.beadDragging) return;
  state.beadDragging = false;
  if (mainCanvas.hasPointerCapture(e.pointerId)) {
    mainCanvas.releasePointerCapture(e.pointerId);
  }
  mainCanvas.classList.remove('dragging');

  updateStageText();

  if (!dragPointer.ready) {
    refreshCentralScene();
    return;
  }

  const moved =
    sceneCtx.bead.position.distanceToSquared(dragStartBeadPos) > 0.0008 * 0.0008;

  if (!moved) {
    refreshCentralScene();
    return;
  }

  const ip = getInteractionParams(state.mode, state.timeProgress);
  const { w, h } = getMainSize();

  placeBeadFromPointer(e);

  if (canThreadBeadAtScreen(sceneCtx, w, h, ip)) {
    snapBeadOntoPegAxis(sceneCtx.bead, sceneCtx.peg, true);
    completeBeadThreadSuccess();
  } else {
    registerBeadMiss();
    animateBeadMissBounce();
  }
}

function completeBeadThreadSuccess(): void {
  const ip = getInteractionParams(state.mode, state.timeProgress);
  snapBeadOntoPegAxis(sceneCtx.bead, sceneCtx.peg, true);

  state.beadThreadPhase = 'hover';
  state.beadThreaded = true;
  rimPulse = 0;
  beadMissCount = 0;
  showSuccessTip(getSuccessFeedback(state.mode, state.timeProgress));
  updateStageText();
  refreshCentralScene();

  const dropTarget = getBeadSnapPosition(sceneCtx, 1);
  if (ip.successCertainty === 'uncertain') {
    const jitter = (ip.successOffsetWorld + ip.snapJitterWorld) * 0.25;
    dropTarget.x += (Math.random() - 0.5) * jitter;
    dropTarget.z += (Math.random() - 0.5) * jitter;
  }

  window.setTimeout(() => {
    state.beadThreadPhase = 'sliding';
    animateBeadDrop(dropTarget, 680, () => {
      state.beadThreadPhase = 'done';
      refreshCentralScene();
      threadedTimer = setTimeout(() => {
        threadedTimer = null;
        if (!state.beadDragging) {
          resetBeadPosition();
          updateAll();
        }
      }, 2200);
    });
  }, 100);
}

function animateBeadDrop(target: Vector3, duration: number, onDone?: () => void): void {
  const start = performance.now();
  const from = sceneCtx.bead.position.clone();
  const axis = getPegAxisXZ(sceneCtx.peg);

  cancelAnimations();
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const e = p * p;
    sceneCtx.bead.position.x = axis.x;
    sceneCtx.bead.position.z = axis.z;
    sceneCtx.bead.position.y = lerp(from.y, target.y, e);
    refreshCentralScene();
    if (p < 1) {
      animFrame = requestAnimationFrame(step);
    } else {
      sceneCtx.bead.position.copy(target);
      sceneCtx.bead.position.x = axis.x;
      sceneCtx.bead.position.z = axis.z;
      animFrame = null;
      onDone?.();
    }
  };
  animFrame = requestAnimationFrame(step);
}

function animateBeadPosition(
  target: Vector3,
  duration: number,
  onDone?: () => void,
  lockAxis = false
): void {
  const start = performance.now();
  const from = sceneCtx.bead.position.clone();
  const axis = lockAxis ? getPegAxisXZ(sceneCtx.peg) : null;

  cancelAnimations();
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const e = p * p * (3 - 2 * p);
    sceneCtx.bead.position.lerpVectors(from, target, e);
    if (axis) {
      sceneCtx.bead.position.x = lerp(from.x, axis.x, e);
      sceneCtx.bead.position.z = lerp(from.z, axis.z, e);
    }
    refreshCentralScene();
    if (p < 1) {
      animFrame = requestAnimationFrame(step);
    } else {
      animFrame = null;
      onDone?.();
    }
  };
  animFrame = requestAnimationFrame(step);
}

function projectMissAwayFromPeg(pos: Vector3, minRadius: number, dirX: number, dirZ: number): void {
  const axis = getPegAxisXZ(sceneCtx.peg);
  const dx = pos.x - axis.x;
  const dz = pos.z - axis.z;
  const dist = Math.hypot(dx, dz);
  if (dist >= minRadius) return;

  const ux = dist > 0.0001 ? dx / dist : dirX;
  const uz = dist > 0.0001 ? dz / dist : dirZ;
  pos.x = axis.x + ux * minRadius;
  pos.z = axis.z + uz * minRadius;
}

function animateBeadMissBounce(): void {
  missBounceFrom.copy(sceneCtx.bead.position);
  const { w, h } = getMainSize();
  const bounds = computeDeskPlayBounds(sceneCtx, w, h);
  const axis = getPegAxisXZ(sceneCtx.peg);
  const dx = missBounceFrom.x - axis.x;
  const dz = missBounceFrom.z - axis.z;
  const rawDist = Math.hypot(dx, dz);
  const home = getBeadDefaultPosition(sceneCtx);
  const homeDx = home.x - axis.x;
  const homeDz = home.z - axis.z;
  const homeDist = Math.hypot(homeDx, homeDz) || 1;
  const dirX = rawDist > 0.0001 ? dx / rawDist : homeDx / homeDist;
  const dirZ = rawDist > 0.0001 ? dz / rawDist : homeDz / homeDist;

  let target: Vector3;
  const safeR = getMinClearanceRadius(sceneCtx.peg) + BEAD_MAJOR_R * 1.05;
  const nearPeg = rawDist < safeR;
  if (nearPeg) {
    target = new Vector3(
      axis.x + dirX * safeR,
      BEAD_CENTER_Y,
      axis.z + dirZ * safeR
    );
    clampBeadToDesk(target, bounds);
  } else {
    target = missBounceFrom.clone().lerp(home, 0.35);
    target.y = BEAD_CENTER_Y;
    projectMissAwayFromPeg(target, safeR, dirX, dirZ);
    clampBeadToDesk(target, bounds);
  }

  const start = performance.now();
  const duration = 380;
  const hoverY = getBeadHoverY(sceneCtx.peg);
  const fallRange = Math.max(0.001, hoverY - BEAD_CENTER_Y);

  cancelAnimations();
  showMissHintBrief();

  const step = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const e = 1 - (1 - p) * (1 - p);
    sceneCtx.bead.position.lerpVectors(missBounceFrom, target, e);
    const descendT = clamp((hoverY - sceneCtx.bead.position.y) / fallRange, 0, 1);
    if (descendT > 0) {
      projectMissAwayFromPeg(sceneCtx.bead.position, safeR * descendT, dirX, dirZ);
      clampBeadToDesk(sceneCtx.bead.position, bounds);
    }
    refreshCentralScene();
    if (p < 1) {
      animFrame = requestAnimationFrame(step);
    } else {
      animFrame = null;
      refreshCentralScene();
      updateStageText();
    }
  };
  animFrame = requestAnimationFrame(step);
}

function registerBeadMiss(): void {
  beadMissCount += 1;
  if (
    beadMissCount >= 2 &&
    !coordinationPopupShown &&
    shouldShowCoordinationWeakPopup(state.mode, state.timeProgress)
  ) {
    coordinationPopupShown = true;
    showSceneTip(getCoordinationWeakFeedback(), false);
  }
}

function showMissHintBrief(): void {
  showMissHint = true;
  refreshCentralScene();
  if (missHintTimer) clearTimeout(missHintTimer);
  missHintTimer = setTimeout(() => {
    showMissHint = false;
    missHintTimer = null;
    updateStageText();
    refreshCentralScene();
  }, 1600);
}

function positionSuccessToastAbovePeg(): void {
  const { w, h } = getMainSize();
  const tip = getPegTipScreen(sceneCtx, w, h);
  const rect = mainCanvas.getBoundingClientRect();
  const x = rect.left + (tip.x / w) * rect.width;
  const y = rect.top + (tip.y / h) * rect.height;
  successToast.style.left = `${x}px`;
  successToast.style.top = `${y}px`;
}

function showSceneTip(
  feedback: { title: string; subtitle: string },
  showIcon = true
): void {
  if (successTimer) clearTimeout(successTimer);
  positionSuccessToastAbovePeg();
  successIcon.hidden = !showIcon;
  successTitle.textContent = feedback.title;
  successSubtitle.textContent = feedback.subtitle;
  successToast.hidden = false;
  requestAnimationFrame(() => successToast.classList.add('visible'));
  successTimer = setTimeout(() => {
    successToast.classList.remove('visible');
    setTimeout(() => {
      successToast.hidden = true;
    }, 300);
  }, 2800);
}

function showSuccessTip(feedback: { title: string; subtitle: string }): void {
  showSceneTip(feedback, true);
}

initApp();
