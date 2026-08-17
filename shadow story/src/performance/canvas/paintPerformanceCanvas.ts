import { logicalStage, performancePuppetViewScale } from "../../data/themeConfig";
import type { AssemblyPartTransforms } from "../../types/assembly";
import type { PerformanceBoneMetrics, PerformancePuppetTransform } from "../../types/performanceSkeleton";
import type { PerformanceControlPoints } from "../../types/performanceControlPoints";
import type { PuppetPartId } from "../../types/puppet";
import type { PuppetSkinBundle } from "../../types/puppetSkin";
import type { SceneItem } from "../../types/scene";
import { drawPuppet2d, type DrawPuppet2dExtras } from "./drawPuppet2d";
import { drawScene2d } from "./drawScene2d";
import type { HtmlPuppetState } from "./puppetState";

/** 骨骼调校页等：底图参考、隐藏身体、部件旋转预览（不写入持久化 store）。 */
export type PerformanceRigCanvasPaintOverlay = {
  hideBody?: boolean;
  hiddenParts?: readonly PuppetPartId[];
  partRotationExtraDeg?: Partial<Record<PuppetPartId, number>>;
  referenceShow?: boolean;
  referenceUrl?: string | null;
  referenceMaxHeightFrac?: number;
  referenceOpacity?: number;
  freezeAnchorInfluence?: boolean;
};

export type PerformancePuppetCanvasLayer = {
  puppet: HtmlPuppetState;
  facingDir: number;
  puppetSkin: PuppetSkinBundle;
  showRods?: boolean;
  assemblyTransforms?: AssemblyPartTransforms;
  boneMetrics?: PerformanceBoneMetrics;
  controlPoints?: PerformanceControlPoints;
  rigOverlay?: PerformanceRigCanvasPaintOverlay | null;
  puppetTransform?: Pick<PerformancePuppetTransform, "scale" | "rotationDeg">;
  showPuppetJointMarkers?: boolean;
};

const buildDrawExtras = (overlay?: PerformanceRigCanvasPaintOverlay | null): DrawPuppet2dExtras | undefined => {
  if (!overlay) return undefined;
  const hidden = [...(overlay.hiddenParts ?? [])] as PuppetPartId[];
  if (overlay.hideBody) {
    (["torso", "pelvis"] as const).forEach((id) => {
      if (!hidden.includes(id)) hidden.push(id);
    });
  }
  const rot = overlay.partRotationExtraDeg;
  const hasRot = rot
    ? (Object.keys(rot) as PuppetPartId[]).some((id) => {
        const v = rot[id];
        return typeof v === "number" && v !== 0;
      })
    : false;
  const shouldFreezeAnchorInfluence = Boolean(overlay.freezeAnchorInfluence);
  if (!hidden.length && !hasRot && !shouldFreezeAnchorInfluence) return undefined;
  const out: DrawPuppet2dExtras = {};
  if (hidden.length) out.hiddenParts = hidden;
  if (hasRot && rot) out.partRotationExtraDeg = { ...rot };
  if (shouldFreezeAnchorInfluence) out.freezeAnchorInfluence = true;
  return out;
};

const drawPuppetReferenceUnderlay = (
  ctx: CanvasRenderingContext2D,
  cache: ReadonlyMap<string, HTMLImageElement>,
  overlay: PerformanceRigCanvasPaintOverlay | null | undefined,
) => {
  if (!overlay?.referenceShow || !overlay.referenceUrl) return;
  const img = cache.get(overlay.referenceUrl);
  if (!img?.complete || img.naturalWidth <= 0) return;
  const maxHFrac = overlay.referenceMaxHeightFrac ?? 0.28;
  const opacity = overlay.referenceOpacity ?? 0.3;
  const maxH = logicalStage.height * maxHFrac;
  const scale = maxH / img.naturalHeight;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const cx = logicalStage.width / 2;
  const cy = logicalStage.height * 0.565;
  const x = cx - dw / 2;
  const y = cy - dh * 0.52;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, x, y, dw, dh);
  ctx.restore();
};

const withPuppetRootTransform = (
  ctx: CanvasRenderingContext2D,
  puppet: HtmlPuppetState,
  puppetTransform: Pick<PerformancePuppetTransform, "scale" | "rotationDeg"> | undefined,
  draw: () => void,
) => {
  const rootScale = puppetTransform?.scale ?? 1;
  const rootRotation = ((puppetTransform?.rotationDeg ?? 0) * Math.PI) / 180;
  ctx.save();
  ctx.translate(puppet.x, puppet.y);
  ctx.rotate(rootRotation);
  ctx.scale(rootScale, rootScale);
  ctx.translate(-puppet.x, -puppet.y);
  draw();
  ctx.restore();
};

const drawPerformancePuppetLayer = (
  ctx: CanvasRenderingContext2D,
  layer: PerformancePuppetCanvasLayer,
  cache: ReadonlyMap<string, HTMLImageElement>,
) => {
  withPuppetRootTransform(ctx, layer.puppet, layer.puppetTransform, () => {
    drawPuppet2d(
      ctx,
      layer.puppet,
      layer.facingDir,
      layer.puppetSkin,
      cache,
      performancePuppetViewScale,
      undefined,
      layer.showRods ?? true,
      layer.assemblyTransforms,
      layer.boneMetrics,
      layer.controlPoints,
      buildDrawExtras(layer.rigOverlay),
      layer.showPuppetJointMarkers ?? true,
    );
  });
};

const paintCurtainBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = "#efc588";
  ctx.fillRect(0, 0, w, h);

  const radial = ctx.createRadialGradient(
    w * 0.48,
    h * 0.56,
    0,
    w * 0.48,
    h * 0.56,
    Math.max(w, h) * 0.62,
  );
  radial.addColorStop(0, "rgba(255,250,221,0.98)");
  radial.addColorStop(0.34, "rgba(248,236,196,0.88)");
  radial.addColorStop(0.68, "rgba(239,197,136,0.68)");
  radial.addColorStop(1, "rgba(239,197,136,0.5)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, w, h);

  const vertical = ctx.createLinearGradient(0, 0, 0, h);
  vertical.addColorStop(0, "rgba(239,197,136,0.2)");
  vertical.addColorStop(0.3, "rgba(239,197,136,0)");
  vertical.addColorStop(0.78, "rgba(239,197,136,0)");
  vertical.addColorStop(1, "rgba(239,197,136,0.12)");
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, w, h);

  const horizontal = ctx.createLinearGradient(0, 0, w, 0);
  horizontal.addColorStop(0, "rgba(239,197,136,0.16)");
  horizontal.addColorStop(0.24, "rgba(239,197,136,0)");
  horizontal.addColorStop(0.76, "rgba(239,197,136,0)");
  horizontal.addColorStop(1, "rgba(239,197,136,0.18)");
  ctx.fillStyle = horizontal;
  ctx.fillRect(0, 0, w, h);
};

/** `w`/`h` are CSS pixels; `dpr` matches `canvas.width = w * dpr`. */
export const paintPerformanceCanvas = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  sceneItems: SceneItem[],
  puppet: HtmlPuppetState,
  facingDir: number,
  puppetSkin: PuppetSkinBundle,
  puppetImageCache: ReadonlyMap<string, HTMLImageElement>,
  showRods = true,
  assemblyTransforms?: AssemblyPartTransforms,
  boneMetrics?: PerformanceBoneMetrics,
  controlPoints?: PerformanceControlPoints,
  rigOverlay?: PerformanceRigCanvasPaintOverlay | null,
  puppetTransform?: Pick<PerformancePuppetTransform, "scale" | "rotationDeg">,
  /** 幕上主表演为 false 时不画孔位/关节点；骨骼调校页传 true。 */
  showPuppetJointMarkers = true,
  sceneImageCache?: ReadonlyMap<string, HTMLImageElement>,
  extraPuppetLayers: PerformancePuppetCanvasLayer[] = [],
) => {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  paintCurtainBackground(ctx, w, h);

  const scale = Math.min(w / logicalStage.width, h / logicalStage.height);
  ctx.save();
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  drawScene2d(ctx, sceneItems, sceneImageCache);
  drawPuppetReferenceUnderlay(ctx, puppetImageCache, rigOverlay);
  drawPerformancePuppetLayer(ctx, {
    puppet,
    facingDir,
    puppetSkin,
    showRods,
    assemblyTransforms,
    boneMetrics,
    controlPoints,
    rigOverlay,
    puppetTransform,
    showPuppetJointMarkers,
  }, puppetImageCache);
  extraPuppetLayers.forEach((layer) => drawPerformancePuppetLayer(ctx, layer, puppetImageCache));
  ctx.restore();
};
