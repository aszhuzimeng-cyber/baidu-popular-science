import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { CSSProperties, MutableRefObject, RefObject } from "react";
import { useShallow } from "zustand/react/shallow";
import { Camera as CameraIcon, FlipHorizontal2, Plus } from "lucide-react";
import type { Hands } from "@mediapipe/hands";
import { loadMediapipeHands } from "../../mediapipe/loadMediapipeHands";
import { sceneDecorImageUrl } from "../../data/scenePalette";
import { logicalStage, performancePuppetViewScale } from "../../data/themeConfig";
import {
  applyKnobStyle,
  createDiskJoystick,
  createRingJoystick,
  diskPointerDown,
  diskUpdatePosition,
  pointerUp,
  ringPointerDown,
  ringUpdatePosition,
} from "../../performance/canvas/joystickState";
import { clamp } from "../../performance/canvas/mathUtils";
import {
  paintPerformanceCanvas,
  type PerformancePuppetCanvasLayer,
} from "../../performance/canvas/paintPerformanceCanvas";
import { createDefaultAssemblyPartTransforms } from "../../data/assemblyDefaultTransforms";
import {
  getDefaultPerformancePartTransformsForCharacter,
  getPerformancePartTransformsForDraw,
} from "../../data/performanceStagePartPresets";
import { characterCards, characterCardStaticThumb } from "../../data/puppetConfig";
import {
  resolvePuppetBottomAlignedBaseY,
  type PuppetAlignmentLayer,
} from "../../performance/canvas/puppetAlignment";
import { createHtmlPuppet } from "../../performance/canvas/puppetState";
import { updateHtmlKinematics } from "../../performance/canvas/updateKinematics";
import { useAppStore } from "../../store/useAppStore";
import { emptyPuppetSkinBundle, type PuppetSkinBundle } from "../../types/puppetSkin";
import { StageFrame } from "../layout/StageFrame";
import { IconButton } from "../common/IconButton";
import { DEFAULT_PERFORMANCE_CONTROL_POINTS } from "../../types/performanceControlPoints";
import {
  DEFAULT_PERFORMANCE_PUPPET_TRANSFORM,
  type PerformanceBoneMetrics,
} from "../../types/performanceSkeleton";
import type { AssemblyPartTransforms } from "../../types/assembly";
import type { PerformanceControlPoints } from "../../types/performanceControlPoints";
import type { HtmlPuppetState } from "../../performance/canvas/puppetState";

interface PerformanceStageProps {
  onCapture?: (imageDataUrl: string) => void;
  disableGestureMode?: boolean;
}

const KNOB = 36;
const SZ_TRANS = 120;
const SZ_BODY = 110;
const SZ_HAND = 100;
const SZ_BOTH = 120;
const TOP_LEFT_ACTION_BUTTON_CLASS = "h-[clamp(4.5rem,6vw,5.75rem)] w-[clamp(4.5rem,6vw,5.75rem)]";
const MOBILE_TRANS_JOYSTICK_DEADZONE = 0.06;
const MOBILE_TRANS_JOYSTICK_SENSITIVITY = 0.84;
const MOBILE_CONTROL_SCREEN_EDGE_MIN_PX = 32;
const MOBILE_CONTROL_SCREEN_EDGE_MAX_PX = 48;
const MOBILE_CONTROL_SCREEN_EDGE_RATIO = 0.035;
const PERFORMANCE_SCENE_DECOR_URLS = Object.values(sceneDecorImageUrl)
  .filter((url): url is string => Boolean(url))
  .sort((a, b) => a.localeCompare(b));
const SECOND_PUPPET_PICKER_SLOTS = [
  {
    xPct: 11.5,
    yPct: 32.3,
    widthPct: 22.1,
    heightPct: 56.4,
    imageBoxPct: 92,
    imageScale: 1.18,
    imageTranslateXPct: 0,
    imageTranslateYPct: 0,
  },
  {
    xPct: 38.5,
    yPct: 32.3,
    widthPct: 22.2,
    heightPct: 56.7,
    imageBoxPct: 92,
    imageScale: 1.18,
    imageTranslateXPct: 0,
    imageTranslateYPct: 0,
  },
  {
    xPct: 67.3,
    yPct: 33.5,
    widthPct: 22.1,
    heightPct: 55.3,
    imageBoxPct: 92,
    imageScale: 1.18,
    imageTranslateXPct: 0,
    imageTranslateYPct: 0,
  },
] as const;
const CONTROL_KNOB_CLASS =
  "absolute left-1/2 top-1/2 h-9 w-9 rounded-full border-2 border-[#f0b555] bg-[radial-gradient(circle_at_30%_28%,_rgb(182,62,33)_0%,_#8f2d18_58%,_#4d1409_100%)] shadow-[0_4px_8px_rgba(0,0,0,0.6),inset_0_-2px_5px_rgba(0,0,0,0.5),inset_0_1px_4px_rgba(255,226,163,0.45)]";
const CONTROL_LIMIT_WARN_CLASS =
  "pointer-events-none mb-1 flex h-6 w-[4.6rem] items-center justify-center whitespace-nowrap rounded-full border border-[#b98245] bg-[rgb(194,91,51)] px-0 text-xs font-display text-[#ffe2a3] opacity-0 shadow-[0_8px_18px_rgba(55,25,11,0.35)] transition-opacity duration-150";
const RING_WIDTH_PX = 18;
const RING_GAP_DEG = 60;
const RING_BROWN_MASK = `radial-gradient(farthest-side, transparent calc(100% - ${RING_WIDTH_PX}px), #000 calc(100% - ${RING_WIDTH_PX}px))`;
const RING_OUTER_GOLD_MASK = "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))";
const RING_INNER_GOLD_MASK = `radial-gradient(farthest-side, transparent calc(100% - ${RING_WIDTH_PX}px), #000 calc(100% - ${RING_WIDTH_PX}px) calc(100% - ${RING_WIDTH_PX}px + 2px), transparent calc(100% - ${RING_WIDTH_PX}px + 2px))`;
const HAND_TIMEOUT_MS = 300;
const GESTURE_CALIBRATION_FRAMES = 12;
const MOVE_DEADZONE = 0.08;
const FINGER_DEADZONE = 0.14;
const FINGER_RANGE = 0.38;
const THUMB_BODY_DEADZONE = 0.2;
const THUMB_BODY_RANGE = 0.52;
const BODY_GESTURE_MAX_RATIO = 0.66;
const BODY_GESTURE_RESPONSE = 0.13;
const GESTURE_LANDMARK_SMOOTHING = 0.42;
const CAMERA_POSITION_EDGE_PADDING = 0.1;
const CAMERA_PREVIEW_DRAW_SIZE = {
  width: 320,
  height: 240,
};
const CAMERA_HAND_DRAW_STYLE = {
  connectorWidth: 4,
  landmarkWidth: 2,
  landmarkRadius: 3,
};
const CAMERA_UNAVAILABLE_MESSAGE = "无法打开摄像头，请检查摄像头权限";
const CAMERA_RECONNECTING_MESSAGE = "摄像头连接中断，正在重新连接";
const GESTURE_PROCESSING_MESSAGE = "手势识别暂时中断，正在尝试恢复";
const GESTURE_PROCESS_INTERVAL_MS = 50;
const GESTURE_SEND_ERROR_LIMIT = 12;

const preloadImageToCache = (url: string, cache: Map<string, HTMLImageElement>) =>
  new Promise<void>((resolve) => {
    const cached = cache.get(url);
    if (cached?.complete && cached.naturalWidth > 0) {
      resolve();
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      cache.set(url, img);
      resolve();
    };
    img.onerror = () => {
      cache.delete(url);
      resolve();
    };
    img.src = url;
  });

const getCameraStartErrorMessage = (err: unknown) => {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "SecurityError") {
      return "摄像头权限未开启，请允许浏览器使用摄像头";
    }
    if (err.name === "NotFoundError" || err.name === "OverconstrainedError") {
      return "没有找到可用摄像头，请检查设备连接";
    }
    if (err.name === "NotReadableError" || err.name === "AbortError") {
      return "摄像头暂时无法使用，请关闭占用摄像头的其他应用后重试";
    }
  }
  return CAMERA_UNAVAILABLE_MESSAGE;
};

const ringGradientStyle = (gapFromDeg: number): CSSProperties => ({
  background:
    "radial-gradient(circle at center, rgba(221,156,111,0.7) 0%, rgba(129,74,35,0.78) 58%, rgba(69,34,10,0.96) 100%)",
  WebkitMaskImage: `${RING_BROWN_MASK}, conic-gradient(from ${gapFromDeg}deg, transparent 0deg ${RING_GAP_DEG}deg, #000 ${RING_GAP_DEG}deg 360deg)`,
  WebkitMaskComposite: "source-in",
  maskImage: `${RING_BROWN_MASK}, conic-gradient(from ${gapFromDeg}deg, transparent 0deg ${RING_GAP_DEG}deg, #000 ${RING_GAP_DEG}deg 360deg)`,
  maskComposite: "intersect",
});

const ringOuterGoldStrokeStyle = (gapFromDeg: number): CSSProperties => ({
  background: `conic-gradient(from ${gapFromDeg}deg, transparent 0deg ${RING_GAP_DEG}deg, rgba(240,181,85,0.95) ${RING_GAP_DEG}deg 360deg)`,
  WebkitMaskImage: `${RING_OUTER_GOLD_MASK}, conic-gradient(from ${gapFromDeg}deg, transparent 0deg ${RING_GAP_DEG}deg, #000 ${RING_GAP_DEG}deg 360deg)`,
  WebkitMaskComposite: "source-in",
  maskImage: `${RING_OUTER_GOLD_MASK}, conic-gradient(from ${gapFromDeg}deg, transparent 0deg ${RING_GAP_DEG}deg, #000 ${RING_GAP_DEG}deg 360deg)`,
  maskComposite: "intersect",
});

const ringInnerGoldStrokeStyle = (gapFromDeg: number): CSSProperties => ({
  background: `conic-gradient(from ${gapFromDeg}deg, transparent 0deg ${RING_GAP_DEG}deg, rgba(240,181,85,0.9) ${RING_GAP_DEG}deg 360deg)`,
  WebkitMaskImage: `${RING_INNER_GOLD_MASK}, conic-gradient(from ${gapFromDeg}deg, transparent 0deg ${RING_GAP_DEG}deg, #000 ${RING_GAP_DEG}deg 360deg)`,
  WebkitMaskComposite: "source-in",
  maskImage: `${RING_INNER_GOLD_MASK}, conic-gradient(from ${gapFromDeg}deg, transparent 0deg ${RING_GAP_DEG}deg, #000 ${RING_GAP_DEG}deg 360deg)`,
  maskComposite: "intersect",
});

interface CameraCalibration {
  palmCenter0: { x: number; y: number };
  palmWid0: number;
  thumbDist0: number;
  idxDist0: number;
  midDist0: number;
  samples: number;
  ready: boolean;
}

interface HandLm {
  x: number;
  y: number;
}

const lerp = (cur: number, tar: number, speed: number) => cur + (tar - cur) * speed;

const applySignedDeadzone = (value: number, deadzone: number) => {
  const abs = Math.abs(value);
  if (abs <= deadzone) return 0;
  return Math.sign(value) * clamp((abs - deadzone) / (1 - deadzone), 0, 1);
};

const softenMobileTransJoystickAxis = (value: number) =>
  applySignedDeadzone(value, MOBILE_TRANS_JOYSTICK_DEADZONE) * MOBILE_TRANS_JOYSTICK_SENSITIVITY;

const fingerActionFromDistance = (
  current: number,
  baseline: number,
  deadzone = FINGER_DEADZONE,
  range = FINGER_RANGE,
) => {
  const bend = 1 - current / Math.max(0.0001, baseline);
  if (bend <= deadzone) return 0;
  return clamp((bend - deadzone) / Math.max(0.0001, range - deadzone), 0, 1);
};

const cameraPositionToDiskInput = (palmCenter: { x: number; y: number }) => {
  const activeSpan = 0.5 - CAMERA_POSITION_EDGE_PADDING;
  return {
    x: applySignedDeadzone((palmCenter.x - 0.5) / activeSpan, MOVE_DEADZONE),
    y: applySignedDeadzone((palmCenter.y - 0.5) / activeSpan, MOVE_DEADZONE),
  };
};

const smoothHandLandmarks = (
  previous: MutableRefObject<HandLm[] | null>,
  landmarks: HandLm[],
) => {
  const prev = previous.current;
  if (!prev || prev.length !== landmarks.length) {
    previous.current = landmarks.map((point) => ({ x: point.x, y: point.y }));
    return previous.current;
  }

  const smoothed = landmarks.map((point, index) => ({
    x: lerp(prev[index].x, point.x, GESTURE_LANDMARK_SMOOTHING),
    y: lerp(prev[index].y, point.y, GESTURE_LANDMARK_SMOOTHING),
  }));
  previous.current = smoothed;
  return smoothed;
};

const setDiskCameraInput = (target: { x: number; y: number }, x: number, y: number) => {
  target.x = lerp(target.x, clamp(x, -1, 1), 0.1);
  target.y = lerp(target.y, clamp(y, -1, 1), 0.1);
};

const setRingCameraInput = (
  target: { x: number; y: number; accumulatedAngle: number; startAtBottom: boolean; limitRad: number },
  x: number,
  y: number,
  response = 0.15,
) => {
  const tgtAngle = target.startAtBottom ? Math.atan2(x, y) : Math.atan2(x, -y);
  const diff = ((tgtAngle - target.accumulatedAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  target.accumulatedAngle += diff * response;
  target.accumulatedAngle = clamp(target.accumulatedAngle, -target.limitRad, target.limitRad);
  target.x = Math.sin(target.accumulatedAngle);
  target.y = target.startAtBottom ? Math.cos(target.accumulatedAngle) : -Math.cos(target.accumulatedAngle);
};

const diskReturnNeutral = (target: { x: number; y: number }) => {
  target.x = lerp(target.x, 0, 0.15);
  target.y = lerp(target.y, 0, 0.15);
};

const ringReturnNeutral = (
  target: { x: number; y: number; accumulatedAngle: number; startAtBottom: boolean },
) => {
  target.accumulatedAngle = lerp(target.accumulatedAngle, 0, 0.15);
  target.x = Math.sin(target.accumulatedAngle);
  target.y = target.startAtBottom ? Math.cos(target.accumulatedAngle) : -Math.cos(target.accumulatedAngle);
};

const applyLinkedRingKnobStyle = (
  knobEl: HTMLElement | null,
  primary: { accumulatedAngle: number; startAtBottom: boolean; limitRad: number },
  linked: { accumulatedAngle: number },
  controlDiameterCssPx: number,
  knobDiameterCssPx: number,
) => {
  if (!knobEl) return;
  const angle = clamp(primary.accumulatedAngle + linked.accumulatedAngle, -primary.limitRad, primary.limitRad);
  const maxRadius = controlDiameterCssPx / 2 - knobDiameterCssPx / 2;
  const ox = Math.sin(angle) * maxRadius;
  const oy = (primary.startAtBottom ? Math.cos(angle) : -Math.cos(angle)) * maxRadius;
  knobEl.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
};

const applyKnobStyleFromElements = (
  knobEl: HTMLElement | null,
  controlEl: HTMLElement | null,
  joy: Parameters<typeof applyKnobStyle>[1],
) => {
  if (!knobEl || !controlEl) return;
  const controlRect = controlEl.getBoundingClientRect();
  const knobRect = knobEl.getBoundingClientRect();
  applyKnobStyle(
    knobEl,
    joy,
    controlRect.width || SZ_HAND,
    knobRect.width || KNOB,
  );
};

const applyLinkedRingKnobStyleFromElements = (
  knobEl: HTMLElement | null,
  controlEl: HTMLElement | null,
  primary: { accumulatedAngle: number; startAtBottom: boolean; limitRad: number },
  linked: { accumulatedAngle: number },
) => {
  if (!knobEl || !controlEl) return;
  const controlRect = controlEl.getBoundingClientRect();
  const knobRect = knobEl.getBoundingClientRect();
  applyLinkedRingKnobStyle(
    knobEl,
    primary,
    linked,
    controlRect.width || SZ_HAND,
    knobRect.width || KNOB,
  );
};

const setBodyGestureLinear = (
  target: { x: number; y: number; accumulatedAngle: number; limitRad: number },
  thumbAction: number,
  direction = 1,
) => {
  const targetAngle = clamp(thumbAction, 0, 1) * target.limitRad * BODY_GESTURE_MAX_RATIO * direction;
  target.accumulatedAngle = lerp(target.accumulatedAngle, targetAngle, BODY_GESTURE_RESPONSE);
  target.x = Math.sin(target.accumulatedAngle);
  target.y = -Math.cos(target.accumulatedAngle);
};

const setWarnVisible = (ref: RefObject<HTMLDivElement | null>, visible: boolean | null) => {
  if (visible === null || !ref.current) return;
  ref.current.classList.toggle("opacity-100", visible);
  ref.current.classList.toggle("opacity-0", !visible);
};

const setCalibrationPose = (puppet: HtmlPuppetState) => {
  puppet.x = puppet.baseX;
  puppet.y = puppet.baseY;
  puppet.lastX = puppet.x;
  puppet.lastY = puppet.y;
  puppet.lastTargetX = puppet.x;
  puppet.lastTargetY = puppet.y;
  puppet.prevTargetTorso = 0;
  puppet.torsoVelSmooth = 0;
  puppet.prevRawTorsoVel = 0;
  puppet.prevJoyBodyY = -1;
  puppet.prevBodyRingAngleDeg = 0;
  puppet.bodyRingLegInited = false;
  puppet.torsoAngle = 0;
  puppet.torsoBend = 0;
  puppet.hipAngle = 0;
  puppet.facingOffset = 0;
  puppet.hipDrop = 0;
  puppet.headAngle = 0;
  puppet.fArmU = 0;
  puppet.fArmL = 0;
  puppet.bArmU = 0;
  puppet.bArmL = 0;
  puppet.fLeg = 0;
  puppet.bLeg = 0;
  puppet.fLegVelocity = 0;
  puppet.bLegVelocity = 0;
  puppet.legSmoothedVx = 0;
  puppet.legSmoothedVy = 0;
  puppet.legDragPhase = 0;
  puppet.targets.x = puppet.x;
  puppet.targets.y = puppet.y;
  puppet.targets.torsoAngle = 0;
  puppet.targets.torsoBend = 0;
  puppet.targets.hipAngle = 0;
  puppet.targets.facingOffset = 0;
  puppet.targets.hipDrop = 0;
  puppet.targets.headAngle = 0;
  puppet.targets.fArmU = 0;
  puppet.targets.fArmL = 0;
  puppet.targets.bArmU = 0;
  puppet.targets.bArmL = 0;
  puppet.targets.fLeg = 0;
  puppet.targets.bLeg = 0;
};

const syncPuppetBase = (puppet: HtmlPuppetState, baseX: number, baseY: number) => {
  const dx = baseX - puppet.baseX;
  const dy = baseY - puppet.baseY;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return;
  puppet.baseX = baseX;
  puppet.baseY = baseY;
  puppet.x += dx;
  puppet.y += dy;
  puppet.lastX += dx;
  puppet.lastY += dy;
  puppet.lastTargetX += dx;
  puppet.lastTargetY += dy;
  puppet.targets.x += dx;
  puppet.targets.y += dy;
};

const resetDiskJoystickNow = (target: { x: number; y: number; active: boolean; pointerId: number | null }) => {
  target.x = 0;
  target.y = 0;
  target.active = false;
  target.pointerId = null;
};

const resetRingJoystickNow = (target: {
  x: number;
  y: number;
  accumulatedAngle: number;
  lastRawAngle: number;
  active: boolean;
  pointerId: number | null;
  startAtBottom: boolean;
}) => {
  target.x = 0;
  target.y = target.startAtBottom ? 1 : -1;
  target.accumulatedAngle = 0;
  target.lastRawAngle = 0;
  target.active = false;
  target.pointerId = null;
};

const createGestureJoySet = () => ({
  trans: createDiskJoystick(),
  body: createRingJoystick(false),
  right: createRingJoystick(true),
  left: createRingJoystick(true),
  both: createRingJoystick(true),
});

type GestureJoySet = ReturnType<typeof createGestureJoySet>;
type ArmLimitDegRange = [number, number];

const FRONT_UPPER_ARM_LIMIT_DEG: ArmLimitDegRange = [-120, 125];
const FRONT_FOREARM_LIMIT_DEG: ArmLimitDegRange = [-60, 75];
const BACK_UPPER_ARM_LIMIT_DEG: ArmLimitDegRange = [-120, 125];
const BACK_FOREARM_LIMIT_DEG: ArmLimitDegRange = [-60, 75];

const intersectRanges = (a: ArmLimitDegRange, b: ArmLimitDegRange): ArmLimitDegRange => [
  Math.max(a[0], b[0]),
  Math.min(a[1], b[1]),
];

const controlDeltaRangeForArm = (
  upperRange: ArmLimitDegRange,
  forearmRange: ArmLimitDegRange,
): ArmLimitDegRange => {
  return intersectRanges(
    intersectRanges(
      [upperRange[0] / 0.5, upperRange[1] / 0.5],
      [forearmRange[0] / 0.3, forearmRange[1] / 0.3],
    ),
    [-250, 250],
  );
};

const refreshRingVectorFromAngle = (ring: GestureJoySet["both"]) => {
  ring.x = Math.sin(ring.accumulatedAngle);
  ring.y = ring.startAtBottom ? Math.cos(ring.accumulatedAngle) : -Math.cos(ring.accumulatedAngle);
};

const limitLinkedHandRingByArmBounds = (
  both: GestureJoySet["both"],
  front: GestureJoySet["left"],
  rear: GestureJoySet["right"],
) => {
  const frontDeltaRange = controlDeltaRangeForArm(
    FRONT_UPPER_ARM_LIMIT_DEG,
    FRONT_FOREARM_LIMIT_DEG,
  );
  const rearDeltaRange = controlDeltaRangeForArm(
    BACK_UPPER_ARM_LIMIT_DEG,
    BACK_FOREARM_LIMIT_DEG,
  );
  const frontOffsetDeg = -front.accumulatedAngle * (180 / Math.PI);
  const rearOffsetDeg = -rear.accumulatedAngle * (180 / Math.PI);
  const bothOffsetRange: ArmLimitDegRange = intersectRanges(
    [frontDeltaRange[0] - frontOffsetDeg, frontDeltaRange[1] - frontOffsetDeg],
    [rearDeltaRange[0] - rearOffsetDeg, rearDeltaRange[1] - rearOffsetDeg],
  );
  const rawBothRange: ArmLimitDegRange = [
    -both.limitRad * (180 / Math.PI),
    both.limitRad * (180 / Math.PI),
  ];
  const bothAngleRange = intersectRanges(
    [-bothOffsetRange[1], -bothOffsetRange[0]],
    rawBothRange,
  );
  const minRad = (Math.min(bothAngleRange[0], bothAngleRange[1]) * Math.PI) / 180;
  const maxRad = (Math.max(bothAngleRange[0], bothAngleRange[1]) * Math.PI) / 180;
  const nextAngle = clamp(both.accumulatedAngle, minRad, maxRad);
  const atLimit = Math.abs(nextAngle - both.accumulatedAngle) > 0.0001;
  both.accumulatedAngle = nextAngle;
  refreshRingVectorFromAngle(both);
  return atLimit;
};

const resetGestureJoySet = (joys: GestureJoySet) => {
  resetDiskJoystickNow(joys.trans);
  resetRingJoystickNow(joys.body);
  resetRingJoystickNow(joys.right);
  resetRingJoystickNow(joys.left);
  resetRingJoystickNow(joys.both);
};

const mirrorArmPoseForFacingFlip = (puppet: HtmlPuppetState) => {
  const frontUpper = puppet.fArmU;
  const frontForearm = puppet.fArmL;
  const backUpper = puppet.bArmU;
  const backForearm = puppet.bArmL;
  const targetFrontUpper = puppet.targets.fArmU;
  const targetFrontForearm = puppet.targets.fArmL;
  const targetBackUpper = puppet.targets.bArmU;
  const targetBackForearm = puppet.targets.bArmL;

  puppet.fArmU = -backUpper;
  puppet.fArmL = -backForearm;
  puppet.bArmU = -frontUpper;
  puppet.bArmL = -frontForearm;
  puppet.targets.fArmU = -targetBackUpper;
  puppet.targets.fArmL = -targetBackForearm;
  puppet.targets.bArmU = -targetFrontUpper;
  puppet.targets.bArmL = -targetFrontForearm;
};

const mirrorHandControlRingsForFacingFlip = (joys: GestureJoySet) => {
  const nextLeftAngle = -joys.right.accumulatedAngle;
  const nextRightAngle = -joys.left.accumulatedAngle;
  const nextBothAngle = -joys.both.accumulatedAngle;

  joys.left.accumulatedAngle = nextLeftAngle;
  joys.right.accumulatedAngle = nextRightAngle;
  joys.both.accumulatedAngle = nextBothAngle;
  refreshRingVectorFromAngle(joys.left);
  refreshRingVectorFromAngle(joys.right);
  refreshRingVectorFromAngle(joys.both);
};

const returnGestureJoySetNeutral = (joys: GestureJoySet) => {
  diskReturnNeutral(joys.trans);
  ringReturnNeutral(joys.body);
  ringReturnNeutral(joys.left);
  ringReturnNeutral(joys.right);
  ringReturnNeutral(joys.both);
};

const returnGestureActionControlsNeutral = (joys: GestureJoySet) => {
  ringReturnNeutral(joys.body);
  ringReturnNeutral(joys.left);
  ringReturnNeutral(joys.right);
  ringReturnNeutral(joys.both);
};

export function PerformanceStage({
  onCapture = () => undefined,
  disableGestureMode = false,
}: PerformanceStageProps) {
  const {
    sceneItems,
    isFlipped,
    showPerformanceRods,
    flipPuppet,
    togglePerformanceRods,
    selectedCharacterId,
    puppetSkinByCharacterId,
    performancePartTransformsByCharacterId,
    performancePuppetTransformsByCharacterId,
    performanceBonesByCharacterId,
    performanceControlPointsByCharacterId,
  } = useAppStore(
    useShallow((state) => ({
      sceneItems: state.sceneItems,
      isFlipped: state.isFlipped,
      showPerformanceRods: state.showPerformanceRods,
      flipPuppet: state.flipPuppet,
      togglePerformanceRods: state.togglePerformanceRods,
      selectedCharacterId: state.selectedCharacterId,
      puppetSkinByCharacterId: state.puppetSkinByCharacterId,
      performancePartTransformsByCharacterId: state.performancePartTransformsByCharacterId,
      performancePuppetTransformsByCharacterId: state.performancePuppetTransformsByCharacterId,
      performanceBonesByCharacterId: state.performanceBonesByCharacterId,
      performanceControlPointsByCharacterId: state.performanceControlPointsByCharacterId,
    })),
  );

  const [gestureModeEnabled, setGestureModeEnabled] = useState(false);
  const [secondaryCharacterId, setSecondaryCharacterId] = useState<string | null>(null);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);

  const activePuppetSkin: PuppetSkinBundle =
    puppetSkinByCharacterId[selectedCharacterId] ?? emptyPuppetSkinBundle();
  const rawPerformancePartTransforms =
    performancePartTransformsByCharacterId[selectedCharacterId] ?? createDefaultAssemblyPartTransforms();
  const activePerformancePartTransforms = getPerformancePartTransformsForDraw(
    selectedCharacterId,
    rawPerformancePartTransforms,
  );
  const activePerformanceBones = performanceBonesByCharacterId[selectedCharacterId];
  const activePerformancePuppetTransform =
    performancePuppetTransformsByCharacterId[selectedCharacterId] ?? DEFAULT_PERFORMANCE_PUPPET_TRANSFORM;
  const activeControlPoints =
    performanceControlPointsByCharacterId[selectedCharacterId] ?? DEFAULT_PERFORMANCE_CONTROL_POINTS;
  const secondaryPuppetSkin: PuppetSkinBundle | null = secondaryCharacterId
    ? puppetSkinByCharacterId[secondaryCharacterId] ?? emptyPuppetSkinBundle()
    : null;
  const secondaryRawPerformancePartTransforms = secondaryCharacterId
    ? performancePartTransformsByCharacterId[secondaryCharacterId] ?? createDefaultAssemblyPartTransforms()
    : null;
  const secondaryPerformancePartTransforms =
    secondaryCharacterId && secondaryRawPerformancePartTransforms
      ? getPerformancePartTransformsForDraw(secondaryCharacterId, secondaryRawPerformancePartTransforms)
      : null;
  const secondaryPerformanceBones = secondaryCharacterId
    ? performanceBonesByCharacterId[secondaryCharacterId]
    : undefined;
  const secondaryBasePuppetTransform =
    secondaryCharacterId
      ? performancePuppetTransformsByCharacterId[secondaryCharacterId] ?? DEFAULT_PERFORMANCE_PUPPET_TRANSFORM
      : null;
  const secondaryPerformancePuppetTransform = secondaryBasePuppetTransform
    ? {
        ...secondaryBasePuppetTransform,
        x: logicalStage.width - secondaryBasePuppetTransform.x,
      }
    : null;
  const secondaryControlPoints =
    secondaryCharacterId
      ? performanceControlPointsByCharacterId[secondaryCharacterId] ?? DEFAULT_PERFORMANCE_CONTROL_POINTS
      : null;
  const referenceCharacterId = "role-1";
  const referenceRawPerformancePartTransforms =
    performancePartTransformsByCharacterId[referenceCharacterId] ??
    getDefaultPerformancePartTransformsForCharacter(referenceCharacterId);
  const referencePerformancePartTransforms = getPerformancePartTransformsForDraw(
    referenceCharacterId,
    referenceRawPerformancePartTransforms,
  );
  const referencePuppetSkin =
    puppetSkinByCharacterId[referenceCharacterId] ?? emptyPuppetSkinBundle();
  const referencePerformanceBones = performanceBonesByCharacterId[referenceCharacterId];
  const referenceControlPoints =
    performanceControlPointsByCharacterId[referenceCharacterId] ?? DEFAULT_PERFORMANCE_CONTROL_POINTS;
  const referencePerformancePuppetTransform =
    performancePuppetTransformsByCharacterId[referenceCharacterId] ?? DEFAULT_PERFORMANCE_PUPPET_TRANSFORM;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const puppetRef = useRef(
    createHtmlPuppet(
      logicalStage.width,
      logicalStage.height,
      DEFAULT_PERFORMANCE_PUPPET_TRANSFORM.x - logicalStage.width / 2,
    ),
  );
  const secondaryPuppetRef = useRef(
    createHtmlPuppet(
      logicalStage.width,
      logicalStage.height,
      logicalStage.width - DEFAULT_PERFORMANCE_PUPPET_TRANSFORM.x - logicalStage.width / 2,
    ),
  );

  const transBgRef = useRef<HTMLDivElement>(null);
  const transKnobRef = useRef<HTMLDivElement>(null);
  const bodyBgRef = useRef<HTMLDivElement>(null);
  const bodyKnobRef = useRef<HTMLDivElement>(null);
  const bodyWarnRef = useRef<HTMLDivElement>(null);
  const rightBgRef = useRef<HTMLDivElement>(null);
  const rightKnobRef = useRef<HTMLDivElement>(null);
  const rightWarnRef = useRef<HTMLDivElement>(null);
  const leftBgRef = useRef<HTMLDivElement>(null);
  const leftKnobRef = useRef<HTMLDivElement>(null);
  const leftWarnRef = useRef<HTMLDivElement>(null);
  const bothBgRef = useRef<HTMLDivElement>(null);
  const bothKnobRef = useRef<HTMLDivElement>(null);
  const bothWarnRef = useRef<HTMLDivElement>(null);

  const joys = useMemo(
    () => createGestureJoySet(),
    [],
  );
  const secondaryJoys = useMemo(
    () => createGestureJoySet(),
    [],
  );
  const softenTransJoystickForTouch = (pointerType: string) => {
    if (!disableGestureMode && pointerType === "mouse") return;
    joys.trans.x = softenMobileTransJoystickAxis(joys.trans.x);
    joys.trans.y = softenMobileTransJoystickAxis(joys.trans.y);
  };
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraRestartNonce, setCameraRestartNonce] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [performanceAssetsReady, setPerformanceAssetsReady] = useState(false);
  const [mobileControlLayerStyle, setMobileControlLayerStyle] = useState<CSSProperties | undefined>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const camCanvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const camRafRef = useRef<number | null>(null);
  const handLastSeenAtRef = useRef<number>(0);
  const camCalibRef = useRef<CameraCalibration | null>(null);
  const secondaryCamCalibRef = useRef<CameraCalibration | null>(null);
  const handLandmarkSmoothRef = useRef<HandLm[] | null>(null);
  const secondaryHandLandmarkSmoothRef = useRef<HandLm[] | null>(null);

  const puppetImageCacheRef = useRef(new Map<string, HTMLImageElement>());
  const sceneDecorImageCacheRef = useRef(new Map<string, HTMLImageElement>());

  const getAlignmentLayerForCharacter = (
    characterId: string,
    puppetTransform: typeof DEFAULT_PERFORMANCE_PUPPET_TRANSFORM,
  ): PuppetAlignmentLayer => {
    const rawTransforms =
      performancePartTransformsByCharacterId[characterId] ??
      getDefaultPerformancePartTransformsForCharacter(characterId);
    return {
      puppetSkin: puppetSkinByCharacterId[characterId] ?? emptyPuppetSkinBundle(),
      assemblyTransforms: getPerformancePartTransformsForDraw(characterId, rawTransforms),
      boneMetrics: performanceBonesByCharacterId[characterId],
      controlPoints: performanceControlPointsByCharacterId[characterId] ?? DEFAULT_PERFORMANCE_CONTROL_POINTS,
      puppetTransform,
    };
  };
  const referenceAlignmentLayer: PuppetAlignmentLayer & { nominalY: number } = {
    puppetSkin: referencePuppetSkin,
    assemblyTransforms: referencePerformancePartTransforms,
    boneMetrics: referencePerformanceBones,
    controlPoints: referenceControlPoints,
    puppetTransform: referencePerformancePuppetTransform,
    nominalY: referencePerformancePuppetTransform.y,
  };
  const resolveAlignedBaseY = (
    nominalY: number,
    layer: PuppetAlignmentLayer,
    reference = referenceAlignmentLayer,
  ) =>
    resolvePuppetBottomAlignedBaseY(
      { ...layer, nominalY },
      reference,
      puppetImageCacheRef.current,
    );

  const resetGestureControlState = () => {
    resetGestureJoySet(joys);
    resetGestureJoySet(secondaryJoys);
    camCalibRef.current = null;
    secondaryCamCalibRef.current = null;
    handLandmarkSmoothRef.current = null;
    secondaryHandLandmarkSmoothRef.current = null;
    handLastSeenAtRef.current = 0;
    setHandDetected(false);
    [bodyWarnRef, rightWarnRef, leftWarnRef, bothWarnRef].forEach((ref) => {
      if (!ref.current) return;
      ref.current.classList.add("opacity-0");
      ref.current.classList.remove("opacity-100");
    });
    const pup = puppetRef.current;
    pup.baseX = storeRef.current.puppetTransform.x;
    pup.baseY = resolveAlignedBaseY(storeRef.current.puppetTransform.y, {
      puppetSkin: storeRef.current.puppetSkin,
      assemblyTransforms: storeRef.current.assemblyTransforms,
      boneMetrics: storeRef.current.performanceBones,
      controlPoints: storeRef.current.controlPoints,
      puppetTransform: storeRef.current.puppetTransform,
    }, storeRef.current.referenceAlignmentLayer);
    setCalibrationPose(pup);
    const secondary = storeRef.current.secondaryPuppetTransform;
    const secondaryPup = secondaryPuppetRef.current;
    if (secondary) {
      secondaryPup.baseX = secondary.x;
      secondaryPup.baseY = resolveAlignedBaseY(secondary.y, {
        puppetSkin: storeRef.current.secondaryPuppetSkin ?? emptyPuppetSkinBundle(),
        assemblyTransforms: storeRef.current.secondaryAssemblyTransforms ?? undefined,
        boneMetrics: storeRef.current.secondaryPerformanceBones,
        controlPoints: storeRef.current.secondaryControlPoints ?? undefined,
        puppetTransform: secondary,
      }, storeRef.current.referenceAlignmentLayer);
    }
    setCalibrationPose(secondaryPup);
  };

  const toggleGestureMode = () => {
    if (disableGestureMode) return;
    if (gestureModeEnabled) {
      resetGestureControlState();
      removeSecondaryCharacter();
      setRolePickerOpen(false);
      setGestureModeEnabled(false);
      return;
    }
    resetGestureControlState();
    setCameraReady(false);
    setCameraError(null);
    setHandDetected(false);
    if (storeRef.current.isFlipped) {
      flipPuppet();
    }
    setGestureModeEnabled(true);
  };

  const handleFlipPuppet = () => {
    setRolePickerOpen(false);
    mirrorArmPoseForFacingFlip(puppetRef.current);
    mirrorArmPoseForFacingFlip(secondaryPuppetRef.current);
    mirrorHandControlRingsForFacingFlip(joys);
    mirrorHandControlRingsForFacingFlip(secondaryJoys);
    flipPuppet();
  };

  const addSecondaryCharacter = (characterId: string) => {
    if (characterId === selectedCharacterId) return;
    setSecondaryCharacterId(characterId);
    setRolePickerOpen(false);
    const transform =
      performancePuppetTransformsByCharacterId[characterId] ?? DEFAULT_PERFORMANCE_PUPPET_TRANSFORM;
    const pup = secondaryPuppetRef.current;
    pup.baseX = logicalStage.width - transform.x;
    pup.baseY = resolveAlignedBaseY(
      transform.y,
      getAlignmentLayerForCharacter(characterId, {
        ...transform,
        x: logicalStage.width - transform.x,
      }),
    );
    setCalibrationPose(pup);
    resetGestureJoySet(secondaryJoys);
    secondaryCamCalibRef.current = null;
  };

  const removeSecondaryCharacter = () => {
    setSecondaryCharacterId(null);
    setRolePickerOpen(false);
    resetGestureJoySet(secondaryJoys);
    secondaryCamCalibRef.current = null;
  };

  useEffect(() => {
    if (!disableGestureMode) return;
    resetGestureControlState();
    removeSecondaryCharacter();
    setRolePickerOpen(false);
    setGestureModeEnabled(false);
    setCameraReady(false);
    setCameraError(null);
    setHandDetected(false);
  }, [disableGestureMode]);

  useEffect(() => {
    const cache = sceneDecorImageCacheRef.current;
    PERFORMANCE_SCENE_DECOR_URLS.forEach((url) => {
      if (cache.has(url)) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        cache.set(url, img);
      };
      img.onerror = () => {
        cache.delete(url);
      };
      img.src = url;
    });
  }, []);

  const showPuppetJointMarkers = false;
  const storeRef = useRef({
    sceneItems,
    isFlipped,
    showPerformanceRods,
    puppetSkin: activePuppetSkin,
    assemblyTransforms: activePerformancePartTransforms,
    puppetTransform: activePerformancePuppetTransform,
    performanceBones: activePerformanceBones,
    controlPoints: activeControlPoints,
    secondaryCharacterId,
    secondaryPuppetSkin,
    secondaryAssemblyTransforms: secondaryPerformancePartTransforms,
    secondaryPuppetTransform: secondaryPerformancePuppetTransform,
    secondaryPerformanceBones,
    secondaryControlPoints,
    referenceAlignmentLayer,
    showPuppetJointMarkers: true,
  });
  storeRef.current = {
    sceneItems,
    isFlipped,
    showPerformanceRods,
    puppetSkin: activePuppetSkin,
    assemblyTransforms: activePerformancePartTransforms,
    puppetTransform: activePerformancePuppetTransform,
    performanceBones: activePerformanceBones,
    controlPoints: activeControlPoints,
    secondaryCharacterId,
    secondaryPuppetSkin,
    secondaryAssemblyTransforms: secondaryPerformancePartTransforms,
    secondaryPuppetTransform: secondaryPerformancePuppetTransform,
    secondaryPerformanceBones,
    secondaryControlPoints,
    referenceAlignmentLayer,
    showPuppetJointMarkers,
  };

  useEffect(() => {
    resetGestureControlState();
    if (!gestureModeEnabled) return;
    if (storeRef.current.isFlipped) {
      flipPuppet();
    }
  }, [selectedCharacterId]);

  useEffect(() => {
    if (secondaryCharacterId !== selectedCharacterId) return;
    removeSecondaryCharacter();
  }, [secondaryCharacterId, selectedCharacterId]);

  useEffect(() => {
    if (gestureModeEnabled) return;
    setRolePickerOpen(false);
  }, [gestureModeEnabled]);

  const skinUrlsKey = [
    ...Object.values(referencePuppetSkin.partImages),
    ...Object.values(referencePuppetSkin.rodImages),
    ...Object.values(activePuppetSkin.partImages),
    ...Object.values(activePuppetSkin.rodImages),
    ...(secondaryPuppetSkin ? Object.values(secondaryPuppetSkin.partImages) : []),
    ...(secondaryPuppetSkin ? Object.values(secondaryPuppetSkin.rodImages) : []),
  ]
    .filter((url): url is string => Boolean(url))
    .filter((url, index, urls) => urls.indexOf(url) === index)
    .sort((a, b) => a.localeCompare(b))
    .join("|");

  useEffect(() => {
    let cancelled = false;
    const puppetUrls = skinUrlsKey ? skinUrlsKey.split("|") : [];
    setPerformanceAssetsReady(false);

    Promise.all([
      ...puppetUrls.map((url) => preloadImageToCache(url, puppetImageCacheRef.current)),
      ...PERFORMANCE_SCENE_DECOR_URLS.map((url) =>
        preloadImageToCache(url, sceneDecorImageCacheRef.current),
      ),
    ]).then(() => {
      if (!cancelled) setPerformanceAssetsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [skinUrlsKey]);

  useEffect(() => {
    const { trans, body, right, left, both } = joys;

    const onMove = (e: PointerEvent) => {
      if (trans.active && e.pointerId === trans.pointerId) {
        const r = transBgRef.current?.getBoundingClientRect();
        if (r) {
          diskUpdatePosition(trans, e.clientX, e.clientY, r);
          if (disableGestureMode || e.pointerType !== "mouse") {
            trans.x = softenMobileTransJoystickAxis(trans.x);
            trans.y = softenMobileTransJoystickAxis(trans.y);
          }
        }
      }

      let bodyL: boolean | null = null;
      let rightL: boolean | null = null;
      let leftL: boolean | null = null;
      let bothL: boolean | null = null;

      if (body.active && body.pointerId === e.pointerId) {
        const r = bodyBgRef.current?.getBoundingClientRect();
        if (r) bodyL = ringUpdatePosition(body, e.clientX, e.clientY, r).atLimit;
      }
      if (right.active && right.pointerId === e.pointerId) {
        const r = rightBgRef.current?.getBoundingClientRect();
        if (r) rightL = ringUpdatePosition(right, e.clientX, e.clientY, r).atLimit;
      }
      if (left.active && left.pointerId === e.pointerId) {
        const r = leftBgRef.current?.getBoundingClientRect();
        if (r) leftL = ringUpdatePosition(left, e.clientX, e.clientY, r).atLimit;
      }
      if (both.active && both.pointerId === e.pointerId) {
        const r = bothBgRef.current?.getBoundingClientRect();
        if (r) {
          const ringLimit = ringUpdatePosition(both, e.clientX, e.clientY, r).atLimit;
          const armLimit = limitLinkedHandRingByArmBounds(
            both,
            left,
            right,
          );
          bothL = ringLimit || armLimit;
        }
      }

      setWarnVisible(bodyWarnRef, bodyL);
      setWarnVisible(rightWarnRef, rightL);
      setWarnVisible(leftWarnRef, leftL);
      setWarnVisible(bothWarnRef, bothL);
    };

    const onUp = (e: PointerEvent) => {
      pointerUp(trans, e.pointerId);
      pointerUp(body, e.pointerId);
      pointerUp(right, e.pointerId);
      pointerUp(left, e.pointerId);
      pointerUp(both, e.pointerId);
      [bodyWarnRef, rightWarnRef, leftWarnRef, bothWarnRef].forEach((ref) => {
        if (!ref.current) return;
        ref.current.classList.add("opacity-0");
        ref.current.classList.remove("opacity-100");
      });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [joys, gestureModeEnabled, disableGestureMode]);

  useEffect(() => {
    if (!gestureModeEnabled) return;
    const { trans, body, right, left, both } = joys;
    const timer = window.setInterval(() => {
      if (Date.now() - handLastSeenAtRef.current <= HAND_TIMEOUT_MS) return;
      diskReturnNeutral(trans);
      ringReturnNeutral(body);
      ringReturnNeutral(left);
      ringReturnNeutral(right);
      ringReturnNeutral(both);
      returnGestureJoySetNeutral(secondaryJoys);
      camCalibRef.current = null;
      secondaryCamCalibRef.current = null;
      handLandmarkSmoothRef.current = null;
      secondaryHandLandmarkSmoothRef.current = null;
    }, 60);
    return () => window.clearInterval(timer);
  }, [gestureModeEnabled, joys, secondaryJoys]);

  useEffect(() => {
    if (!gestureModeEnabled || disableGestureMode) {
      setCameraReady(false);
      setCameraError(null);
      setHandDetected(false);
      camCalibRef.current = null;
      secondaryCamCalibRef.current = null;
      handLandmarkSmoothRef.current = null;
      secondaryHandLandmarkSmoothRef.current = null;
      if (camRafRef.current !== null) {
        cancelAnimationFrame(camRafRef.current);
        camRafRef.current = null;
      }
      if (camStreamRef.current) {
        camStreamRef.current.getTracks().forEach((t) => t.stop());
        camStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      handsRef.current?.close();
      handsRef.current = null;
      return;
    }

    const video = videoRef.current;
    const camCanvas = camCanvasRef.current;
    if (!video || !camCanvas) return;

    let disposed = false;
    let videoTrack: MediaStreamTrack | null = null;
    let restartTimer: number | null = null;
    let lastProcessAt = 0;
    let consecutiveSendErrors = 0;

    const requestCameraRestart = (message: string) => {
      if (disposed || restartTimer !== null) return;
      setCameraError(message);
      setCameraReady(false);
      setHandDetected(false);
      restartTimer = window.setTimeout(() => {
        if (!disposed) {
          setCameraRestartNonce((nonce) => nonce + 1);
        }
      }, 900);
    };
    const handleVideoTrackEnded = () => requestCameraRestart(CAMERA_RECONNECTING_MESSAGE);

    let hands: Hands | null = null;

    const measureHand = (lm: HandLm[]) => {
      const wrist = lm[0];
      const idxMcp = lm[5];
      const pinkyMcp = lm[17];
      const palmCenter = { x: (wrist.x + lm[9].x) / 2, y: (wrist.y + lm[9].y) / 2 };
      const palmWid = Math.hypot(pinkyMcp.x - idxMcp.x, pinkyMcp.y - idxMcp.y);
      return {
        palmCenter,
        palmWid,
        thumbDist: Math.hypot(lm[4].x - lm[17].x, lm[4].y - lm[17].y),
        idxDist: Math.hypot(lm[8].x - lm[0].x, lm[8].y - lm[0].y),
        midDist: Math.hypot(lm[12].x - lm[0].x, lm[12].y - lm[0].y),
      };
    };

    const createHandCalibration = (lm: HandLm[]): CameraCalibration => {
      const measure = measureHand(lm);
      return {
        palmCenter0: measure.palmCenter,
        palmWid0: measure.palmWid,
        thumbDist0: measure.thumbDist,
        idxDist0: measure.idxDist,
        midDist0: measure.midDist,
        samples: 1,
        ready: false,
      };
    };

    const updateHandCalibration = (calib: CameraCalibration, lm: HandLm[]) => {
      const measure = measureHand(lm);
      const centerDrift =
        Math.hypot(measure.palmCenter.x - calib.palmCenter0.x, measure.palmCenter.y - calib.palmCenter0.y) /
        Math.max(0.0001, calib.palmWid0);
      if (centerDrift > 0.45) {
        Object.assign(calib, createHandCalibration(lm));
        return false;
      }

      const nextSamples = calib.samples + 1;
      const prevWeight = calib.samples / nextSamples;
      const nextWeight = 1 / nextSamples;
      calib.palmCenter0 = {
        x: calib.palmCenter0.x * prevWeight + measure.palmCenter.x * nextWeight,
        y: calib.palmCenter0.y * prevWeight + measure.palmCenter.y * nextWeight,
      };
      calib.palmWid0 = calib.palmWid0 * prevWeight + measure.palmWid * nextWeight;
      calib.thumbDist0 = calib.thumbDist0 * prevWeight + measure.thumbDist * nextWeight;
      calib.idxDist0 = calib.idxDist0 * prevWeight + measure.idxDist * nextWeight;
      calib.midDist0 = calib.midDist0 * prevWeight + measure.midDist * nextWeight;
      calib.samples = nextSamples;
      calib.ready = nextSamples >= GESTURE_CALIBRATION_FRAMES;
      return calib.ready;
    };

    const processGestures = (
      lm: HandLm[],
      targetJoys: GestureJoySet,
      calibRef: MutableRefObject<CameraCalibration | null>,
      smoothRef: MutableRefObject<HandLm[] | null>,
      direction = 1,
      bodyDirection = direction,
    ) => {
      const smoothLm = smoothHandLandmarks(smoothRef, lm);
      const measure = measureHand(smoothLm);
      const moveInput = cameraPositionToDiskInput(measure.palmCenter);
      setDiskCameraInput(targetJoys.trans, moveInput.x, moveInput.y);

      const calib = calibRef.current;
      if (!calib) {
        calibRef.current = createHandCalibration(smoothLm);
        returnGestureActionControlsNeutral(targetJoys);
        return;
      }
      if (!calib.ready && !updateHandCalibration(calib, smoothLm)) {
        returnGestureActionControlsNeutral(targetJoys);
        return;
      }

      const thumbAction = fingerActionFromDistance(
        measure.thumbDist,
        calib.thumbDist0,
        THUMB_BODY_DEADZONE,
        THUMB_BODY_RANGE,
      );
      const idxAction = fingerActionFromDistance(measure.idxDist, calib.idxDist0);
      const midAction = fingerActionFromDistance(measure.midDist, calib.midDist0);

      setBodyGestureLinear(targetJoys.body, thumbAction, bodyDirection);

      const isSync = Math.abs(idxAction - midAction) < 0.15;
      if (isSync && (idxAction > 0 || midAction > 0)) {
        const bothAction = (idxAction + midAction) / 2;
        const bothTheta = -bothAction * Math.PI * 0.85 * direction;
        // Keep gesture direction consistent with the touch rings.
        setRingCameraInput(targetJoys.both, Math.sin(bothTheta), Math.cos(bothTheta));
        ringReturnNeutral(targetJoys.left);
        ringReturnNeutral(targetJoys.right);
      } else {
        ringReturnNeutral(targetJoys.both);
        if (idxAction > 0) {
          const theta = -idxAction * Math.PI * 0.85 * direction;
          setRingCameraInput(targetJoys.left, Math.sin(theta), Math.cos(theta));
        } else {
          ringReturnNeutral(targetJoys.left);
        }
        if (midAction > 0) {
          const theta = -midAction * Math.PI * 0.85 * direction;
          setRingCameraInput(targetJoys.right, Math.sin(theta), Math.cos(theta));
        } else {
          ringReturnNeutral(targetJoys.right);
        }
      }
    };

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError(CAMERA_UNAVAILABLE_MESSAGE);
          setCameraReady(false);
          setHandDetected(false);
          return;
        }
        if (!hands) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });
        if (disposed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        videoTrack = stream.getVideoTracks()[0] ?? null;
        videoTrack?.addEventListener("ended", handleVideoTrackEnded);
        camStreamRef.current = stream;
        video.srcObject = stream;
        await video.play();
        if (disposed) return;
        setCameraReady(true);
        setCameraError(null);

        const tick = async () => {
          if (disposed) return;
          if (!stream.active || videoTrack?.readyState === "ended") {
            requestCameraRestart(CAMERA_RECONNECTING_MESSAGE);
            return;
          }
          if (video.readyState < 2) {
            camRafRef.current = requestAnimationFrame(tick);
            return;
          }
          const now = performance.now();
          if (now - lastProcessAt < GESTURE_PROCESS_INTERVAL_MS) {
            camRafRef.current = requestAnimationFrame(tick);
            return;
          }
          lastProcessAt = now;
          try {
            const activeHands = handsRef.current;
            if (!activeHands) return;
            await activeHands.send({ image: video });
            consecutiveSendErrors = 0;
            setCameraError(null);
            setCameraReady(true);
          } catch (err) {
            consecutiveSendErrors += 1;
            if (consecutiveSendErrors >= GESTURE_SEND_ERROR_LIMIT) {
              requestCameraRestart(GESTURE_PROCESSING_MESSAGE);
              return;
            }
          }
          camRafRef.current = requestAnimationFrame(tick);
        };
        camRafRef.current = requestAnimationFrame(tick);
      } catch (err: unknown) {
        if (disposed) return;
        setCameraError(getCameraStartErrorMessage(err));
        setCameraReady(false);
        setHandDetected(false);
      }
    };

    void loadMediapipeHands()
      .then((mediapipe) => {
        if (disposed) return;

        hands = new mediapipe.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        handsRef.current = hands;
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        hands.onResults((results) => {
          const ctx = camCanvas.getContext("2d");
          if (!ctx) return;
          ctx.clearRect(0, 0, camCanvas.width, camCanvas.height);
          ctx.save();
          // Mirror the camera preview so screen-side hand selection matches the canvas.
          ctx.translate(camCanvas.width, 0);
          ctx.scale(-1, 1);
          if (results.multiHandLandmarks?.length) {
            setHandDetected(true);
            handLastSeenAtRef.current = Date.now();
            const handsByScreenX = results.multiHandLandmarks
              .map((rawLm) => {
                mediapipe.drawConnectors(ctx, rawLm, mediapipe.HAND_CONNECTIONS, {
                  color: "#00FF00",
                  lineWidth: CAMERA_HAND_DRAW_STYLE.connectorWidth,
                });
                mediapipe.drawLandmarks(ctx, rawLm, {
                  color: "#FF0000",
                  lineWidth: CAMERA_HAND_DRAW_STYLE.landmarkWidth,
                  radius: CAMERA_HAND_DRAW_STYLE.landmarkRadius,
                });
                const mirrored = rawLm.map((p) => ({ x: 1 - p.x, y: p.y }));
                const centerX = mirrored.reduce((sum, p) => sum + p.x, 0) / mirrored.length;
                return { mirrored, centerX };
              })
              .sort((a, b) => b.centerX - a.centerX);
            processGestures(handsByScreenX[0].mirrored, joys, camCalibRef, handLandmarkSmoothRef, 1, -1);
            if (storeRef.current.secondaryCharacterId && handsByScreenX[1]) {
              processGestures(
                handsByScreenX[1].mirrored,
                secondaryJoys,
                secondaryCamCalibRef,
                secondaryHandLandmarkSmoothRef,
                -1,
                1,
              );
            } else {
              returnGestureJoySetNeutral(secondaryJoys);
              secondaryCamCalibRef.current = null;
              secondaryHandLandmarkSmoothRef.current = null;
            }
          } else {
            setHandDetected(false);
            returnGestureJoySetNeutral(secondaryJoys);
            handLandmarkSmoothRef.current = null;
            secondaryHandLandmarkSmoothRef.current = null;
          }
          ctx.restore();
        });

        void start();
      })
      .catch((err: unknown) => {
        if (disposed) return;
        console.error("MediaPipe Hands 加载失败:", err);
        setCameraError("手势库加载失败，请检查网络后刷新页面重试。");
        setCameraReady(false);
        setHandDetected(false);
      });

    return () => {
      disposed = true;
      setCameraReady(false);
      setHandDetected(false);
      camCalibRef.current = null;
      secondaryCamCalibRef.current = null;
      handLandmarkSmoothRef.current = null;
      secondaryHandLandmarkSmoothRef.current = null;
      if (restartTimer !== null) {
        window.clearTimeout(restartTimer);
        restartTimer = null;
      }
      if (camRafRef.current !== null) {
        cancelAnimationFrame(camRafRef.current);
        camRafRef.current = null;
      }
      videoTrack?.removeEventListener("ended", handleVideoTrackEnded);
      if (camStreamRef.current) {
        camStreamRef.current.getTracks().forEach((t) => t.stop());
        camStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      hands?.close();
      handsRef.current = null;
    };
  }, [gestureModeEnabled, disableGestureMode, cameraRestartNonce, joys, secondaryJoys]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const pup = puppetRef.current;
      // Keep coordinates in the same logical stage space used by the canvas renderer.
      syncPuppetBase(
        pup,
        storeRef.current.puppetTransform.x,
        resolvePuppetBottomAlignedBaseY(
          {
            puppetSkin: storeRef.current.puppetSkin,
            assemblyTransforms: storeRef.current.assemblyTransforms,
            boneMetrics: storeRef.current.performanceBones,
            controlPoints: storeRef.current.controlPoints,
            puppetTransform: storeRef.current.puppetTransform,
            nominalY: storeRef.current.puppetTransform.y,
          },
          storeRef.current.referenceAlignmentLayer,
          puppetImageCacheRef.current,
        ),
      );
      const secondary = storeRef.current.secondaryPuppetTransform;
      if (secondary) {
        syncPuppetBase(
          secondaryPuppetRef.current,
          secondary.x,
          resolvePuppetBottomAlignedBaseY(
            {
              puppetSkin: storeRef.current.secondaryPuppetSkin ?? emptyPuppetSkinBundle(),
              assemblyTransforms: storeRef.current.secondaryAssemblyTransforms ?? undefined,
              boneMetrics: storeRef.current.secondaryPerformanceBones,
              controlPoints: storeRef.current.secondaryControlPoints ?? undefined,
              puppetTransform: secondary,
              nominalY: secondary.y,
            },
            storeRef.current.referenceAlignmentLayer,
            puppetImageCacheRef.current,
          ),
        );
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const updateMobileControlLayerStyle = () => {
      const wrap = wrapRef.current;
      const useWideMobileControlLayout =
        window.innerWidth > window.innerHeight &&
        window.innerHeight <= 620 &&
        window.innerWidth >= 700;
      if (!wrap || !useWideMobileControlLayout) {
        setMobileControlLayerStyle(undefined);
        return;
      }

      const rect = wrap.getBoundingClientRect();
      const screenEdgePx = clamp(
        window.innerWidth * MOBILE_CONTROL_SCREEN_EDGE_RATIO,
        MOBILE_CONTROL_SCREEN_EDGE_MIN_PX,
        MOBILE_CONTROL_SCREEN_EDGE_MAX_PX,
      );
      setMobileControlLayerStyle({
        left: `${Math.round(screenEdgePx - rect.left)}px`,
        right: `${Math.round(screenEdgePx - (window.innerWidth - rect.right))}px`,
        paddingLeft: 0,
        paddingRight: 0,
      });
    };

    updateMobileControlLayerStyle();
    window.addEventListener("resize", updateMobileControlLayerStyle);
    window.addEventListener("orientationchange", updateMobileControlLayerStyle);
    const ro = new ResizeObserver(updateMobileControlLayerStyle);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => {
      window.removeEventListener("resize", updateMobileControlLayerStyle);
      window.removeEventListener("orientationchange", updateMobileControlLayerStyle);
      ro.disconnect();
    };
  }, [disableGestureMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!performanceAssetsReady) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const { trans, body, right, left, both } = joys;
    let raf = 0;

    const loop = () => {
      const wrap = wrapRef.current;
      if (!wrap) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const facing = storeRef.current.isFlipped ? -1 : 1;
      const secondaryFacing = -facing;
      syncPuppetBase(
        puppetRef.current,
        storeRef.current.puppetTransform.x,
        resolvePuppetBottomAlignedBaseY(
          {
            puppetSkin: storeRef.current.puppetSkin,
            assemblyTransforms: storeRef.current.assemblyTransforms,
            boneMetrics: storeRef.current.performanceBones,
            controlPoints: storeRef.current.controlPoints,
            puppetTransform: storeRef.current.puppetTransform,
            nominalY: storeRef.current.puppetTransform.y,
          },
          storeRef.current.referenceAlignmentLayer,
          puppetImageCacheRef.current,
        ),
      );
      const secondaryTransform = storeRef.current.secondaryPuppetTransform;
      if (secondaryTransform) {
        syncPuppetBase(
          secondaryPuppetRef.current,
          secondaryTransform.x,
          resolvePuppetBottomAlignedBaseY(
            {
              puppetSkin: storeRef.current.secondaryPuppetSkin ?? emptyPuppetSkinBundle(),
              assemblyTransforms: storeRef.current.secondaryAssemblyTransforms ?? undefined,
              boneMetrics: storeRef.current.secondaryPerformanceBones,
              controlPoints: storeRef.current.secondaryControlPoints ?? undefined,
              puppetTransform: secondaryTransform,
              nominalY: secondaryTransform.y,
            },
            storeRef.current.referenceAlignmentLayer,
            puppetImageCacheRef.current,
          ),
        );
      }
      updateHtmlKinematics(
        puppetRef.current,
        trans,
        body,
        right,
        left,
        both,
        facing,
        logicalStage.width,
        logicalStage.height,
        1,
      );
      if (storeRef.current.secondaryCharacterId) {
        updateHtmlKinematics(
          secondaryPuppetRef.current,
          secondaryJoys.trans,
          secondaryJoys.body,
          secondaryJoys.right,
          secondaryJoys.left,
          secondaryJoys.both,
          secondaryFacing,
          logicalStage.width,
          logicalStage.height,
          1,
        );
      }
      const extraPuppetLayers: PerformancePuppetCanvasLayer[] =
        storeRef.current.secondaryCharacterId &&
        storeRef.current.secondaryPuppetSkin &&
        storeRef.current.secondaryAssemblyTransforms
          ? [
              {
                puppet: secondaryPuppetRef.current,
                facingDir: secondaryFacing,
                puppetSkin: storeRef.current.secondaryPuppetSkin,
                showRods: storeRef.current.showPerformanceRods,
                assemblyTransforms: storeRef.current.secondaryAssemblyTransforms,
                boneMetrics: storeRef.current.secondaryPerformanceBones,
                controlPoints: storeRef.current.secondaryControlPoints ?? undefined,
                rigOverlay: null,
                puppetTransform: secondaryTransform ?? undefined,
                showPuppetJointMarkers: storeRef.current.showPuppetJointMarkers,
              },
            ]
          : [];
      paintPerformanceCanvas(
        ctx,
        w,
        h,
        dpr,
        storeRef.current.sceneItems,
        puppetRef.current,
        facing,
        storeRef.current.puppetSkin,
        puppetImageCacheRef.current,
        storeRef.current.showPerformanceRods,
        storeRef.current.assemblyTransforms,
        storeRef.current.performanceBones,
        storeRef.current.controlPoints,
        null,
        storeRef.current.puppetTransform,
        storeRef.current.showPuppetJointMarkers,
        sceneDecorImageCacheRef.current,
        extraPuppetLayers,
      );

      applyKnobStyleFromElements(transKnobRef.current, transBgRef.current, trans);
      applyKnobStyleFromElements(bodyKnobRef.current, bodyBgRef.current, body);
      applyLinkedRingKnobStyleFromElements(rightKnobRef.current, rightBgRef.current, right, both);
      applyLinkedRingKnobStyleFromElements(leftKnobRef.current, leftBgRef.current, left, both);
      applyKnobStyleFromElements(bothKnobRef.current, bothBgRef.current, both);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [joys, secondaryJoys, performanceAssetsReady]);

  const onTransDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (gestureModeEnabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (!diskPointerDown(joys.trans, e.clientX, e.clientY, r, e.pointerId)) return;
    softenTransJoystickForTouch(e.pointerType);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const ringDown = (joy: (typeof joys)["body"]) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (gestureModeEnabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (!ringPointerDown(joy, e.clientX, e.clientY, r, e.pointerId)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handleCaptureClick = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageDataUrl = canvas.toDataURL("image/png");
    onCapture(imageDataUrl);
  };

  const secondaryCharacterName =
    secondaryCharacterId
      ? characterCards.find((card) => card.id === secondaryCharacterId)?.name ?? "第二角色"
      : null;

  return (
    <StageFrame className="h-full w-full !overflow-visible">
      <div ref={wrapRef} className="performance-stage-wrap relative h-full w-full overflow-visible">
        <canvas
          ref={canvasRef}
          className={[
            "absolute inset-0 block h-full w-full touch-none",
            performanceAssetsReady ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
        {!gestureModeEnabled ? (
          <div
            className={[
              "performance-control-layer pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end pl-0 pr-2 pb-3 pt-8 sm:pr-3 sm:pb-4",
              disableGestureMode ? "performance-control-layer-mobile" : "",
            ].join(" ")}
            style={mobileControlLayerStyle}
          >
            <div className="performance-control-row pointer-events-auto flex w-full min-w-0 flex-wrap items-end justify-between gap-y-4 gap-x-2">
            {/* 左侧：翻转和整体移动；旁边为身体环。 */}
            <div className="performance-left-controls relative flex min-w-0 shrink-0 flex-wrap items-end gap-3 overflow-visible sm:gap-5 md:gap-6">
              <div className="performance-control-group relative flex shrink-0 flex-col items-center gap-2 overflow-visible sm:gap-3">
                <IconButton
                  type="button"
                  onClick={handleFlipPuppet}
                  className="performance-flip-button pointer-events-auto absolute bottom-[calc(100%+50px)] left-[-20px] z-30 h-[clamp(4.5rem,6vw,5.75rem)] w-[clamp(4.5rem,6vw,5.75rem)]"
                  aria-label="翻转皮影"
                  title="翻转皮影"
                >
                  <FlipHorizontal2 size={18} />
                </IconButton>
                <div className="performance-control-group flex shrink-0 flex-col items-center">
                  <div
                    ref={transBgRef}
                    className="performance-ring performance-ring-large relative mb-2 flex h-[120px] w-[120px] shrink-0 touch-none items-center justify-center rounded-full border-2 border-[#f0b555] bg-[radial-gradient(circle_at_center,_rgba(221,156,111,0.7)_0%,_rgba(129,74,35,0.78)_58%,_rgba(69,34,10,0.96)_100%)] shadow-[inset_0_0_0_2px_rgba(240,181,85,0.55),inset_0_0_16px_rgba(34,14,5,0.72),0_5px_15px_rgba(0,0,0,0.5)]"
                    onPointerDown={onTransDown}
                  >
                    <div
                      ref={transKnobRef}
                      className={`${CONTROL_KNOB_CLASS} performance-knob`}
                    />
                  </div>
                  <div className="performance-control-label performance-primary-control-label whitespace-nowrap text-center font-display text-[#65341d]">
                    整体移动
                  </div>
                </div>
              </div>

              <div className="performance-control-group flex shrink-0 flex-col items-center">
                <div
                  ref={bodyWarnRef}
                  className={`${CONTROL_LIMIT_WARN_CLASS} performance-limit-warn`}
                >
                  角度极限
                </div>
                <div
                  ref={bodyBgRef}
                  className="performance-ring performance-ring-body relative mb-2 box-border flex h-[110px] w-[110px] shrink-0 touch-none items-center justify-center rounded-full bg-transparent shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
                  onPointerDown={ringDown(joys.body)}
                >
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={ringGradientStyle(150)} />
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={ringOuterGoldStrokeStyle(150)} />
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={ringInnerGoldStrokeStyle(150)} />
                  <div
                    ref={bodyKnobRef}
                    className={`${CONTROL_KNOB_CLASS} performance-knob`}
                  />
                </div>
                <div className="performance-control-label performance-primary-control-label whitespace-nowrap text-center font-display text-[#65341d]">
                  身体操控
                </div>
              </div>
            </div>

            {/* 右侧：三组手臂控制和双手联动。 */}
            <div className="performance-right-controls relative flex shrink-0 flex-wrap items-end justify-end gap-3 sm:gap-4 md:gap-5">
              <div className="performance-control-group performance-right-rear absolute bottom-[162px] right-[40px] z-10 sm:bottom-[166px] sm:right-[36px] md:bottom-[170px] md:right-[40px]">
                <div
                  ref={rightWarnRef}
                  className={`${CONTROL_LIMIT_WARN_CLASS} performance-limit-warn`}
                >
                  角度极限
                </div>
                <div
                  ref={rightBgRef}
                  className="performance-ring performance-ring-hand relative mb-2 box-border flex h-[100px] w-[100px] shrink-0 touch-none items-center justify-center rounded-full bg-transparent shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
                  onPointerDown={ringDown(joys.right)}
                >
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={ringGradientStyle(-30)} />
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={ringOuterGoldStrokeStyle(-30)} />
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={ringInnerGoldStrokeStyle(-30)} />
                  <div
                    ref={rightKnobRef}
                    className={`${CONTROL_KNOB_CLASS} performance-knob`}
                  />
                </div>
                <div className="performance-control-label performance-primary-control-label whitespace-nowrap text-center font-display text-[#65341d]">后臂操控</div>
              </div>

              <div className="performance-control-group flex flex-col items-center">
                <div
                  ref={leftWarnRef}
                  className={`${CONTROL_LIMIT_WARN_CLASS} performance-limit-warn`}
                >
                  角度极限
                </div>
                <div
                  ref={leftBgRef}
                  className="performance-ring performance-ring-hand relative mb-2 box-border flex h-[100px] w-[100px] shrink-0 touch-none items-center justify-center rounded-full bg-transparent shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
                  onPointerDown={ringDown(joys.left)}
                >
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={ringGradientStyle(-30)} />
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={ringOuterGoldStrokeStyle(-30)} />
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={ringInnerGoldStrokeStyle(-30)} />
                  <div
                    ref={leftKnobRef}
                    className={`${CONTROL_KNOB_CLASS} performance-knob`}
                  />
                </div>
                <div className="performance-control-label performance-primary-control-label whitespace-nowrap text-center font-display text-[#65341d]">前臂操控</div>
              </div>

              <div className="performance-control-group flex flex-col items-center">
                <div
                  ref={bothWarnRef}
                  className={`${CONTROL_LIMIT_WARN_CLASS} performance-limit-warn`}
                >
                  角度极限
                </div>
                <div
                  ref={bothBgRef}
                  className="performance-ring performance-ring-large relative mb-2 box-border flex h-[120px] w-[120px] shrink-0 touch-none items-center justify-center rounded-full bg-transparent shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
                  onPointerDown={ringDown(joys.both)}
                >
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={ringGradientStyle(-30)} />
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={ringOuterGoldStrokeStyle(-30)} />
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={ringInnerGoldStrokeStyle(-30)} />
                  <div
                    ref={bothKnobRef}
                    className={`${CONTROL_KNOB_CLASS} performance-knob`}
                  />
                </div>
                <div className="performance-control-label performance-primary-control-label whitespace-nowrap text-center font-display text-[#65341d]">双臂联动</div>
              </div>
            </div>
            </div>
          </div>
        ) : (
          <div className="pointer-events-auto absolute bottom-2 left-2 z-20 w-[min(27.6vw,22.2rem)] min-w-[14.4rem]">
            <img
              src="/assets/images/ui/gesture-mode-guide.png"
              alt=""
              draggable={false}
              className="pointer-events-none block h-auto w-full select-none"
            />
            <div className="absolute left-[8%] right-[8%] top-[27%] bottom-[12%] flex items-center gap-[3%]">
              <canvas
                ref={camCanvasRef}
                width={CAMERA_PREVIEW_DRAW_SIZE.width}
                height={CAMERA_PREVIEW_DRAW_SIZE.height}
                className="h-[72%] w-[34%] rounded-[10px] bg-transparent object-contain"
              />
              <div className="performance-gesture-help-text flex min-w-0 flex-1 flex-col gap-1 font-display text-[#9b4725] drop-shadow-[0_1px_0_rgba(255,238,184,0.8)]">
                <div>手掌平移：移动位置</div>
                <div>拇指弯曲：身体俯仰</div>
                <div>食指/中指弯曲：双臂控制</div>
                <div className="performance-camera-status-text mt-1 text-[#b86633] drop-shadow-none">
                  {cameraError ?? (cameraReady ? "摄像头已连接" : "正在连接摄像头...")}
                </div>
                <div className="performance-camera-status-text text-[#b86633]/85 drop-shadow-none">
                  {handDetected ? "已检测到手势" : "未检测到手势"}
                </div>
              </div>
            </div>
            <video ref={videoRef} className="hidden" autoPlay playsInline />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,_transparent,_rgba(115,60,37,0.12))]" />
        <div className="performance-left-actions pointer-events-auto absolute left-0 top-8 z-20">
          <div className="flex flex-col items-start gap-2">
            <IconButton
              type="button"
              onClick={
                gestureModeEnabled
                  ? secondaryCharacterId
                    ? removeSecondaryCharacter
                    : () => setRolePickerOpen((v) => !v)
                  : handleCaptureClick
              }
              className={
                gestureModeEnabled
                  ? secondaryCharacterId
                    ? TOP_LEFT_ACTION_BUTTON_CLASS
                    : TOP_LEFT_ACTION_BUTTON_CLASS
                  : TOP_LEFT_ACTION_BUTTON_CLASS
              }
              aria-label={gestureModeEnabled ? (secondaryCharacterId ? "删除角色" : "添加角色") : "拍照"}
              title={gestureModeEnabled ? (secondaryCharacterId ? "删除角色" : "添加角色") : "拍照"}
            >
              {gestureModeEnabled ? (
                secondaryCharacterId ? null : <Plus size={30} />
              ) : (
                <CameraIcon size={18} />
              )}
            </IconButton>
          </div>
          {gestureModeEnabled && rolePickerOpen && !secondaryCharacterId ? (
            <div
              className="absolute left-0 w-[min(27.6vw,22.2rem)] min-w-[14.4rem]"
              style={{ top: "calc(clamp(4.5rem, 6vw, 5.75rem) - 18px)" }}
            >
              <img
                src="/assets/images/ui/add-secondary-puppet.png"
                alt=""
                draggable={false}
                className="pointer-events-none block h-auto w-full select-none"
              />
              <div className="absolute inset-0">
                {characterCards
                  .filter((card) => card.id !== selectedCharacterId)
                  .map((card, index) => {
                    const slot = SECOND_PUPPET_PICKER_SLOTS[index] ?? SECOND_PUPPET_PICKER_SLOTS[0];
                    const bundle = puppetSkinByCharacterId[card.id] ?? emptyPuppetSkinBundle();
                    const thumbSrc = bundle.fullReferenceUrl ?? characterCardStaticThumb[card.id] ?? null;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => addSecondaryCharacter(card.id)}
                        aria-label="添加角色"
                        className="absolute flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-[8%] bg-transparent p-[3%] transition hover:-translate-y-1 hover:brightness-105"
                        style={{
                          left: `${slot.xPct}%`,
                          top: `${slot.yPct}%`,
                          width: `${slot.widthPct}%`,
                          height: `${slot.heightPct}%`,
                        }}
                      >
                        <span className="flex h-full w-full shrink-0 items-center justify-center overflow-hidden rounded-[7%] bg-transparent">
                          {thumbSrc ? (
                            <img
                              src={thumbSrc}
                              alt=""
                              draggable={false}
                              className="h-auto object-contain object-center"
                              style={{
                                width: `${slot.imageBoxPct}%`,
                                transform: `translate(${slot.imageTranslateXPct}%, ${slot.imageTranslateYPct}%) scaleX(-1) scale(${slot.imageScale})`,
                                transformOrigin: "center center",
                              }}
                            />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ) : null}
        </div>
        <div className="performance-right-actions pointer-events-auto absolute right-0 top-8 z-20">
          <div className="flex items-start gap-2">
            {!disableGestureMode ? (
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  role="switch"
                  aria-checked={gestureModeEnabled}
                  onClick={toggleGestureMode}
                  className={[
                    "performance-gesture-switch relative h-[clamp(3rem,3.5vw,3.7rem)] w-[clamp(9.6rem,11.2vw,11.9rem)] bg-transparent p-0 transition enabled:hover:brightness-110 enabled:active:scale-95",
                    gestureModeEnabled ? "scale-95 brightness-110 drop-shadow-[0_0_12px_rgba(230,191,116,0.75)]" : "",
                  ].join(" ")}
                  aria-label={gestureModeEnabled ? "关闭手势操控模式" : "开启手势操控模式"}
                  title={gestureModeEnabled ? "关闭手势操控模式" : "开启手势操控模式"}
                >
                  <img
                    src="/assets/images/ui/gesture-mode-button.png"
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
                  />
                  <span className="sr-only">{gestureModeEnabled ? "关闭手势操控模式" : "开启手势操控模式"}</span>
                </button>
                <div className="text-[0.7em] text-[#7a3f22]">注：需要开启摄像头</div>
              </div>
            ) : null}
            <button
              type="button"
              role="switch"
              aria-checked={showPerformanceRods}
              onClick={togglePerformanceRods}
              className="performance-rods-switch relative aspect-[724/230] h-[clamp(3rem,3.5vw,3.7rem)] overflow-hidden bg-transparent p-0 transition enabled:hover:brightness-110 enabled:active:scale-95"
              aria-label={showPerformanceRods ? "隐藏操杆" : "显示操杆"}
              title={showPerformanceRods ? "隐藏操杆" : "显示操杆"}
            >
              <img
                src={
                  showPerformanceRods
                    ? "/assets/images/ui/rods-toggle-on.png"
                    : "/assets/images/ui/rods-toggle-off.png"
                }
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-0 top-0 w-full select-none"
                style={{
                  height: showPerformanceRods ? "100.435%" : "105.652%",
                }}
              />
              <span className="sr-only">{showPerformanceRods ? "隐藏操杆" : "显示操杆"}</span>
            </button>
          </div>
        </div>
      </div>
    </StageFrame>
  );
}
