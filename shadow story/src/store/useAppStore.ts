import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { createInitialAssemblyTransformsByCharacterId, createDefaultAssemblyPartTransforms } from "../data/assemblyDefaultTransforms";
import {
  createInitialPerformancePartTransformsByCharacterId,
  getDefaultPerformancePartTransformsForCharacter,
} from "../data/performanceStagePartPresets";
import { assemblyPartOrder, characterCards, defaultHandTargets, defaultPose, defaultRoot } from "../data/puppetConfig";
import type { AppStep, AssemblyState } from "../types/app";
import type { AssemblyPartTransform, AssemblyPartTransforms } from "../types/assembly";
import type { PuppetPartId, PuppetRootTransform, Vec2 } from "../types/puppet";
import type { PuppetRodSkinId, PuppetSkinBundle } from "../types/puppetSkin";
import { emptyPuppetSkinBundle } from "../types/puppetSkin";
import { getScenePaletteDefaultScale } from "../data/scenePalette";
import type { SceneElementType, SceneItem, SceneTransform } from "../types/scene";
import {
  DEFAULT_PERFORMANCE_BONES,
  DEFAULT_PERFORMANCE_PUPPET_TRANSFORM,
  type PerformanceBoneMetrics,
  type PerformancePuppetTransform,
} from "../types/performanceSkeleton";
import type { PerformanceControlPoints } from "../types/performanceControlPoints";

/** role-1 幕上：与骨骼调校页确认后的默认骨骼/贴图参数一致。 */
const ROLE1_FIXED_PERFORMANCE_BONES: PerformanceBoneMetrics = {
  skinScale: 0.79,
  skinScaleHead: 1.05,
  skinScaleTorso: 1.93,
  skinScalePelvis: 2.47,
  skinScaleLeftUpperArm: 0.89,
  skinScaleLeftForearm: 1.99,
  skinScaleRightUpperArm: 0.89,
  skinScaleRightForearm: 1.99,
  skinScaleLeftLeg: 4.87,
  skinScaleRightLeg: 4.87,
  offsetHeadX: -8,
  offsetHeadY: -8,
  offsetTorsoX: -2,
  offsetTorsoY: -30,
  offsetPelvisX: 0,
  offsetPelvisY: -26,
  offsetLeftUpperArmX: 18,
  offsetLeftUpperArmY: -15,
  offsetLeftForearmX: 22,
  offsetLeftForearmY: -33,
  offsetRightUpperArmX: -10,
  offsetRightUpperArmY: -14,
  offsetRightForearmX: -24,
  offsetRightForearmY: -39,
  offsetLeftLegX: -23,
  offsetLeftLegY: -29,
  offsetRightLegX: 2,
  offsetRightLegY: -23,
  jointShoulderX: -7,
  jointShoulderY: 0,
  jointElbowX: 0,
  jointElbowY: 1,
  jointHipX: 0,
  jointHipY: 0,
  jointKneeX: 0,
  jointKneeY: 0,
  jointLeftShoulderX: -7,
  jointLeftShoulderY: 0,
  jointRightShoulderX: -7,
  jointRightShoulderY: 0,
  jointLeftElbowX: 4.93,
  jointLeftElbowY: -7.5,
  jointRightElbowX: -3.99,
  jointRightElbowY: -4.37,
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
  shoulderY: 80,
  upperArmLen: 65,
  foreArmLen: 55,
  torsoRise: 90,
  torsoHeight: 80,
  hipY: 80,
  thighLen: 65,
  footY: 60,
  neckOffsetY: 10,
  headTorsoLagFactor: 1,
  legVisualScaleMin: 0.75,
};

const ROLE2_FIXED_PERFORMANCE_BONES: PerformanceBoneMetrics = {
  ...ROLE1_FIXED_PERFORMANCE_BONES,
  offsetHeadX: 5,
  offsetHeadY: -21,
  offsetTorsoX: -2,
  offsetTorsoY: -29,
  offsetPelvisX: 0,
  offsetPelvisY: -75,
  offsetLeftUpperArmX: 14,
  offsetLeftUpperArmY: -17,
  offsetLeftForearmX: 39,
  offsetLeftForearmY: -52,
  offsetRightUpperArmX: -20,
  offsetRightUpperArmY: -18,
  offsetRightForearmX: -17,
  offsetRightForearmY: -56,
  offsetLeftLegX: -7,
  offsetLeftLegY: -23,
  offsetRightLegX: 8,
  offsetRightLegY: -23,
  jointLeftShoulderX: -0.1,
  jointLeftShoulderY: -16.5,
  jointRightShoulderX: -3.94,
  jointRightShoulderY: -12.75,
  jointLeftElbowX: -5.13,
  jointLeftElbowY: -16.76,
  jointRightElbowX: -9.4,
  jointRightElbowY: -16.91,
  jointLeftHipX: -13.47,
  jointLeftHipY: -73.5,
  jointRightHipX: 15,
  jointRightHipY: -71.5,
  jointLeftKneeX: -14.5,
  jointLeftKneeY: -13.5,
  jointRightKneeX: 16.5,
  jointRightKneeY: -10,
  jointNeckRodX: 0.36,
  jointNeckRodY: -28.22,
  jointRearHandRodX: -8,
  jointRearHandRodY: -20.5,
  jointFrontHandRodX: -20,
  jointFrontHandRodY: -11.5,
};

const ROLE3_FIXED_PERFORMANCE_BONES: PerformanceBoneMetrics = {
  ...ROLE1_FIXED_PERFORMANCE_BONES,
  offsetHeadX: 42,
  offsetHeadY: 59,
  offsetTorsoX: -2,
  offsetTorsoY: -82,
  offsetPelvisX: 4,
  offsetPelvisY: -151,
  offsetLeftUpperArmX: 28,
  offsetLeftUpperArmY: -52,
  offsetLeftForearmX: 60,
  offsetLeftForearmY: -107,
  offsetRightUpperArmX: 4,
  offsetRightUpperArmY: -64,
  offsetRightForearmX: 16,
  offsetRightForearmY: -113,
  offsetLeftLegX: 22,
  offsetLeftLegY: -82,
  offsetRightLegX: 22,
  offsetRightLegY: -76,
  jointLeftShoulderX: 27.75,
  jointLeftShoulderY: -38.87,
  jointRightShoulderX: 23.37,
  jointRightShoulderY: -37.69,
  jointLeftElbowX: 22.5,
  jointLeftElbowY: -47.5,
  jointRightElbowX: 29,
  jointRightElbowY: -50,
  jointLeftHipX: 14,
  jointLeftHipY: -120,
  jointRightHipX: 33.5,
  jointRightHipY: -115.82,
  jointLeftKneeX: 20.5,
  jointLeftKneeY: -60.5,
  jointRightKneeX: 33.5,
  jointRightKneeY: -62.5,
  jointNeckRodX: 15.22,
  jointNeckRodY: -54,
  jointRearHandRodX: -26.5,
  jointRearHandRodY: -50,
  jointFrontHandRodX: 29,
  jointFrontHandRodY: -41.5,
  headTorsoLagFactor: 0.35,
};

const ROLE4_FIXED_PERFORMANCE_BONES: PerformanceBoneMetrics = {
  ...ROLE3_FIXED_PERFORMANCE_BONES,
  offsetHeadX: -2,
  offsetHeadY: 4,
  offsetTorsoX: -2,
  offsetTorsoY: -2,
  offsetPelvisX: 4,
  offsetPelvisY: 4,
  offsetLeftUpperArmX: 22,
  offsetLeftUpperArmY: -2,
  offsetLeftForearmX: 16,
  offsetLeftForearmY: -267,
  offsetRightUpperArmX: -15,
  offsetRightUpperArmY: -2,
  offsetRightForearmX: -64,
  offsetRightForearmY: -255,
  offsetLeftLegX: -9,
  offsetLeftLegY: -2,
  offsetRightLegX: 16,
  offsetRightLegY: -2,
  jointLeftShoulderX: 3.5,
  jointLeftShoulderY: 10,
  jointRightShoulderX: -3,
  jointRightShoulderY: 7.5,
  jointLeftElbowX: 16,
  jointLeftElbowY: -1,
  jointRightElbowX: 12,
  jointRightElbowY: -1,
  jointLeftHipX: -5,
  jointLeftHipY: -26.5,
  jointRightHipX: 18.5,
  jointRightHipY: -30.5,
  jointLeftKneeX: -3,
  jointLeftKneeY: -60.5,
  jointRightKneeX: 29,
  jointRightKneeY: -62.5,
  jointNeckRodX: 3.5,
  jointNeckRodY: 1.5,
  jointRearHandRodX: -33,
  jointRearHandRodY: -50,
  jointFrontHandRodX: 14,
  jointFrontHandRodY: -35,
  headTorsoLagFactor: 0.35,
  legVisualScaleMin: 0.02,
};

const ROLE1_FIXED_PERFORMANCE_CONTROL_POINTS: PerformanceControlPoints = {
  neckX: -1.5,
  neckY: 0,
  rearHandX: 18.5,
  rearHandY: 16,
  frontHandX: -16.5,
  frontHandY: 13,
  leftShoulderX: 0,
  leftShoulderY: 0,
  leftElbowX: -2.5,
  leftElbowY: 0,
  rightShoulderX: -1.5,
  rightShoulderY: -0.5,
  rightElbowX: -1.5,
  rightElbowY: 0,
  leftHipX: 0,
  leftHipY: 0,
  rightHipX: 0,
  rightHipY: 0,
  pelvisX: 0,
  pelvisY: 0,
};

const getDefaultPerformanceBonesForCharacter = (characterId: string): PerformanceBoneMetrics =>
  characterId === "role-2"
    ? { ...ROLE2_FIXED_PERFORMANCE_BONES }
    : characterId === "role-3"
      ? { ...ROLE3_FIXED_PERFORMANCE_BONES }
      : characterId === "role-4"
        ? { ...ROLE4_FIXED_PERFORMANCE_BONES }
        : { ...ROLE1_FIXED_PERFORMANCE_BONES };

const createRole1LikePerformanceBonesByCharacterId = (): Record<string, PerformanceBoneMetrics> =>
  characterCards.reduce<Record<string, PerformanceBoneMetrics>>((acc, card) => {
    acc[card.id] = getDefaultPerformanceBonesForCharacter(card.id);
    return acc;
  }, {});

const createRole1LikePerformanceControlPointsByCharacterId = (): Record<string, PerformanceControlPoints> =>
  characterCards.reduce<Record<string, PerformanceControlPoints>>((acc, card) => {
    acc[card.id] = { ...ROLE1_FIXED_PERFORMANCE_CONTROL_POINTS };
    return acc;
  }, {});

const ROLE1_FIXED_PERFORMANCE_PUPPET_TRANSFORM: PerformancePuppetTransform = {
  ...DEFAULT_PERFORMANCE_PUPPET_TRANSFORM,
  x: 720,
  y: 332,
  scale: 0.88,
  rotationDeg: 0,
};

const ROLE2_FIXED_PERFORMANCE_PUPPET_TRANSFORM: PerformancePuppetTransform = {
  ...DEFAULT_PERFORMANCE_PUPPET_TRANSFORM,
  x: 720,
  y: 332,
  scale: 0.88,
  rotationDeg: 0,
};

const ROLE3_FIXED_PERFORMANCE_PUPPET_TRANSFORM: PerformancePuppetTransform = {
  ...DEFAULT_PERFORMANCE_PUPPET_TRANSFORM,
  x: 720,
  y: 332,
  scale: 0.88,
  rotationDeg: 0,
};

const ROLE4_FIXED_PERFORMANCE_PUPPET_TRANSFORM: PerformancePuppetTransform = {
  ...DEFAULT_PERFORMANCE_PUPPET_TRANSFORM,
  x: 720,
  y: 332,
  scale: 0.968,
  rotationDeg: 0,
};

const getDefaultPerformancePuppetTransformForCharacter = (characterId: string): PerformancePuppetTransform =>
  characterId === "role-1"
    ? { ...ROLE1_FIXED_PERFORMANCE_PUPPET_TRANSFORM }
    : characterId === "role-2"
      ? { ...ROLE2_FIXED_PERFORMANCE_PUPPET_TRANSFORM }
      : characterId === "role-3"
        ? { ...ROLE3_FIXED_PERFORMANCE_PUPPET_TRANSFORM }
        : characterId === "role-4"
          ? { ...ROLE4_FIXED_PERFORMANCE_PUPPET_TRANSFORM }
          : { ...DEFAULT_PERFORMANCE_PUPPET_TRANSFORM };

const createInitialPerformancePuppetTransformsByCharacterId = (): Record<string, PerformancePuppetTransform> =>
  characterCards.reduce<Record<string, PerformancePuppetTransform>>((acc, card) => {
    acc[card.id] = getDefaultPerformancePuppetTransformForCharacter(card.id);
    return acc;
  }, {});

const initialAssemblyState = (): AssemblyState =>
  assemblyPartOrder.reduce((acc, partId) => {
    acc[partId] = false;
    return acc;
  }, {} as AssemblyState);

const initialPuppetSkinByCharacterId = (): Record<string, PuppetSkinBundle> =>
  characterCards.reduce<Record<string, PuppetSkinBundle>>((acc, card) => {
    acc[card.id] = emptyPuppetSkinBundle();
    return acc;
  }, {});

const initialAssembledPartsByCharacterId = (): Record<string, AssemblyState> =>
  characterCards.reduce<Record<string, AssemblyState>>((acc, card) => {
    acc[card.id] = initialAssemblyState();
    return acc;
  }, {});

const createSceneItem = (
  type: SceneElementType,
  index: number,
  initial?: Partial<Pick<SceneTransform, "x" | "y">>,
): SceneItem => ({
  id: `${type}-${Date.now()}-${index}`,
  type,
  zIndex: index + 1,
  transform: {
    x: initial?.x ?? 640 + index * 32,
    y: initial?.y ?? 330 + index * 28,
    scale: getScenePaletteDefaultScale(type),
    rotation: 0,
  },
});

interface AppStoreState {
  currentStep: AppStep;
  selectedCharacterId: string;
  assembledPartsByCharacterId: Record<string, AssemblyState>;
  assembledParts: AssemblyState;
  isAssemblyComplete: boolean;
  sceneItems: SceneItem[];
  selectedSceneItemId: string | null;
  puppetRoot: PuppetRootTransform;
  puppetPose: typeof defaultPose;
  leftHandTarget: Vec2;
  rightHandTarget: Vec2;
  handLinkedAngle: number;
  leftHandFineAngle: number;
  rightHandFineAngle: number;
  torsoControl: number;
  torsoBendControl: number;
  bothHandRing: Vec2;
  leftHandRing: Vec2;
  rightHandRing: Vec2;
  isFlipped: boolean;
  showPerformanceRods: boolean;
  /** 0.3~0.5，完整参考图底图不透明度 */
  assemblyReferenceOpacity: number;
  /** 按角色存各部件在拼接舞台上的手调变换（归一化 x/y + scale + rotation + z） */
  assemblyPartTransformsByCharacterId: Record<string, Record<PuppetPartId, AssemblyPartTransform>>;
  /**
   * 仅幕上表演用：默认与拼接表独立。
   */
  performancePartTransformsByCharacterId: Record<string, AssemblyPartTransforms>;
  /** 幕上整个人偶的位置/整体大小/整体旋转（按角色存） */
  performancePuppetTransformsByCharacterId: Record<string, PerformancePuppetTransform>;
  /** 幕上表演骨骼调参（按角色存） */
  performanceBonesByCharacterId: Record<string, PerformanceBoneMetrics>;
  /** 幕上表演控制点偏移（仅影响操控映射，不改部件结构） */
  performanceControlPointsByCharacterId: Record<string, PerformanceControlPoints>;
  setAssemblyPartTransform: (
    characterId: string,
    partId: PuppetPartId,
    patch: Partial<AssemblyPartTransform>,
  ) => void;
  setPerformancePuppetTransform: (
    characterId: string,
    patch: Partial<PerformancePuppetTransform>,
  ) => void;
  markAssemblyComplete: () => void;
  /** 按角色存皮影部件图与三杆图；拼接页与幕上表演共用 */
  puppetSkinByCharacterId: Record<string, PuppetSkinBundle>;
  setPuppetPartImageUrl: (characterId: string, partId: PuppetPartId, url: string | null) => void;
  setPuppetRodImageUrl: (characterId: string, rodId: PuppetRodSkinId, url: string | null) => void;
  setPuppetReferenceImageUrl: (characterId: string, url: string | null) => void;
  setStep: (step: AppStep) => void;
  selectCharacter: (id: string) => void;
  placePart: (partId: PuppetPartId) => void;
  resetAssembly: () => void;
  addSceneItem: (type: SceneElementType) => void;
  addSceneItemAt: (type: SceneElementType, x: number, y: number) => void;
  updateSceneItem: (id: string, transform: Partial<SceneTransform>) => void;
  removeSceneItem: (id: string) => void;
  selectSceneItem: (id: string | null) => void;
  setRootPosition: (root: Partial<PuppetRootTransform>) => void;
  setHandTarget: (side: "left" | "right", target: Vec2) => void;
  setHandLinkedAngle: (angle: number) => void;
  setHandFineAngle: (side: "left" | "right", angle: number) => void;
  setTorsoControl: (value: number) => void;
  setTorsoBendControl: (value: number) => void;
  setHandRing: (ring: "both" | "left" | "right", value: Vec2) => void;
  resetPose: () => void;
  flipPuppet: () => void;
  togglePerformanceRods: () => void;
  restartAll: () => void;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  currentStep: "assembly",
  selectedCharacterId: "role-1",
  assembledPartsByCharacterId: initialAssembledPartsByCharacterId(),
  assembledParts: initialAssemblyState(),
  isAssemblyComplete: false,
  sceneItems: [],
  selectedSceneItemId: null,
  puppetRoot: defaultRoot,
  puppetPose: defaultPose,
  leftHandTarget: defaultHandTargets.left,
  rightHandTarget: defaultHandTargets.right,
  handLinkedAngle: 0,
  leftHandFineAngle: 0,
  rightHandFineAngle: 0,
  torsoControl: 0,
  torsoBendControl: 0,
  bothHandRing: { x: 0, y: 0 },
  leftHandRing: { x: 0, y: 0 },
  rightHandRing: { x: 0, y: 0 },
  isFlipped: false,
  showPerformanceRods: true,
  assemblyReferenceOpacity: 0.4,
  assemblyPartTransformsByCharacterId: createInitialAssemblyTransformsByCharacterId(),
  performancePartTransformsByCharacterId: createInitialPerformancePartTransformsByCharacterId(),
  performancePuppetTransformsByCharacterId: createInitialPerformancePuppetTransformsByCharacterId(),
  performanceBonesByCharacterId: createRole1LikePerformanceBonesByCharacterId(),
  performanceControlPointsByCharacterId: createRole1LikePerformanceControlPointsByCharacterId(),
  puppetSkinByCharacterId: initialPuppetSkinByCharacterId(),

  setAssemblyPartTransform: (characterId, partId, patch) =>
    set((state) => {
      const prevMap = state.assemblyPartTransformsByCharacterId[characterId] ?? createDefaultAssemblyPartTransforms();
      const prev = prevMap[partId];
      return {
        assemblyPartTransformsByCharacterId: {
          ...state.assemblyPartTransformsByCharacterId,
          [characterId]: { ...prevMap, [partId]: { ...prev, ...patch } },
        },
      };
    }),
  setPerformancePuppetTransform: (characterId, patch) =>
    set((state) => {
      const prev =
        state.performancePuppetTransformsByCharacterId[characterId] ??
        DEFAULT_PERFORMANCE_PUPPET_TRANSFORM;
      return {
        performancePuppetTransformsByCharacterId: {
          ...state.performancePuppetTransformsByCharacterId,
          [characterId]: { ...prev, ...patch },
        },
      };
    }),
  markAssemblyComplete: () =>
    set((state) => {
      const allTrue = assemblyPartOrder.reduce<AssemblyState>((acc, partId) => {
        acc[partId] = true;
        return acc;
      }, {} as AssemblyState);
      return {
        assembledParts: allTrue,
        assembledPartsByCharacterId: {
          ...state.assembledPartsByCharacterId,
          [state.selectedCharacterId]: allTrue,
        },
        isAssemblyComplete: true,
      };
    }),

  setPuppetPartImageUrl: (characterId, partId, url) =>
    set((state) => {
      const prevBundle = state.puppetSkinByCharacterId[characterId] ?? emptyPuppetSkinBundle();
      const nextParts = { ...prevBundle.partImages };
      if (url) nextParts[partId] = url;
      else delete nextParts[partId];
      return {
        puppetSkinByCharacterId: {
          ...state.puppetSkinByCharacterId,
          [characterId]: { ...prevBundle, partImages: nextParts },
        },
      };
    }),

  setPuppetRodImageUrl: (characterId, rodId, url) =>
    set((state) => {
      const prevBundle = state.puppetSkinByCharacterId[characterId] ?? emptyPuppetSkinBundle();
      const nextRods = { ...prevBundle.rodImages };
      if (url) nextRods[rodId] = url;
      else delete nextRods[rodId];
      return {
        puppetSkinByCharacterId: {
          ...state.puppetSkinByCharacterId,
          [characterId]: { ...prevBundle, rodImages: nextRods },
        },
      };
    }),

  setPuppetReferenceImageUrl: (characterId, url) =>
    set((state) => {
      const prevBundle = state.puppetSkinByCharacterId[characterId] ?? emptyPuppetSkinBundle();
      return {
        puppetSkinByCharacterId: {
          ...state.puppetSkinByCharacterId,
          [characterId]: {
            ...prevBundle,
            fullReferenceUrl: url ?? undefined,
          },
        },
      };
    }),

  setStep: (step) => set({ currentStep: step }),
  selectCharacter: (id) =>
    set((state) => {
      const nextSkinByCharacterId = state.puppetSkinByCharacterId[id]
        ? state.puppetSkinByCharacterId
        : { ...state.puppetSkinByCharacterId, [id]: emptyPuppetSkinBundle() };
      const nextAssembledByCharacterId = state.assembledPartsByCharacterId[id]
        ? state.assembledPartsByCharacterId
        : { ...state.assembledPartsByCharacterId, [id]: initialAssemblyState() };
      const nextAssembledParts = nextAssembledByCharacterId[id];
      return {
        selectedCharacterId: id,
        puppetSkinByCharacterId: nextSkinByCharacterId,
        assembledPartsByCharacterId: nextAssembledByCharacterId,
        performanceBonesByCharacterId: state.performanceBonesByCharacterId[id]
          ? state.performanceBonesByCharacterId
          : { ...state.performanceBonesByCharacterId, [id]: getDefaultPerformanceBonesForCharacter(id) },
        performanceControlPointsByCharacterId: state.performanceControlPointsByCharacterId[id]
          ? state.performanceControlPointsByCharacterId
          : {
              ...state.performanceControlPointsByCharacterId,
              [id]: { ...ROLE1_FIXED_PERFORMANCE_CONTROL_POINTS },
            },
        performancePartTransformsByCharacterId: state.performancePartTransformsByCharacterId[id]
          ? state.performancePartTransformsByCharacterId
          : {
              ...state.performancePartTransformsByCharacterId,
              [id]: getDefaultPerformancePartTransformsForCharacter(id),
            },
        performancePuppetTransformsByCharacterId: state.performancePuppetTransformsByCharacterId[id]
          ? state.performancePuppetTransformsByCharacterId
          : {
              ...state.performancePuppetTransformsByCharacterId,
              [id]: getDefaultPerformancePuppetTransformForCharacter(id),
            },
        assembledParts: nextAssembledParts,
        isAssemblyComplete: Object.values(nextAssembledParts).every(Boolean),
      };
    }),

  placePart: (partId) =>
    set((state) => {
      const assembledParts = { ...state.assembledParts, [partId]: true };
      const isAssemblyComplete = Object.values(assembledParts).every(Boolean);
      return {
        assembledPartsByCharacterId: {
          ...state.assembledPartsByCharacterId,
          [state.selectedCharacterId]: assembledParts,
        },
        assembledParts,
        isAssemblyComplete,
      };
    }),

  resetAssembly: () =>
    set((state) => {
      const nextAssembledParts = initialAssemblyState();
      return {
        assembledPartsByCharacterId: {
          ...state.assembledPartsByCharacterId,
          [state.selectedCharacterId]: nextAssembledParts,
        },
        assembledParts: nextAssembledParts,
        isAssemblyComplete: false,
        currentStep: "assembly",
      };
    }),

  addSceneItem: (type) =>
    set((state) => ({
      sceneItems: [...state.sceneItems, createSceneItem(type, state.sceneItems.length)],
      selectedSceneItemId: null,
    })),
  addSceneItemAt: (type, x, y) =>
    set((state) => ({
      sceneItems: [...state.sceneItems, createSceneItem(type, state.sceneItems.length, { x, y })],
      selectedSceneItemId: null,
    })),

  updateSceneItem: (id, transform) =>
    set((state) => ({
      sceneItems: state.sceneItems.map((item) =>
        item.id === id
          ? { ...item, transform: { ...item.transform, ...transform } }
          : item,
      ),
    })),

  removeSceneItem: (id) =>
    set((state) => ({
      sceneItems: state.sceneItems.filter((item) => item.id !== id),
      selectedSceneItemId: state.selectedSceneItemId === id ? null : state.selectedSceneItemId,
    })),

  selectSceneItem: (id) => set({ selectedSceneItemId: id }),

  setRootPosition: (root) =>
    set((state) => ({
      puppetRoot: { ...state.puppetRoot, ...root },
    })),

  setHandTarget: (side, target) =>
    set(() => (side === "left" ? { leftHandTarget: target } : { rightHandTarget: target })),
  setHandLinkedAngle: (angle) => set({ handLinkedAngle: angle }),
  setHandFineAngle: (side, angle) =>
    set(side === "left" ? { leftHandFineAngle: angle } : { rightHandFineAngle: angle }),
  setTorsoControl: (value) => set({ torsoControl: value }),
  setTorsoBendControl: (value) => set({ torsoBendControl: value }),
  setHandRing: (ring, value) =>
    set(
      ring === "both"
        ? { bothHandRing: value }
        : ring === "left"
          ? { leftHandRing: value }
          : { rightHandRing: value },
    ),

  resetPose: () =>
    set({
      puppetPose: defaultPose,
      leftHandTarget: defaultHandTargets.left,
      rightHandTarget: defaultHandTargets.right,
      handLinkedAngle: 0,
      leftHandFineAngle: 0,
      rightHandFineAngle: 0,
      torsoControl: 0,
      torsoBendControl: 0,
      bothHandRing: { x: 0, y: 0 },
      leftHandRing: { x: 0, y: 0 },
      rightHandRing: { x: 0, y: 0 },
      puppetRoot: defaultRoot,
    }),

  flipPuppet: () => set((state) => ({ isFlipped: !state.isFlipped })),
  togglePerformanceRods: () =>
    set((state) => ({ showPerformanceRods: !state.showPerformanceRods })),

  restartAll: () =>
    set((state) => ({
      currentStep: "assembly",
      selectedCharacterId: "role-1",
      assembledPartsByCharacterId: initialAssembledPartsByCharacterId(),
      assembledParts: initialAssemblyState(),
      isAssemblyComplete: false,
      assemblyPartTransformsByCharacterId: createInitialAssemblyTransformsByCharacterId(),
      performancePartTransformsByCharacterId: createInitialPerformancePartTransformsByCharacterId(),
      performancePuppetTransformsByCharacterId: createInitialPerformancePuppetTransformsByCharacterId(),
      performanceBonesByCharacterId: createRole1LikePerformanceBonesByCharacterId(),
      performanceControlPointsByCharacterId: createRole1LikePerformanceControlPointsByCharacterId(),
      sceneItems: [],
      selectedSceneItemId: null,
      puppetRoot: defaultRoot,
      puppetPose: defaultPose,
      leftHandTarget: defaultHandTargets.left,
      rightHandTarget: defaultHandTargets.right,
      handLinkedAngle: 0,
      leftHandFineAngle: 0,
      rightHandFineAngle: 0,
      torsoControl: 0,
      torsoBendControl: 0,
      bothHandRing: { x: 0, y: 0 },
      leftHandRing: { x: 0, y: 0 },
      rightHandRing: { x: 0, y: 0 },
      isFlipped: false,
      showPerformanceRods: true,
      puppetSkinByCharacterId: state.puppetSkinByCharacterId,
    })),
}));

export const useSelectedSceneItem = () => {
  const { sceneItems, selectedSceneItemId } = useAppStore(useShallow((state) => ({
    sceneItems: state.sceneItems,
    selectedSceneItemId: state.selectedSceneItemId,
  })));

  return sceneItems.find((item) => item.id === selectedSceneItemId) ?? null;
};

export const canEnterScene = (state = getCurrentStoreState()) =>
  state.isAssemblyComplete;

export const getCurrentStoreState = () => useAppStore.getState();
