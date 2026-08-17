import { assemblyPartOrder } from "../../data/puppetConfig";
import { logicalStage, performancePuppetViewScale } from "../../data/themeConfig";
import type { AssemblyPartTransforms } from "../../types/assembly";
import type { PerformanceControlPoints } from "../../types/performanceControlPoints";
import type { PerformanceBoneMetrics, PerformancePuppetTransform } from "../../types/performanceSkeleton";
import type { PuppetPartId } from "../../types/puppet";
import type { PuppetSkinBundle } from "../../types/puppetSkin";
import { drawPuppet2d } from "./drawPuppet2d";
import { createHtmlPuppet } from "./puppetState";

const MEASURE_CANVAS_SIZE = 960;
const MEASURE_ROOT = { x: MEASURE_CANVAS_SIZE / 2, y: MEASURE_CANVAS_SIZE / 2 };
const ALPHA_THRESHOLD = 48;

export type PuppetAlignmentLayer = {
  puppetSkin: PuppetSkinBundle;
  assemblyTransforms?: AssemblyPartTransforms;
  boneMetrics?: PerformanceBoneMetrics;
  controlPoints?: PerformanceControlPoints;
  puppetTransform?: Pick<PerformancePuppetTransform, "scale" | "rotationDeg">;
};

const alignmentCache = new Map<string, number | null>();

const imageSignature = (
  skin: PuppetSkinBundle,
  imageCache: ReadonlyMap<string, HTMLImageElement>,
) =>
  (assemblyPartOrder as readonly PuppetPartId[])
    .map((partId) => {
      const url = skin.partImages[partId] ?? "";
      const img = url ? imageCache.get(url) : undefined;
      return `${partId}:${url}:${img?.complete ? 1 : 0}:${img?.naturalWidth ?? 0}x${img?.naturalHeight ?? 0}`;
    })
    .join("|");

const layerSignature = (
  layer: PuppetAlignmentLayer,
  imageCache: ReadonlyMap<string, HTMLImageElement>,
) =>
  JSON.stringify({
    images: imageSignature(layer.puppetSkin, imageCache),
    assemblyTransforms: layer.assemblyTransforms ?? null,
    boneMetrics: layer.boneMetrics ?? null,
    controlPoints: layer.controlPoints ?? null,
    puppetTransform: layer.puppetTransform ?? null,
  });

const withRootTransform = (
  ctx: CanvasRenderingContext2D,
  puppetX: number,
  puppetY: number,
  puppetTransform: Pick<PerformancePuppetTransform, "scale" | "rotationDeg"> | undefined,
  draw: () => void,
) => {
  const rootScale = puppetTransform?.scale ?? 1;
  const rootRotation = ((puppetTransform?.rotationDeg ?? 0) * Math.PI) / 180;
  ctx.save();
  ctx.translate(puppetX, puppetY);
  ctx.rotate(rootRotation);
  ctx.scale(rootScale, rootScale);
  ctx.translate(-puppetX, -puppetY);
  draw();
  ctx.restore();
};

const measurePuppetBottomOffset = (
  layer: PuppetAlignmentLayer,
  imageCache: ReadonlyMap<string, HTMLImageElement>,
): number | null => {
  const key = layerSignature(layer, imageCache);
  if (alignmentCache.has(key)) return alignmentCache.get(key) ?? null;

  const canvas = document.createElement("canvas");
  canvas.width = MEASURE_CANVAS_SIZE;
  canvas.height = MEASURE_CANVAS_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    alignmentCache.set(key, null);
    return null;
  }

  const puppet = createHtmlPuppet(logicalStage.width, logicalStage.height);
  puppet.baseX = MEASURE_ROOT.x;
  puppet.baseY = MEASURE_ROOT.y;
  puppet.x = MEASURE_ROOT.x;
  puppet.y = MEASURE_ROOT.y;
  puppet.lastX = MEASURE_ROOT.x;
  puppet.lastY = MEASURE_ROOT.y;
  puppet.lastTargetX = MEASURE_ROOT.x;
  puppet.lastTargetY = MEASURE_ROOT.y;
  puppet.targets.x = MEASURE_ROOT.x;
  puppet.targets.y = MEASURE_ROOT.y;

  ctx.clearRect(0, 0, MEASURE_CANVAS_SIZE, MEASURE_CANVAS_SIZE);
  withRootTransform(ctx, puppet.x, puppet.y, layer.puppetTransform, () => {
    drawPuppet2d(
      ctx,
      puppet,
      1,
      layer.puppetSkin,
      imageCache,
      performancePuppetViewScale,
      undefined,
      false,
      layer.assemblyTransforms,
      layer.boneMetrics,
      layer.controlPoints,
      { disableShadow: true },
      false,
    );
  });

  try {
    const { data, width, height } = ctx.getImageData(0, 0, MEASURE_CANVAS_SIZE, MEASURE_CANVAS_SIZE);
    for (let y = height - 1; y >= 0; y -= 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
          const offset = y - MEASURE_ROOT.y;
          alignmentCache.set(key, offset);
          return offset;
        }
      }
    }
  } catch {
    alignmentCache.set(key, null);
    return null;
  }

  alignmentCache.set(key, null);
  return null;
};

export const resolvePuppetBottomAlignedBaseY = (
  target: PuppetAlignmentLayer & { nominalY: number },
  reference: PuppetAlignmentLayer & { nominalY: number },
  imageCache: ReadonlyMap<string, HTMLImageElement>,
) => {
  const targetBottomOffset = measurePuppetBottomOffset(target, imageCache);
  const referenceBottomOffset = measurePuppetBottomOffset(reference, imageCache);
  if (targetBottomOffset === null || referenceBottomOffset === null) return target.nominalY;
  return reference.nominalY + referenceBottomOffset - targetBottomOffset;
};
