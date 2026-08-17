import type { SceneElementType } from "../types/scene";

/**
 * 场景装饰位图，放在 `public/assets/images/scene/` 下，由 Vite 以根路径提供。
 * 资源文件名与磁盘一致（`public/assets/images/scene/`），勿与类型键弄混。
 */
export const sceneDecorImageUrl: Record<SceneElementType, string> = {
  willow: "/assets/images/scene/willow.png",
  pavilion: "/assets/images/scene/pavilion.png",
  bridge: "/assets/images/scene/bridge.png",
  bamboo: "/assets/images/scene/bamboo.png",
};

export const getSceneDecorImageUrl = (type: SceneElementType): string => sceneDecorImageUrl[type];

export interface ScenePaletteItem {
  type: SceneElementType;
  /** 幕上/编辑区默认与矢量备用绘制时的基础倍率 */
  defaultScale: number;
}

export const scenePalette: ScenePaletteItem[] = [
  { type: "willow", defaultScale: 1 },
  { type: "pavilion", defaultScale: 1.1 },
  { type: "bridge", defaultScale: 1.05 },
  { type: "bamboo", defaultScale: 1.1 },
];

export const getScenePaletteDefaultScale = (type: SceneElementType): number =>
  scenePalette.find((p) => p.type === type)?.defaultScale ?? 1;
