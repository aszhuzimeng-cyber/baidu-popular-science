import type { PuppetPartId } from "../../types/puppet";
import type { PuppetRodSkinId, PuppetSkinBundle } from "../../types/puppetSkin";
import { partAssembly } from "../../data/assemblyLayout";
import type { AssemblyPartTransforms } from "../../types/assembly";
import {
  DEFAULT_PERFORMANCE_BONES,
  type PerformanceBoneMetrics,
} from "../../types/performanceSkeleton";
import {
  DEFAULT_PERFORMANCE_CONTROL_POINTS,
  type PerformanceControlPoints,
} from "../../types/performanceControlPoints";
import { clamp, DEG2RAD } from "./mathUtils";
import type { HtmlPuppetState } from "./puppetState";

/** 脖子主杆相对头局部的基准倾角（°，Canvas y 向下时正值≈顺时针） */
const NECK_ROD_BASE_DEG = 35;
/** 身体旋转时杆略跟动；系数小 + 夹紧，避免大幅甩 */
const NECK_ROD_TORSO_FOLLOW = 0.1;
const NECK_ROD_TORSO_FOLLOW_MAX = 4;

const drawJoint = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#ffda75";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#000";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
};

const drawJointAtOffset = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.save();
  ctx.translate(x, y);
  drawJoint(ctx);
  ctx.restore();
};

const drawPolyPart = (
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  color: string,
  outlineColor: string,
) => {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 2;
  for (let i = -50; i < 150; i += 8) {
    ctx.beginPath();
    ctx.moveTo(-50, i);
    ctx.lineTo(50, i + 5);
    ctx.stroke();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = outlineColor;
  ctx.stroke();
};

const polyBounds = (points: readonly { x: number; y: number }[]) => {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
};

const drawImageContainInRect = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  minX: number,
  minY: number,
  bw: number,
  bh: number,
) => {
  const scale = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = minX + (bw - dw) / 2;
  const dy = minY + (bh - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
};

const drawImageCoverInRect = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  minX: number,
  minY: number,
  bw: number,
  bh: number,
) => {
  const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
  const sw = bw / scale;
  const sh = bh / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, minX, minY, bw, bh);
};

type SkinFit = { expandX: number; expandY: number; offsetX: number; offsetY: number };

const DEFAULT_SKIN_FIT: SkinFit = { expandX: 1, expandY: 1, offsetX: 0, offsetY: 0 };
const ASSEMBLY_BASE_SCALE = 0.51;

const PART_SKIN_FIT: Partial<Record<PuppetPartId, SkinFit>> = {
  // 戏曲大摆袖：手臂贴图需要明显放大并下移，避免被细骨架裁掉。
  leftUpperArm: { expandX: 2.65, expandY: 1.85, offsetX: -8, offsetY: 18 },
  leftForearm: { expandX: 2.55, expandY: 1.95, offsetX: -10, offsetY: 16 },
  rightUpperArm: { expandX: 2.65, expandY: 1.85, offsetX: 8, offsetY: 18 },
  rightForearm: { expandX: 2.55, expandY: 1.95, offsetX: 10, offsetY: 16 },
  // 身体和腰部加高，贴近参考图“细长身段”。
  torso: { expandX: 1.42, expandY: 1.35, offsetX: 0, offsetY: 12 },
  pelvis: { expandX: 1.24, expandY: 1.28, offsetX: 0, offsetY: 10 },
  // 下肢略收窄拉长，避免脚部显得过宽。
  leftLeg: { expandX: 1.03, expandY: 1.16, offsetX: -1, offsetY: 4 },
  rightLeg: { expandX: 1.03, expandY: 1.16, offsetX: 1, offsetY: 4 },
};

const expandRectByFit = (
  minX: number,
  minY: number,
  w: number,
  h: number,
  fit: SkinFit,
) => {
  const nextW = w * fit.expandX;
  const nextH = h * fit.expandY;
  const cx = minX + w / 2 + fit.offsetX;
  const cy = minY + h / 2 + fit.offsetY;
  return {
    x: cx - nextW / 2,
    y: cy - nextH / 2,
    w: nextW,
    h: nextH,
  };
};

const resolveCachedImage = (
  cache: ReadonlyMap<string, HTMLImageElement>,
  url: string | undefined,
): HTMLImageElement | undefined => {
  if (!url) return undefined;
  const img = cache.get(url);
  if (!img?.complete || img.naturalWidth <= 0) return undefined;
  return img;
};

const resolvePartScaleFromAssembly = (
  partId: PuppetPartId,
  assemblyTransforms?: AssemblyPartTransforms,
  boneMetrics?: PerformanceBoneMetrics,
) => {
  const s = assemblyTransforms?.[partId]?.scale;
  if (!Number.isFinite(s)) return 1;
  const ratio = (s as number) / ASSEMBLY_BASE_SCALE;
  if (partId === "leftForearm" || partId === "rightForearm") {
    return clamp(ratio, 0.2, 3.2);
  }
  if (partId === "leftLeg" || partId === "rightLeg") {
    return clamp(ratio, boneMetrics?.legVisualScaleMin ?? 0.75, 1.45);
  }
  return clamp(ratio, 0.75, 1.45);
};

/** 由拼接页归一化位姿推导幕上骨骼段长等（与 `paintPerformanceCanvas` 所用 logicalStage 尺度一致） */
export const deriveBonesFromAssembly = (assemblyTransforms?: AssemblyPartTransforms): PerformanceBoneMetrics => {
  if (!assemblyTransforms) return DEFAULT_PERFORMANCE_BONES;
  const t = assemblyTransforms.torso;
  const p = assemblyTransforms.pelvis;
  const lu = assemblyTransforms.leftUpperArm;
  const ru = assemblyTransforms.rightUpperArm;
  const lf = assemblyTransforms.leftForearm;
  const rf = assemblyTransforms.rightForearm;
  const h = assemblyTransforms.head;
  const ll = assemblyTransforms.leftLeg;
  const rl = assemblyTransforms.rightLeg;
  if (!t || !p || !lu || !ru || !lf || !rf || !h || !ll || !rl) return DEFAULT_PERFORMANCE_BONES;

  const sx = 1280;
  const sy = 720;
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot((a.x - b.x) * sx, (a.y - b.y) * sy);

  const upperCenterDist = (dist(lu, lf) + dist(ru, rf)) * 0.5;
  const shoulderDeltaY = ((Math.abs(lu.y - t.y) + Math.abs(ru.y - t.y)) * 0.5) * sy;
  const torsoPelvisDeltaY = Math.abs(p.y - t.y) * sy;
  const avgLegCenter = { x: (ll.x + rl.x) * 0.5, y: (ll.y + rl.y) * 0.5 };
  const pelvisToLegCenter = dist(p, avgLegCenter);
  const headToTorsoY = Math.abs(h.y - t.y) * sy;
  const shoulderSpan = Math.abs(lu.x - ru.x) * sx;

  return {
    skinScale: 1,
    skinScaleHead: 1,
    skinScaleTorso: 1,
    skinScalePelvis: 1,
    skinScaleLeftUpperArm: 1,
    skinScaleLeftForearm: 1,
    skinScaleRightUpperArm: 1,
    skinScaleRightForearm: 1,
    skinScaleLeftLeg: 1,
    skinScaleRightLeg: 1,
    offsetHeadX: 0,
    offsetHeadY: 0,
    offsetTorsoX: 0,
    offsetTorsoY: 0,
    offsetPelvisX: 0,
    offsetPelvisY: 0,
    offsetLeftUpperArmX: 0,
    offsetLeftUpperArmY: 0,
    offsetLeftForearmX: 0,
    offsetLeftForearmY: 0,
    offsetRightUpperArmX: 0,
    offsetRightUpperArmY: 0,
    offsetRightForearmX: 0,
    offsetRightForearmY: 0,
    offsetLeftLegX: 0,
    offsetLeftLegY: 0,
    offsetRightLegX: 0,
    offsetRightLegY: 0,
    jointShoulderX: 0,
    jointShoulderY: 0,
    jointElbowX: 0,
    jointElbowY: 0,
    jointHipX: 0,
    jointHipY: 0,
    jointKneeX: 0,
    jointKneeY: 0,
    jointLeftShoulderX: 0,
    jointLeftShoulderY: 0,
    jointRightShoulderX: 0,
    jointRightShoulderY: 0,
    jointLeftElbowX: 0,
    jointLeftElbowY: 0,
    jointRightElbowX: 0,
    jointRightElbowY: 0,
    jointLeftHipX: 0,
    jointLeftHipY: 0,
    jointRightHipX: 0,
    jointRightHipY: 0,
    jointLeftKneeX: 0,
    jointLeftKneeY: 0,
    jointRightKneeX: 0,
    jointRightKneeY: 0,
    jointNeckRodX: 0,
    jointNeckRodY: 0,
    jointRearHandRodX: 0,
    jointRearHandRodY: 0,
    jointFrontHandRodX: 0,
    jointFrontHandRodY: 0,
    // 用头-躯干与肩高共同约束上身，避免头身脱节
    shoulderY: clamp(shoulderDeltaY * 0.8 + headToTorsoY * 0.18, 52, 88),
    // 上下臂以拼接点距为主，并用肩宽做次约束，避免手臂过长
    upperArmLen: clamp(upperCenterDist * 0.4 + shoulderSpan * 0.08, 46, 74),
    foreArmLen: clamp(upperCenterDist * 0.34 + shoulderSpan * 0.06, 38, 66),
    // 躯干/骨盆改为更贴近拼接相对位置，收紧上下距离
    torsoRise: clamp(torsoPelvisDeltaY * 0.36 + headToTorsoY * 0.05, 56, 92),
    torsoHeight: clamp(torsoPelvisDeltaY * 0.34, 52, 86),
    hipY: clamp(torsoPelvisDeltaY * 0.3, 44, 78),
    // 腿段长度使用「骨盆到腿中心」主导，解决腿部整体下坠
    thighLen: clamp(pelvisToLegCenter * 0.9, 24, 52),
    footY: clamp(pelvisToLegCenter * 0.62, 20, 42),
    neckOffsetY: clamp(headToTorsoY * 0.14, 6, 16),
    headTorsoLagFactor: 1,
    legVisualScaleMin: 0.75,
  };
};

const scaleRectAroundAnchor = (
  rect: { x: number; y: number; w: number; h: number },
  scale: number,
  anchorNorm: { u: number; v: number },
) => {
  const ax = rect.x + rect.w * anchorNorm.u;
  const ay = rect.y + rect.h * anchorNorm.v;
  const w = rect.w * scale;
  const h = rect.h * scale;
  return {
    x: ax - w * anchorNorm.u,
    y: ay - h * anchorNorm.v,
    w,
    h,
  };
};

const drawPartSkinOrPoly = (
  ctx: CanvasRenderingContext2D,
  partId: PuppetPartId,
  points: { x: number; y: number }[],
  color: string,
  outlineColor: string,
  skin: PuppetSkinBundle,
  cache: ReadonlyMap<string, HTMLImageElement>,
  partScaleFromAssembly = 1,
  skinScale = 1,
  partOffset: { x: number; y: number } = { x: 0, y: 0 },
  pivotOffsetPx: { x: number; y: number } = { x: 0, y: 0 },
) => {
  ctx.save();
  void pivotOffsetPx;
  ctx.translate(partOffset.x, partOffset.y);
  const img = resolveCachedImage(cache, skin.partImages[partId]);
  if (img) {
    const { minX, minY, w, h } = polyBounds(points);
    const fit = PART_SKIN_FIT[partId] ?? DEFAULT_SKIN_FIT;
    const rect0 = expandRectByFit(minX, minY, w, h, fit);
    const anchorBase = partAssembly[partId]?.anchorNorm ?? { u: 0.5, v: 0.5 };
    const anchor = anchorBase;
    const rect = scaleRectAroundAnchor(rect0, partScaleFromAssembly * skinScale, anchor);
    ctx.save();
    // 贴图态用部件外接框而非细骨架轮廓裁切，避免大袖被截断。
    drawImageContainInRect(ctx, img, rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    ctx.restore();
    return;
  }
  drawPolyPart(ctx, points, color, outlineColor);
  ctx.restore();
};

const drawLegSkinOrPolys = (
  ctx: CanvasRenderingContext2D,
  partId: PuppetPartId,
  thighPts: { x: number; y: number }[],
  footDx: number,
  footDy: number,
  footPts: { x: number; y: number }[],
  colBody: string,
  colTrim: string,
  skin: PuppetSkinBundle,
  cache: ReadonlyMap<string, HTMLImageElement>,
  partScaleFromAssembly = 1,
  skinScale = 1,
  partOffset: { x: number; y: number } = { x: 0, y: 0 },
  pivotOffsetPx: { x: number; y: number } = { x: 0, y: 0 },
  jointOffset: { x: number; y: number } = { x: 0, y: 0 },
  kneeOffset: { x: number; y: number } = { x: 0, y: 0 },
  showJointMarkers = true,
) => {
  ctx.save();
  void pivotOffsetPx;
  ctx.translate(partOffset.x, partOffset.y);
  const img = resolveCachedImage(cache, skin.partImages[partId]);
  if (img) {
    const footW = footPts.map((p) => ({ x: p.x + footDx, y: p.y + footDy }));
    const merged = [...thighPts, ...footW];
    const b = polyBounds(merged);
    const fit = PART_SKIN_FIT[partId] ?? DEFAULT_SKIN_FIT;
    const rect0 = expandRectByFit(b.minX, b.minY, b.w, b.h, fit);
    const anchorBase = partAssembly[partId]?.anchorNorm ?? { u: 0.5, v: 0.5 };
    const anchor = anchorBase;
    const rect = scaleRectAroundAnchor(rect0, partScaleFromAssembly * skinScale, anchor);
    ctx.save();
    drawImageContainInRect(ctx, img, rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    if (showJointMarkers) drawJointAtOffset(ctx, jointOffset.x, jointOffset.y);
    ctx.restore();
    return;
  }
  drawPolyPart(ctx, thighPts, colBody, colTrim);
  if (showJointMarkers) drawJointAtOffset(ctx, jointOffset.x, jointOffset.y);
  ctx.translate(footDx + kneeOffset.x, footDy + kneeOffset.y);
  drawPolyPart(ctx, footPts, "#111", colTrim);
  ctx.restore();
};

const drawRod = (ctx: CanvasRenderingContext2D, length: number, angle: number) => {
  ctx.save();
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, length);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#222";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-3, length - 50);
  ctx.lineTo(3, length - 50);
  ctx.lineTo(3, length);
  ctx.lineTo(-3, length);
  ctx.closePath();
  ctx.fillStyle = "#5c4033";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

const drawHead = (ctx: CanvasRenderingContext2D) => {
  ctx.save();
  ctx.fillStyle = "#f4e4c1";
  ctx.fillRect(-5, -20, 10, 20);
  ctx.strokeRect(-5, -20, 10, 20);

  ctx.beginPath();
  ctx.arc(5, -40, 20, Math.PI * 0.2, Math.PI * 1.8, true);
  ctx.lineTo(-10, -20);
  ctx.closePath();
  ctx.fillStyle = "#f4e4c1";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10, -45);
  ctx.lineTo(18, -42);
  ctx.stroke();

  ctx.fillStyle = "#8b0000";
  ctx.beginPath();
  ctx.moveTo(-15, -55);
  ctx.lineTo(15, -60);
  ctx.lineTo(20, -90);
  ctx.lineTo(-5, -80);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffda75";
  ctx.beginPath();
  ctx.arc(0, -70, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(10, -80, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-10, -50);
  ctx.quadraticCurveTo(-30, -20, -25, 20);
  ctx.stroke();
  ctx.restore();
};

/**
 * 头部贴图：按原图比例完整显示（不裁切头饰），底边与关节对齐。
 * 旧版用固定小框 + cover，会把高头饰裁掉，且易显得糊、比例不对。
 */
const drawHeadOrSkin = (
  ctx: CanvasRenderingContext2D,
  skin: PuppetSkinBundle,
  cache: ReadonlyMap<string, HTMLImageElement>,
  skinScale = 1,
  partOffset: { x: number; y: number } = { x: 0, y: 0 },
) => {
  ctx.save();
  ctx.translate(partOffset.x, partOffset.y);
  const img = resolveCachedImage(cache, skin.partImages.head);
  if (img) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (iw > 0 && ih > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      // 人偶坐标系中头部可用区域：略放宽容忍凤冠、长翎（相对矢量头更大）
      const maxW = 120 * skinScale;
      const maxH = 220 * skinScale;
      const scale = Math.min(maxW / iw, maxH / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = -dw / 2;
      // PNG 底缘一般为领/颈，对齐到关节 (0,0)
      const dy = -dh;
      ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
      ctx.restore();
      ctx.restore();
      return;
    }
  }
  drawHead(ctx);
  ctx.restore();
};

const drawRodOrSkin = (
  ctx: CanvasRenderingContext2D,
  length: number,
  angle: number,
  rodId: PuppetRodSkinId,
  skin: PuppetSkinBundle,
  cache: ReadonlyMap<string, HTMLImageElement>,
) => {
  const img = resolveCachedImage(cache, skin.rodImages[rodId]);
  if (img) {
    ctx.save();
    ctx.rotate(angle);
    const dh = length;
    const scale = dh / img.naturalHeight;
    const dw = Math.min(18, img.naturalWidth * scale);
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, -dw / 2, 0, dw, dh);
    ctx.restore();
    return;
  }
  drawRod(ctx, length, angle);
};

const rodAngleForVisualDirection = (
  ctx: CanvasRenderingContext2D,
  visualDx = 1,
  visualDy = 1,
) => {
  const m = ctx.getTransform();
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 0.000001) return 0;
  const localX = (m.d * visualDx - m.c * visualDy) / det;
  const localY = (-m.b * visualDx + m.a * visualDy) / det;
  return Math.atan2(-localX, localY);
};

/** 幕上调参预览等：隐藏部件、叠加旋转（°），不改 store 中的 assemblyTransforms。 */
export type DrawPuppet2dExtras = {
  hiddenParts?: readonly PuppetPartId[] | ReadonlySet<PuppetPartId>;
  partRotationExtraDeg?: Partial<Record<PuppetPartId, number>>;
  /** 调锚点时冻结部件，锚点只作为可拖点/数据，不实时牵动部件。 */
  freezeAnchorInfluence?: boolean;
  /** 离屏测量视觉底边时关闭投影，避免把影子算作皮影本体。 */
  disableShadow?: boolean;
};

const hiddenPartSet = (hidden?: DrawPuppet2dExtras["hiddenParts"]) => {
  if (!hidden) return new Set<PuppetPartId>();
  return hidden instanceof Set ? new Set(hidden) : new Set(hidden);
};

/**
 * @param puppetSkin 与拼接页共用；有贴图 URL 且已解码进 cache 时绘制位图，否则走矢量占位。
 * @param puppetImageCache key 为图片 URL
 */
export const drawPuppet2d = (
  ctx: CanvasRenderingContext2D,
  puppet: HtmlPuppetState,
  facingDir: number,
  puppetSkin: PuppetSkinBundle,
  puppetImageCache: ReadonlyMap<string, HTMLImageElement>,
  /** 整体缩放（幕上为 1；拼接预览区可略缩小以完整入画） */
  viewScale = 1,
  /** 仅绘制某个部件（散落盘生成 sprite 用）；默认绘制整个人偶 */
  onlyPart?: PuppetPartId,
  /** 幕上表演是否显示三杆 */
  showRods = true,
  /** 幕上贴图尺寸可参考拼接调参的每部件 scale（仅影响贴图外观，不改运动学） */
  assemblyTransforms?: AssemblyPartTransforms,
  /** 幕上骨骼长度调参（显式优先，未给时回退 assembly 推导） */
  boneMetrics?: PerformanceBoneMetrics,
  /** 控制点偏移：仅影响操控映射，不改变部件结构 */
  controlPoints?: PerformanceControlPoints,
  drawExtras?: DrawPuppet2dExtras,
  /** 幕上表演为 false 时可隐藏黄色孔位/关节点，不影响杆与运动学。 */
  showJointMarkers = true,
) => {
  const hidden = hiddenPartSet(drawExtras?.hiddenParts);
  const shouldDrawPart = (id: PuppetPartId) =>
    (onlyPart === undefined || onlyPart === id) && !hidden.has(id);
  const shouldDrawRods = onlyPart === undefined && showRods;
  const bones = boneMetrics ?? deriveBonesFromAssembly(assemblyTransforms);
  const partScale = (id: PuppetPartId) => resolvePartScaleFromAssembly(id, assemblyTransforms, bones);
  const cp = controlPoints ?? DEFAULT_PERFORMANCE_CONTROL_POINTS;
  const skinS = clamp(bones.skinScale ?? 1, 0.3, 3.6);
  const headSkinS = clamp(skinS * (bones.skinScaleHead ?? 1) * partScale("head"), 0.3, 6);
  const torsoSkinS = clamp(skinS * (bones.skinScaleTorso ?? 1), 0.3, 6);
  const pelvisSkinS = clamp(skinS * (bones.skinScalePelvis ?? 1), 0.3, 6);
  const lUpperSkinS = clamp(skinS * (bones.skinScaleLeftUpperArm ?? 1), 0.3, 6);
  const lForeSkinS = clamp(skinS * (bones.skinScaleLeftForearm ?? 1), 0.3, 6);
  const rUpperSkinS = clamp(skinS * (bones.skinScaleRightUpperArm ?? 1), 0.3, 6);
  const rForeSkinS = clamp(skinS * (bones.skinScaleRightForearm ?? 1), 0.3, 6);
  const lLegSkinS = clamp(skinS * (bones.skinScaleLeftLeg ?? 1), 0.3, 6);
  const rLegSkinS = clamp(skinS * (bones.skinScaleRightLeg ?? 1), 0.3, 6);
  const partOffset = (id: PuppetPartId) => {
    switch (id) {
      case "head":
        return { x: bones.offsetHeadX, y: bones.offsetHeadY };
      case "torso":
        return { x: bones.offsetTorsoX, y: bones.offsetTorsoY };
      case "pelvis":
        return { x: bones.offsetPelvisX, y: bones.offsetPelvisY };
      case "leftUpperArm":
        return { x: bones.offsetLeftUpperArmX, y: bones.offsetLeftUpperArmY };
      case "leftForearm":
        return { x: bones.offsetLeftForearmX, y: bones.offsetLeftForearmY };
      case "rightUpperArm":
        return { x: bones.offsetRightUpperArmX, y: bones.offsetRightUpperArmY };
      case "rightForearm":
        return { x: bones.offsetRightForearmX, y: bones.offsetRightForearmY };
      case "leftLeg":
        return { x: bones.offsetLeftLegX, y: bones.offsetLeftLegY };
      case "rightLeg":
        return { x: bones.offsetRightLegX, y: bones.offsetRightLegY };
      default:
        return { x: 0, y: 0 };
    }
  };
  const jointPoint = (
    xKey: keyof PerformanceBoneMetrics,
    yKey: keyof PerformanceBoneMetrics,
    fallbackXKey: keyof PerformanceBoneMetrics,
    fallbackYKey: keyof PerformanceBoneMetrics,
  ) => ({
    x: Number.isFinite(Number(bones[xKey])) ? Number(bones[xKey]) : Number(bones[fallbackXKey] ?? 0),
    y: Number.isFinite(Number(bones[yKey])) ? Number(bones[yKey]) : Number(bones[fallbackYKey] ?? 0),
  });
  const leftShoulderJoint = jointPoint("jointLeftShoulderX", "jointLeftShoulderY", "jointShoulderX", "jointShoulderY");
  const rightShoulderJoint = jointPoint("jointRightShoulderX", "jointRightShoulderY", "jointShoulderX", "jointShoulderY");
  const leftElbowJoint = jointPoint("jointLeftElbowX", "jointLeftElbowY", "jointElbowX", "jointElbowY");
  const rightElbowJoint = jointPoint("jointRightElbowX", "jointRightElbowY", "jointElbowX", "jointElbowY");
  const leftHipJoint = jointPoint("jointLeftHipX", "jointLeftHipY", "jointHipX", "jointHipY");
  const rightHipJoint = jointPoint("jointRightHipX", "jointRightHipY", "jointHipX", "jointHipY");
  const leftKneeJoint = jointPoint("jointLeftKneeX", "jointLeftKneeY", "jointKneeX", "jointKneeY");
  const rightKneeJoint = jointPoint("jointRightKneeX", "jointRightKneeY", "jointKneeX", "jointKneeY");
  const neckRodJoint = { x: Number(bones.jointNeckRodX ?? 0), y: Number(bones.jointNeckRodY ?? 0) };
  const rearHandRodJoint = { x: Number(bones.jointRearHandRodX ?? 0), y: Number(bones.jointRearHandRodY ?? 0) };
  const frontHandRodJoint = { x: Number(bones.jointFrontHandRodX ?? 0), y: Number(bones.jointFrontHandRodY ?? 0) };
  const freezeAnchorInfluence = Boolean(drawExtras?.freezeAnchorInfluence);
  const activeJoint = (p: { x: number; y: number }) => (freezeAnchorInfluence ? { x: 0, y: 0 } : p);
  const activeLeftShoulderJoint = activeJoint(leftShoulderJoint);
  const activeRightShoulderJoint = activeJoint(rightShoulderJoint);
  const activeLeftElbowJoint = activeJoint(leftElbowJoint);
  const activeRightElbowJoint = activeJoint(rightElbowJoint);
  const activeLeftHipJoint = activeJoint(leftHipJoint);
  const activeRightHipJoint = activeJoint(rightHipJoint);
  const activeLeftKneeJoint = activeJoint(leftKneeJoint);
  const activeRightKneeJoint = activeJoint(rightKneeJoint);
  const activeNeckRodJoint = activeJoint(neckRodJoint);
  const activeRearHandRodJoint = activeJoint(rearHandRodJoint);
  const activeFrontHandRodJoint = activeJoint(frontHandRodJoint);
  const headTorsoLagFactor = clamp(bones.headTorsoLagFactor ?? 1, 0, 1.5);
  const effectiveHeadAngle = puppet.torsoAngle + (puppet.headAngle - puppet.torsoAngle) * headTorsoLagFactor;
  const jointPivotOffset = (id: PuppetPartId) => {
    switch (id) {
      case "leftUpperArm":
        return activeLeftShoulderJoint;
      case "leftForearm":
        return activeLeftElbowJoint;
      case "rightUpperArm":
        return activeRightShoulderJoint;
      case "rightForearm":
        return activeRightElbowJoint;
      case "leftLeg":
        return activeLeftHipJoint;
      case "rightLeg":
        return activeRightHipJoint;
      default:
        return { x: 0, y: 0 };
    }
  };
  const torsoS = partScale("torso");
  const pelvisS = partScale("pelvis");
  const lUpperS = partScale("leftUpperArm");
  const lForeS = partScale("leftForearm");
  const rUpperS = partScale("rightUpperArm");
  const rForeS = partScale("rightForearm");
  const lLegS = partScale("leftLeg");
  const rLegS = partScale("rightLeg");

  /** 与拼接/幕上 partTransforms.rotationDeg 一致：骨骼角之后再转一层「散件在托盘上的摆角」 */
  const partArtRotDeg = (id: PuppetPartId) =>
    (assemblyTransforms?.[id]?.rotationDeg ?? 0) + (drawExtras?.partRotationExtraDeg?.[id] ?? 0);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(puppet.x, puppet.y);
  ctx.scale(facingDir, 1);
  ctx.rotate(puppet.facingOffset * DEG2RAD);

  if (drawExtras?.disableShadow) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 15;
  }
  ctx.scale(1.2 * viewScale, 1.2 * viewScale);

  const colBody = "#9a3324";
  const colTrim = "#ffda75";
  const colSkin = "#f4e4c1";
  const isFacingFlipped = facingDir < 0;
  type ArmSide = "left" | "right";
  type ArmRole = "front" | "back";

  const drawArmChain = (side: ArmSide, displayRole: ArmRole) => {
    const isLeft = side === "left";
    const upperId = isLeft ? "leftUpperArm" : "rightUpperArm";
    const foreId = isLeft ? "leftForearm" : "rightForearm";
    const shoulderJoint = isLeft ? activeLeftShoulderJoint : activeRightShoulderJoint;
    const elbowJoint = isLeft ? activeLeftElbowJoint : activeRightElbowJoint;
    const upperScale = isLeft ? lUpperS : rUpperS;
    const foreScale = isLeft ? lForeS : rForeS;
    const upperSkinScale = isLeft ? lUpperSkinS : rUpperSkinS;
    const foreSkinScale = isLeft ? lForeSkinS : rForeSkinS;
    const shoulderX = (isLeft ? 0 : 5) + shoulderJoint.x;
    const visualAngleSign = isFacingFlipped ? -1 : 1;
    const upperAngle = (displayRole === "front" ? puppet.fArmU : puppet.bArmU) * visualAngleSign;
    const foreAngle = (displayRole === "front" ? puppet.fArmL : puppet.bArmL) * visualAngleSign;
    const rigRole: ArmRole = isFacingFlipped ? (isLeft ? "back" : "front") : displayRole;
    const handX = rigRole === "front" ? cp.frontHandX : cp.rearHandX;
    const handY = rigRole === "front" ? cp.frontHandY : cp.rearHandY;
    const rodJoint = rigRole === "front" ? frontHandRodJoint : rearHandRodJoint;
    const activeRodJoint = rigRole === "front" ? activeFrontHandRodJoint : activeRearHandRodJoint;
    const rodId = rigRole === "front" ? "frontHand" : "rearHand";
    const palmRotationDeg = rigRole === "front" ? -10 : 10;

    ctx.save();
    ctx.translate(0, puppet.hipDrop);
    ctx.rotate(puppet.torsoAngle * DEG2RAD);
    ctx.translate(shoulderX, -bones.shoulderY * torsoS + shoulderJoint.y);
    ctx.rotate((upperAngle - puppet.torsoAngle) * DEG2RAD);
    ctx.rotate(partArtRotDeg(upperId) * DEG2RAD);
    ctx.translate(-shoulderJoint.x, -shoulderJoint.y);

    const wantUpper = shouldDrawPart(upperId);
    const wantFore = shouldDrawPart(foreId);
    const upperStep = bones.upperArmLen * upperScale;
    if (wantUpper) {
      drawPartSkinOrPoly(
        ctx,
        upperId,
        [
          { x: -10, y: 0 },
          { x: 10, y: 0 },
          { x: 8, y: 70 * upperScale },
          { x: -8, y: 70 * upperScale },
        ],
        colBody,
        colTrim,
        puppetSkin,
        puppetImageCache,
        upperScale,
        upperSkinScale,
        partOffset(upperId),
        jointPivotOffset(upperId),
      );
    }
    if (showJointMarkers && wantUpper) {
      drawJointAtOffset(ctx, 0, 0);
    }

    ctx.translate(elbowJoint.x, upperStep + elbowJoint.y);
    ctx.rotate(foreAngle * DEG2RAD);
    ctx.rotate(partArtRotDeg(foreId) * DEG2RAD);
    ctx.translate(-elbowJoint.x, -elbowJoint.y);

    const foreStep = bones.foreArmLen * foreScale;
    if (wantFore) {
      drawPartSkinOrPoly(
        ctx,
        foreId,
        [
          { x: -8, y: 0 },
          { x: 8, y: 0 },
          { x: 6, y: 60 * foreScale },
          { x: -6, y: 60 * foreScale },
        ],
        colBody,
        colTrim,
        puppetSkin,
        puppetImageCache,
        foreScale,
        foreSkinScale,
        partOffset(foreId),
        jointPivotOffset(foreId),
      );
    }
    if (showJointMarkers && wantFore) {
      drawJointAtOffset(ctx, 0, 0);
    }

    ctx.translate(0, foreStep);
    ctx.rotate(palmRotationDeg * DEG2RAD);
    if (wantFore && !resolveCachedImage(puppetImageCache, puppetSkin.partImages[foreId])) {
      drawPolyPart(
        ctx,
        [
          { x: -5, y: 0 },
          { x: 5, y: 0 },
          { x: 4, y: 25 * foreScale },
          { x: -4, y: 25 * foreScale },
        ],
        colSkin,
        "#000",
      );
    }
    if (showJointMarkers && wantFore) {
      drawJointAtOffset(ctx, handX + rodJoint.x, handY + rodJoint.y);
    }
    if (shouldDrawRods) {
      ctx.save();
      ctx.translate(handX + activeRodJoint.x, handY + activeRodJoint.y);
      drawRodOrSkin(
        ctx,
        500,
        rodAngleForVisualDirection(ctx),
        rodId,
        puppetSkin,
        puppetImageCache,
      );
      ctx.restore();
    }
    ctx.restore();
  };

  drawArmChain(isFacingFlipped ? "right" : "left", "back");

  ctx.save();
  ctx.translate(0, puppet.hipDrop);
  ctx.rotate(puppet.hipAngle * DEG2RAD);
  ctx.translate(-5 + activeLeftHipJoint.x, bones.hipY * pelvisS + activeLeftHipJoint.y);
  ctx.rotate(puppet.bLeg * DEG2RAD);
  ctx.rotate(partArtRotDeg("leftLeg") * DEG2RAD);
  ctx.translate(-activeLeftHipJoint.x, -activeLeftHipJoint.y);
  if (shouldDrawPart("leftLeg")) {
    drawLegSkinOrPolys(
      ctx,
      "leftLeg",
      [
        { x: -10, y: 0 },
        { x: 10, y: 0 },
        { x: 8, y: bones.thighLen * lLegS },
        { x: -8, y: bones.thighLen * lLegS },
      ],
      2,
      bones.footY * lLegS,
      [
        { x: -15, y: 0 },
        { x: 15, y: 0 },
        { x: 18, y: (bones.footY * 0.25) * lLegS },
        { x: -5, y: (bones.footY * 0.25) * lLegS },
      ],
      colBody,
      colTrim,
      puppetSkin,
      puppetImageCache,
      lLegS,
      lLegSkinS,
      partOffset("leftLeg"),
      jointPivotOffset("leftLeg"),
      { x: activeLeftKneeJoint.x, y: bones.thighLen * lLegS + activeLeftKneeJoint.y },
      { x: 0, y: 0 },
      showJointMarkers,
    );
  }
  ctx.restore();

  ctx.save();
  ctx.translate(0, puppet.hipDrop);
  ctx.rotate(puppet.hipAngle * DEG2RAD);
  ctx.translate(8 + activeRightHipJoint.x, bones.hipY * pelvisS + activeRightHipJoint.y);
  ctx.rotate(puppet.fLeg * DEG2RAD);
  ctx.rotate(partArtRotDeg("rightLeg") * DEG2RAD);
  ctx.translate(-activeRightHipJoint.x, -activeRightHipJoint.y);
  if (shouldDrawPart("rightLeg")) {
    drawLegSkinOrPolys(
      ctx,
      "rightLeg",
      [
        { x: -10, y: 0 },
        { x: 10, y: 0 },
        { x: 8, y: bones.thighLen * rLegS },
        { x: -8, y: bones.thighLen * rLegS },
      ],
      2,
      bones.footY * rLegS,
      [
        { x: -15, y: 0 },
        { x: 15, y: 0 },
        { x: 18, y: (bones.footY * 0.25) * rLegS },
        { x: -5, y: (bones.footY * 0.25) * rLegS },
      ],
      colBody,
      colTrim,
      puppetSkin,
      puppetImageCache,
      rLegS,
      rLegSkinS,
      partOffset("rightLeg"),
      jointPivotOffset("rightLeg"),
      { x: activeRightKneeJoint.x, y: bones.thighLen * rLegS + activeRightKneeJoint.y },
      { x: 0, y: 0 },
      showJointMarkers,
    );
  }
  ctx.restore();

  ctx.save();
  ctx.translate(0, puppet.hipDrop);
  ctx.rotate(puppet.hipAngle * DEG2RAD);
  ctx.rotate(partArtRotDeg("pelvis") * DEG2RAD);
  if (shouldDrawPart("pelvis")) {
    drawPartSkinOrPoly(
      ctx,
      "pelvis",
      [
        { x: -15, y: 0 },
        { x: 20, y: 0 },
        { x: 25, y: 90 * pelvisS },
        { x: -15, y: 90 * pelvisS },
      ],
      colBody,
      colTrim,
      puppetSkin,
      puppetImageCache,
      pelvisS,
      pelvisSkinS,
      partOffset("pelvis"),
    );
    if (showJointMarkers) drawJointAtOffset(ctx, 0, 0);
  }
  ctx.restore();

  ctx.save();
  ctx.translate(0, puppet.hipDrop);
  ctx.rotate(puppet.torsoAngle * DEG2RAD);
  ctx.translate(0, -bones.torsoRise * pelvisS);

  ctx.save();
  // 脖颈控制点固定在骨架连接处；仅调整“旋转枢轴相对头贴图”的关系，不平移整颗头。
  ctx.translate(7.5, bones.neckOffsetY * torsoS);
  ctx.rotate((effectiveHeadAngle - puppet.torsoAngle) * DEG2RAD);
  if (shouldDrawPart("head")) {
    ctx.save();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.rotate(partArtRotDeg("head") * DEG2RAD);
    drawHeadOrSkin(
      ctx,
      puppetSkin,
      puppetImageCache,
      headSkinS,
      {
        x: partOffset("head").x - cp.neckX,
        y: partOffset("head").y - cp.neckY,
      },
    );
    ctx.restore();
    if (showJointMarkers) drawJointAtOffset(ctx, cp.neckX + neckRodJoint.x, cp.neckY + neckRodJoint.y);
  }
  const neckRodFollowDeg = clamp(
    puppet.torsoAngle * NECK_ROD_TORSO_FOLLOW,
    -NECK_ROD_TORSO_FOLLOW_MAX,
    NECK_ROD_TORSO_FOLLOW_MAX,
  );
  if (shouldDrawRods) {
    ctx.save();
    // 脖颈杆跟随控制点，作用于操控映射，不改变头/躯干连接结构。
    ctx.translate(cp.neckX + activeNeckRodJoint.x, cp.neckY + activeNeckRodJoint.y);
    drawRodOrSkin(
      ctx,
      600,
      (NECK_ROD_BASE_DEG * facingDir - puppet.facingOffset - effectiveHeadAngle + neckRodFollowDeg) * DEG2RAD,
      "neck",
      puppetSkin,
      puppetImageCache,
    );
    ctx.restore();
  }
  ctx.restore();

  if (shouldDrawPart("torso")) {
    ctx.rotate(partArtRotDeg("torso") * DEG2RAD);
    drawPartSkinOrPoly(
      ctx,
      "torso",
      [
        { x: -15, y: (10 + bones.torsoHeight) * torsoS },
        { x: 20, y: (10 + bones.torsoHeight) * torsoS },
        { x: 25, y: 10 * torsoS },
        { x: -10, y: 10 * torsoS },
      ],
      colBody,
      colTrim,
      puppetSkin,
      puppetImageCache,
      torsoS,
      torsoSkinS,
      partOffset("torso"),
    );
    if (showJointMarkers) {
      ctx.beginPath();
      ctx.arc(5, (10 + bones.torsoHeight * 0.5) * torsoS, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  drawArmChain(isFacingFlipped ? "left" : "right", "front");

  ctx.restore();
};
