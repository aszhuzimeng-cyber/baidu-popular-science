import type { AssemblyPartTransform, AssemblyPartTransforms } from "../types/assembly";
import type { PuppetPartId, Vec2 } from "../types/puppet";
import type { PuppetRigWorldPoints } from "../performance/canvas/assemblyRigWorld";
import { assemblyPartOrder } from "./puppetConfig";

/**
 * 「在散件图（托盘裁切框）内的归一化孔位 + 叠压 z」。
 * 幕上吸附目标由 `computePuppetRigWorldPoints` 的关节孔位确定，与虚线框中心、外接盒无关。
 */
export type PartAssemblyDef = {
  anchorNorm: { u: number; v: number };
  zIndex: number;
};

export const partAssembly: Record<PuppetPartId, PartAssemblyDef> = {
  head: { anchorNorm: { u: 0.5, v: 0.94 }, zIndex: 80 },
  torso: { anchorNorm: { u: 0.5, v: 0.1 }, zIndex: 32 },
  pelvis: { anchorNorm: { u: 0.5, v: 0.08 }, zIndex: 24 },
  leftUpperArm: { anchorNorm: { u: 0.2, v: 0.12 }, zIndex: 45 },
  /** 肘在片内靠躯干侧：左小臂 u 偏大、右小臂 u 偏小（勿与左右大臂都用 0.5，否则孔位点相对中心不偏） */
  leftForearm: { anchorNorm: { u: 0.78, v: 0.12 }, zIndex: 50 },
  rightUpperArm: { anchorNorm: { u: 0.8, v: 0.12 }, zIndex: 45 },
  rightForearm: { anchorNorm: { u: 0.22, v: 0.12 }, zIndex: 50 },
  leftLeg: { anchorNorm: { u: 0.5, v: 0.1 }, zIndex: 12 },
  rightLeg: { anchorNorm: { u: 0.5, v: 0.1 }, zIndex: 12 },
};

/** @deprecated 孔位目标应使用 buildAnchorTargetMapFromRig，勿用外接框推导 */
export const anchorTargetFromPartLayout = (
  layout: { x: number; y: number; width: number; height: number },
  norm: { u: number; v: number },
): Vec2 => ({
  x: layout.x + (norm.u - 0.5) * layout.width,
  y: layout.y + (norm.v - 0.5) * layout.height,
});

/**
 * 手调/固化表：以部件中心在舞台归一化坐标 (x,y) 为吸附目标（与 AssemblyManualComposite 的 translate(-50%,-50%) 一致）
 */
export const buildAnchorTargetMapFromTuned = (
  transforms: AssemblyPartTransforms,
  width: number,
  height: number,
): Record<PuppetPartId, Vec2> => {
  const acc = {} as Record<PuppetPartId, Vec2>;
  assemblyPartOrder.forEach((id) => {
    const t = transforms[id];
    if (!t) return;
    acc[id] = { x: t.x * width, y: t.y * height };
  });
  return acc;
};

/** 与散件外接框内「中心点」配合：吸附时以卡框中心对准目标（与手调位姿表一致时应用） */
export const getPartSnapCenterInPiecePx = (width: number, height: number): Vec2 => ({
  x: width * 0.5,
  y: height * 0.5,
});

/** 部件孔位吸附到完整皮影关节（与 drawPuppet2d 变换链一致） */
export const buildAnchorTargetMapFromRig = (rig: PuppetRigWorldPoints): Record<PuppetPartId, Vec2> => ({
  head: rig.neck,
  torso: rig.neck,
  pelvis: rig.pelvisTop,
  leftUpperArm: rig.leftShoulder,
  leftForearm: rig.leftElbow,
  rightUpperArm: rig.rightShoulder,
  rightForearm: rig.rightElbow,
  leftLeg: rig.leftHip,
  rightLeg: rig.rightHip,
});

export const getPartAnchorInPiecePx = (
  partId: PuppetPartId,
  width: number,
  height: number,
): Vec2 => {
  const d = partAssembly[partId];
  return { x: d.anchorNorm.u * width, y: d.anchorNorm.v * height };
};

/** 片内任意点（与散件外接框中心对齐）到幕布像素 */
export const partImagePointToStagePixel = (
  pLocal: Vec2,
  pieceW: number,
  pieceH: number,
  stageW: number,
  stageH: number,
  t: AssemblyPartTransform,
): Vec2 => {
  const cp = getPartSnapCenterInPiecePx(pieceW, pieceH);
  const ldx = (pLocal.x - cp.x) * t.scale;
  const ldy = (pLocal.y - cp.y) * t.scale;
  const rad = (t.rotationDeg * Math.PI) / 180;
  const co = Math.cos(rad);
  const si = Math.sin(rad);
  const cx = t.x * stageW;
  const cy = t.y * stageH;
  return {
    x: cx + ldx * co - ldy * si,
    y: cy + ldx * si + ldy * co,
  };
};

/**
 * 由手调中心 + 片内 `partAssembly.anchorNorm` 得到**关节/孔位**在幕布上的像素（与放置参考、吸附一致）。
 * 吸附仍用 `buildAnchorTargetMapFromTuned` 的**中心**；此处仅将骨骼点从「卡框中心」挪到片内孔位，避免四臂上左右臂相对身体「外撇」的错觉。
 */
export const stageJointPixelFromTunedCenter = (
  partId: PuppetPartId,
  pieceW: number,
  pieceH: number,
  stageW: number,
  stageH: number,
  t: AssemblyPartTransform,
): Vec2 =>
  partImagePointToStagePixel(
    getPartAnchorInPiecePx(partId, pieceW, pieceH),
    pieceW,
    pieceH,
    stageW,
    stageH,
    t,
  );

/**
 * 小臂远端（与肘孔相对，近似腕/手）用于叠操作杆；与手调外接框 + 位姿一致。
 */
export const forearmHandTipPixel = (
  partId: "leftForearm" | "rightForearm",
  pieceW: number,
  pieceH: number,
  stageW: number,
  stageH: number,
  t: AssemblyPartTransform,
): Vec2 => {
  const ap = getPartAnchorInPiecePx(partId, pieceW, pieceH);
  const cp = getPartSnapCenterInPiecePx(pieceW, pieceH);
  return partImagePointToStagePixel(
    { x: 2 * cp.x - ap.x, y: 2 * cp.y - ap.y },
    pieceW,
    pieceH,
    stageW,
    stageH,
    t,
  );
};

/** 幕上/拼接已放置区：自后向前绘制 */
export const getZOrderedPartIds = (): PuppetPartId[] =>
  [...assemblyPartOrder].sort(
    (a, b) => partAssembly[a].zIndex - partAssembly[b].zIndex,
  );

export const buildAnchorTargetMapFromPartLayouts = (
  layouts: Array<{
    id: PuppetPartId;
    x: number;
    y: number;
    width: number;
    height: number;
  }>,
): Record<PuppetPartId, Vec2> => {
  const acc = {} as Record<PuppetPartId, Vec2>;
  layouts.forEach((L) => {
    acc[L.id] = anchorTargetFromPartLayout(L, partAssembly[L.id].anchorNorm);
  });
  return acc;
};
