import { dist } from "../utils/math";
import type { PuppetPartId, Vec2 } from "../types/puppet";

/**
 * @param anchorTargetMap 各部件在幕布上应对齐的**锚点**位置（与 PNG 外接框无关，允许大幅重叠）
 * @param point 当前拖拽的部件锚点在幕布上的坐标
 */
export const useSnapAssembly = (
  anchorTargetMap: Record<PuppetPartId, Vec2>,
  threshold = 64,
) => {
  const getSnapTarget = (partId: PuppetPartId, point: Vec2) => {
    const target = anchorTargetMap[partId];
    if (!target) return null;
    return dist(target, point) <= threshold ? target : null;
  };

  return { getSnapTarget };
};
