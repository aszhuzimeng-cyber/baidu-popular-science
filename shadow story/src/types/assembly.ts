import type { PuppetPartId } from "./puppet";

/**
 * 装配调试：部件在幕布内归一化位置 + 显示变换。x/y 为 0~1，相对拼接舞台（左上为 0,0）。
 */
export type AssemblyPartTransform = {
  x: number;
  y: number;
  scale: number;
  /** 度，顺时针为正（与 CSS rotate 一致） */
  rotationDeg: number;
  zIndex: number;
};

export type AssemblyPartTransforms = Record<PuppetPartId, AssemblyPartTransform>;

/** 可导出到剪贴板、便于写回常量/JSON 的装配快照 */
export type AssemblyLayoutSnapshot = {
  version: 1;
  characterId: string;
  assemblyReferenceOpacity: number;
  partTransforms: AssemblyPartTransforms;
};
