import { partAssembly } from "./assemblyLayout";
import { TUNED_ASSEMBLY_DEFAULTS } from "./assemblyTunedPresets";
import { assemblyPartOrder, characterCards } from "./puppetConfig";
import type { AssemblyPartTransforms } from "../types/assembly";
import type { PuppetPartId } from "../types/puppet";

/** 前大/小臂（右）默认顺时针 45°；后大/小臂（左）默认逆时针 35°，与散件在托盘上摆放一致 */
const DEFAULT_ARM_ROTATION_DEG: Partial<Record<PuppetPartId, number>> = {
  rightUpperArm: 45,
  rightForearm: 45,
  leftUpperArm: -35,
  leftForearm: -35,
};

export const createDefaultAssemblyPartTransforms = (): AssemblyPartTransforms => {
  const acc = {} as AssemblyPartTransforms;
  for (const id of assemblyPartOrder) {
    acc[id] = {
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotationDeg: DEFAULT_ARM_ROTATION_DEG[id] ?? 0,
      zIndex: partAssembly[id].zIndex,
    };
  }
  return acc;
};

const cloneTuned = (t: AssemblyPartTransforms): AssemblyPartTransforms =>
  assemblyPartOrder.reduce((acc, id) => {
    const p = t[id];
    acc[id] = p ? { ...p } : p!;
    return acc;
  }, {} as AssemblyPartTransforms);

export const createInitialAssemblyTransformsByCharacterId = (): Record<string, AssemblyPartTransforms> =>
  characterCards.reduce<Record<string, AssemblyPartTransforms>>((acc, card) => {
    const snap = TUNED_ASSEMBLY_DEFAULTS[card.id];
    acc[card.id] = snap
      ? cloneTuned(snap.partTransforms)
      : createDefaultAssemblyPartTransforms();
    return acc;
  }, {});
