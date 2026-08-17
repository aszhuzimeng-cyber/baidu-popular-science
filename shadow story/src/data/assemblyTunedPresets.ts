import type { AssemblyLayoutSnapshot, AssemblyPartTransforms } from "../types/assembly";
import { assemblyPartOrder } from "./puppetConfig";

/**
 * 手调落幕后固化：装配吸附与默认叠层以该表为准，保证能拼到同一姿态。
 * role-1 来自产品侧复制 JSON（v1）
 */
const ROLE_1: AssemblyLayoutSnapshot = {
  version: 1,
  characterId: "role-1",
  assemblyReferenceOpacity: 0.4,
  partTransforms: {
    head: { x: 0.5041133604752801, y: 0.23846664015997767, scale: 0.51, rotationDeg: 0, zIndex: 24 },
    leftUpperArm: {
      x: 0.56,
      y: 0.413,
      scale: 0.51,
      rotationDeg: -35,
      zIndex: 19,
    },
    leftForearm: {
      x: 0.662,
      y: 0.53,
      scale: 0.51,
      rotationDeg: -35,
      zIndex: 22,
    },
    rightUpperArm: {
      x: 0.46888264047147277,
      y: 0.41519270388422697,
      scale: 0.51,
      rotationDeg: 45,
      zIndex: 45,
    },
    rightForearm: {
      x: 0.339,
      y: 0.516,
      scale: 0.54,
      rotationDeg: 45,
      zIndex: 50,
    },
    torso: {
      x: 0.5074034114546041,
      y: 0.4846731605058485,
      scale: 0.51,
      rotationDeg: 0,
      zIndex: 32,
    },
    pelvis: { x: 0.5098714277397721, y: 0.7217255350962052, scale: 0.51, rotationDeg: 0, zIndex: 40 },
    leftLeg: { x: 0.457079986589085, y: 0.845507782852853, scale: 0.51, rotationDeg: 0, zIndex: 12 },
    rightLeg: { x: 0.53967774072826, y: 0.855573166586367, scale: 0.51, rotationDeg: 0, zIndex: 12 },
  },
};

const ROLE_2: AssemblyLayoutSnapshot = {
  version: 1,
  characterId: "role-2",
  assemblyReferenceOpacity: 0.4,
  partTransforms: {
    head: {
      x: 0.5147209220699513,
      y: 0.13595238214593316,
      scale: 0.2945,
      rotationDeg: 0,
      zIndex: 62,
    },
    leftUpperArm: {
      x: 0.563,
      y: 0.29,
      scale: 0.26201,
      rotationDeg: -35,
      zIndex: 58,
    },
    leftForearm: {
      x: 0.703,
      y: 0.39,
      scale: 0.26201,
      rotationDeg: -35,
      zIndex: 22,
    },
    rightUpperArm: {
      x: 0.4423113626053478,
      y: 0.288,
      scale: 0.26201,
      rotationDeg: 45,
      zIndex: 81,
    },
    rightForearm: {
      x: 0.337,
      y: 0.414,
      scale: 0.2774,
      rotationDeg: 45,
      zIndex: 50,
    },
    torso: {
      x: 0.4952564967535259,
      y: 0.354,
      scale: 0.285,
      rotationDeg: 0,
      zIndex: 69,
    },
    pelvis: {
      x: 0.5007615554499113,
      y: 0.527,
      scale: 0.285,
      rotationDeg: 0,
      zIndex: 40,
    },
    leftLeg: {
      x: 0.4605822052904928,
      y: 0.731,
      scale: 0.26201,
      rotationDeg: 0,
      zIndex: 12,
    },
    rightLeg: {
      x: 0.5535263886243668,
      y: 0.731,
      scale: 0.26201,
      rotationDeg: 0,
      zIndex: 12,
    },
  },
};

const ROLE_3: AssemblyLayoutSnapshot = {
  version: 1,
  characterId: "role-3",
  assemblyReferenceOpacity: 0.4,
  partTransforms: {
    head: {
      x: 0.42269357671821367,
      y: 0.25551428176855195,
      scale: 0.16,
      rotationDeg: 0,
      zIndex: 11,
    },
    leftUpperArm: {
      x: 0.43374835388624733,
      y: 0.3664360782510149,
      scale: 0.16,
      rotationDeg: -35,
      zIndex: 16,
    },
    leftForearm: {
      x: 0.5728981943913323,
      y: 0.48446755343076064,
      scale: 0.1672,
      rotationDeg: -35,
      zIndex: 135,
    },
    rightUpperArm: {
      x: 0.25029237590626335,
      y: 0.337912525895342,
      scale: 0.1672,
      rotationDeg: 45,
      zIndex: 59,
    },
    rightForearm: {
      x: 0.13958728009619292,
      y: 0.48988728604275195,
      scale: 0.177,
      rotationDeg: 45,
      zIndex: 122,
    },
    torso: {
      x: 0.3190586156259201,
      y: 0.3958203301186178,
      scale: 0.1672,
      rotationDeg: 0,
      zIndex: 32,
    },
    pelvis: {
      x: 0.3194759089637799,
      y: 0.5878993263574679,
      scale: 0.2,
      rotationDeg: 0,
      zIndex: 51,
    },
    leftLeg: {
      x: 0.325,
      y: 0.786,
      scale: 0.1672,
      rotationDeg: 0,
      zIndex: 31,
    },
    rightLeg: {
      x: 0.402,
      y: 0.78,
      scale: 0.17,
      rotationDeg: 0,
      zIndex: 20,
    },
  },
};

const ROLE_4: AssemblyLayoutSnapshot = {
  version: 1,
  characterId: "role-4",
  assemblyReferenceOpacity: 0.4,
  partTransforms: {
    head: {
      x: 0.51411336047528,
      y: 0.20981547736928044,
      scale: 0.5191,
      rotationDeg: 0,
      zIndex: 22,
    },
    leftUpperArm: {
      x: 0.5546,
      y: 0.446800612612263,
      scale: 0.5191,
      rotationDeg: -35,
      zIndex: 19,
    },
    leftForearm: {
      x: 0.609,
      y: 0.591,
      scale: 0.5191,
      rotationDeg: -35,
      zIndex: 22,
    },
    rightUpperArm: {
      x: 0.448,
      y: 0.443192703884227,
      scale: 0.5191,
      rotationDeg: 45,
      zIndex: 45,
    },
    rightForearm: {
      x: 0.293,
      y: 0.507215032266864,
      scale: 0.5497,
      rotationDeg: 45,
      zIndex: 50,
    },
    torso: {
      x: 0.5074034114546041,
      y: 0.4846731605058485,
      scale: 0.5191,
      rotationDeg: 0,
      zIndex: 32,
    },
    pelvis: {
      x: 0.507871427739772,
      y: 0.718725535096205,
      scale: 0.5191,
      rotationDeg: 0,
      zIndex: 24,
    },
    leftLeg: {
      x: 0.487079986589085,
      y: 0.834507782852853,
      scale: 0.5191,
      rotationDeg: 0,
      zIndex: 12,
    },
    rightLeg: {
      x: 0.53067774072826,
      y: 0.838573166586367,
      scale: 0.5191,
      rotationDeg: 0,
      zIndex: 12,
    },
  },
};

const cloneTransforms = (t: AssemblyPartTransforms): AssemblyPartTransforms =>
  assemblyPartOrder.reduce((acc, id) => {
    const p = t[id];
    acc[id] = p ? { ...p } : p!;
    return acc;
  }, {} as AssemblyPartTransforms);

export const TUNED_ASSEMBLY_DEFAULTS: Record<string, AssemblyLayoutSnapshot> = {
  "role-1": {
    ...ROLE_1,
    partTransforms: cloneTransforms(ROLE_1.partTransforms),
  },
  "role-2": {
    ...ROLE_2,
    partTransforms: cloneTransforms(ROLE_2.partTransforms),
  },
  "role-3": {
    ...ROLE_3,
    partTransforms: cloneTransforms(ROLE_3.partTransforms),
  },
  "role-4": {
    ...ROLE_4,
    partTransforms: cloneTransforms(ROLE_4.partTransforms),
  },
};
