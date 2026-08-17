export type SceneElementType = "willow" | "pavilion" | "bridge" | "bamboo";

export interface SceneTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface SceneItem {
  id: string;
  type: SceneElementType;
  transform: SceneTransform;
  zIndex: number;
}
