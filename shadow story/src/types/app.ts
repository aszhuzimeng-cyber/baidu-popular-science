import type { PuppetPartId, PuppetRootTransform, PuppetLocalPose, Vec2 } from "./puppet";
import type { SceneItem } from "./scene";

export type AppStep = "assembly" | "scene" | "performance";

export type AssemblyState = Record<PuppetPartId, boolean>;

export interface AppStateSnapshot {
  currentStep: AppStep;
  assembledParts: AssemblyState;
  isAssemblyComplete: boolean;
  sceneItems: SceneItem[];
  puppetRoot: PuppetRootTransform;
  puppetPose: PuppetLocalPose;
  leftHandTarget: Vec2;
  rightHandTarget: Vec2;
  isFlipped: boolean;
}
