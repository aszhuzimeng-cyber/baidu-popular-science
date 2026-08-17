import type { AssemblyPartTransforms } from "../types/assembly";
import { TUNED_ASSEMBLY_DEFAULTS } from "./assemblyTunedPresets";
import { assemblyPartOrder, characterCards } from "./puppetConfig";

const cloneTransforms = (t: AssemblyPartTransforms): AssemblyPartTransforms =>
  assemblyPartOrder.reduce((acc, id) => {
    const p = t[id];
    acc[id] = p ? { ...p } : p!;
    return acc;
  }, {} as AssemblyPartTransforms);

/**
 * role-1 幕上部件初始位姿：基于拼接落盘结果，但允许幕上独立微调（例如手臂 rotationDeg）。
 * 这里的修改仅影响幕上预览/表演，不回写拼接默认表。
 */
const ROLE_1_PERFORMANCE_PART: AssemblyPartTransforms = {
  head: { x: 0.5041133604752801, y: 0.23381547736928, scale: 0.51, rotationDeg: 0, zIndex: 24 },
  leftUpperArm: { x: 0.5486, y: 0.3968006126122627, scale: 0.51, rotationDeg: 17, zIndex: 19 },
  leftForearm: { x: 0.6292, y: 0.5200841328441331, scale: 0.51, rotationDeg: 6, zIndex: 22 },
  rightUpperArm: { x: 0.46888264047147277, y: 0.41519270388422697, scale: 0.51, rotationDeg: 14, zIndex: 45 },
  rightForearm: { x: 0.35522207684760204, y: 0.5262150322668638, scale: 0.54, rotationDeg: 23, zIndex: 50 },
  torso: { x: 0.5074034114546041, y: 0.4846731605058485, scale: 0.51, rotationDeg: 0, zIndex: 32 },
  pelvis: { x: 0.5098714277397721, y: 0.7217255350962052, scale: 0.51, rotationDeg: 0, zIndex: 40 },
  leftLeg: { x: 0.457079986589085, y: 0.845507782852853, scale: 0.05, rotationDeg: 0, zIndex: 12 },
  rightLeg: { x: 0.53967774072826, y: 0.855573166586367, scale: 0.05, rotationDeg: 0, zIndex: 12 },
};

const ROLE_2_PERFORMANCE_PART: AssemblyPartTransforms = (() => {
  const base = cloneTransforms(TUNED_ASSEMBLY_DEFAULTS["role-2"].partTransforms);
  base.head.scale = 0.45;
  base.leftUpperArm.scale = 0.5;
  base.leftUpperArm.rotationDeg = 1.5;
  base.leftForearm.x = 0.6750120760888108;
  base.leftForearm.scale = 0.6;
  base.leftForearm.rotationDeg = 3.5;
  base.rightUpperArm.scale = 0.5;
  base.rightUpperArm.rotationDeg = 3.5;
  base.rightForearm.scale = 0.62;
  base.rightForearm.rotationDeg = 5.5;
  base.torso.scale = 0.5;
  base.pelvis.scale = 0.54;
  base.leftLeg.scale = 0.2758;
  base.rightLeg.scale = 0.2758;
  return base;
})();

const createRole1ReferencePerformancePart = (characterId: string): AssemblyPartTransforms => {
  const base = cloneTransforms(
    TUNED_ASSEMBLY_DEFAULTS[characterId]?.partTransforms ?? TUNED_ASSEMBLY_DEFAULTS["role-1"].partTransforms,
  );
  base.leftUpperArm.rotationDeg = ROLE_1_PERFORMANCE_PART.leftUpperArm.rotationDeg;
  base.leftForearm.rotationDeg = ROLE_1_PERFORMANCE_PART.leftForearm.rotationDeg;
  base.rightUpperArm.rotationDeg = ROLE_1_PERFORMANCE_PART.rightUpperArm.rotationDeg;
  base.rightForearm.rotationDeg = ROLE_1_PERFORMANCE_PART.rightForearm.rotationDeg;
  return base;
};

const ROLE_3_PERFORMANCE_PART: AssemblyPartTransforms = {
  head: { x: 0.4, y: 0.24940796662116058, scale: 0.71, rotationDeg: 0, zIndex: 11 },
  leftUpperArm: { x: 0.586558755487928, y: 0.3747375763568769, scale: 0.61, rotationDeg: 3.5, zIndex: 19 },
  leftForearm: { x: 0.6701954841631975, y: 0.48459141588291565, scale: 0.68, rotationDeg: -9.5, zIndex: 22 },
  rightUpperArm: { x: 0.4704007695071465, y: 0.35092233330279793, scale: 0.61, rotationDeg: 3.5, zIndex: 59 },
  rightForearm: { x: 0.412160288513481, y: 0.5103273712925133, scale: 0.68, rotationDeg: 1.5, zIndex: 50 },
  torso: { x: 0.5139616418586501, y: 0.3913786114779403, scale: 0.61, rotationDeg: 0, zIndex: 32 },
  pelvis: { x: 0.4, y: 0.5899456900118679, scale: 0.66, rotationDeg: 0, zIndex: 51 },
  leftLeg: { x: 0.517, y: 0.790270969501317, scale: 0.05, rotationDeg: 0, zIndex: 31 },
  rightLeg: { x: 0.571, y: 0.782621711, scale: 0.05, rotationDeg: 0, zIndex: 20 },
};
const ROLE_4_PERFORMANCE_PART: AssemblyPartTransforms = {
  head: { ...TUNED_ASSEMBLY_DEFAULTS["role-4"].partTransforms.head, scale: 0.75, rotationDeg: 0 },
  leftUpperArm: {
    ...TUNED_ASSEMBLY_DEFAULTS["role-4"].partTransforms.leftUpperArm,
    scale: 0.47,
    rotationDeg: 3.5,
  },
  leftForearm: {
    ...TUNED_ASSEMBLY_DEFAULTS["role-4"].partTransforms.leftForearm,
    scale: 1.09,
    rotationDeg: 5.5,
  },
  rightUpperArm: {
    ...TUNED_ASSEMBLY_DEFAULTS["role-4"].partTransforms.rightUpperArm,
    scale: 0.48,
    rotationDeg: 3.5,
  },
  rightForearm: {
    ...TUNED_ASSEMBLY_DEFAULTS["role-4"].partTransforms.rightForearm,
    scale: 1.09,
    rotationDeg: 1.5,
  },
  torso: { ...TUNED_ASSEMBLY_DEFAULTS["role-4"].partTransforms.torso, scale: 0.45, rotationDeg: 0 },
  pelvis: { ...TUNED_ASSEMBLY_DEFAULTS["role-4"].partTransforms.pelvis, scale: 0.5, rotationDeg: 0 },
  leftLeg: { ...TUNED_ASSEMBLY_DEFAULTS["role-4"].partTransforms.leftLeg, scale: 0.33, rotationDeg: 0 },
  rightLeg: { ...TUNED_ASSEMBLY_DEFAULTS["role-4"].partTransforms.rightLeg, scale: 0.33, rotationDeg: 0 },
};

const createPerformancePartFromAssembly = (characterId: string): AssemblyPartTransforms => {
  return createRole1ReferencePerformancePart(characterId);
};

/**
 * 最终传入 `drawPuppet2d` 的幕上部件表。
 * 各角色都用按自身素材缩放过的初始表；role-1 保留原幕上专用表。
 */
export const getPerformancePartTransformsForDraw = (
  characterId: string,
  storeTransforms: AssemblyPartTransforms,
): AssemblyPartTransforms => {
  void characterId;
  return storeTransforms;
};

export const getDefaultPerformancePartTransformsForCharacter = (characterId: string): AssemblyPartTransforms =>
  characterId === "role-1"
    ? cloneTransforms(ROLE_1_PERFORMANCE_PART)
    : characterId === "role-2"
      ? cloneTransforms(ROLE_2_PERFORMANCE_PART)
      : characterId === "role-3"
        ? cloneTransforms(ROLE_3_PERFORMANCE_PART)
        : characterId === "role-4"
          ? cloneTransforms(ROLE_4_PERFORMANCE_PART)
          : createPerformancePartFromAssembly(characterId);

export const createInitialPerformancePartTransformsByCharacterId = (): Record<string, AssemblyPartTransforms> =>
  characterCards.reduce<Record<string, AssemblyPartTransforms>>((acc, card) => {
    acc[card.id] = getDefaultPerformancePartTransformsForCharacter(card.id);
    return acc;
  }, {});
