import type { PuppetConstraints, PuppetLocalPose, PuppetPartConfig, PuppetRootTransform, Vec2 } from "../types/puppet";
import { logicalStage, themeConfig } from "./themeConfig";

export const puppetParts: Record<string, PuppetPartConfig> = {
  head: { id: "head", length: 70, width: 56, color: "#f6e5c7", accent: themeConfig.puppet.accent },
  torso: { id: "torso", length: 182, width: 94, color: themeConfig.puppet.primary, accent: themeConfig.puppet.accent },
  pelvis: { id: "pelvis", length: 76, width: 82, color: "#a2382b", accent: themeConfig.puppet.accent },
  leftUpperArm: { id: "leftUpperArm", length: 120, width: 36, color: "#9f342c", accent: themeConfig.puppet.accent },
  leftForearm: { id: "leftForearm", length: 132, width: 30, color: "#c18a45", accent: "#f0d7a0" },
  rightUpperArm: { id: "rightUpperArm", length: 120, width: 36, color: "#9f342c", accent: themeConfig.puppet.accent },
  rightForearm: { id: "rightForearm", length: 132, width: 30, color: "#c18a45", accent: "#f0d7a0" },
  leftLeg: { id: "leftLeg", length: 170, width: 44, color: "#7a1f1b", accent: themeConfig.puppet.accent },
  rightLeg: { id: "rightLeg", length: 170, width: 44, color: "#7a1f1b", accent: themeConfig.puppet.accent },
};

export const defaultRoot: PuppetRootTransform = {
  x: logicalStage.width * 0.5,
  y: logicalStage.height * 0.58,
};

/** 皮影杆以前下方摆动为主，略收拢减轻极限拉伸与 IK 翻面 */
export const defaultHandTargets: { left: Vec2; right: Vec2 } = {
  left: { x: -168, y: -168 },
  right: { x: 168, y: -158 },
};

export const defaultPose: PuppetLocalPose = {
  head: 0,
  torso: 0,
  pelvis: 0,
  leftUpperArm: -18 * Math.PI / 180,
  leftForearm: 22 * Math.PI / 180,
  rightUpperArm: 18 * Math.PI / 180,
  rightForearm: -22 * Math.PI / 180,
  leftLeg: -4 * Math.PI / 180,
  rightLeg: 4 * Math.PI / 180,
};

export const puppetConstraints: PuppetConstraints = {
  /** 须覆盖文案中双手上举（约 ±60°～±80°）的 IK 上臂角，勿用过窄区间把动作夹死在身前 */
  shoulder: [-2.85, 2.85],
  elbow: [18 * Math.PI / 180, 55 * Math.PI / 180],
  waist: [-0.72, 0.72],
  leg: [-0.72, 0.72],
  head: [-0.42, 0.42],
};

/** 双锚脊柱：胯（髋）与腰（腰椎）分别限幅（弧度） */
export const puppetSpineLimits: { pelvis: [number, number]; lumbar: [number, number] } = {
  pelvis: [-0.28, 0.28],
  lumbar: [-24 * Math.PI / 180, 24 * Math.PI / 180],
};

export const assemblyPartOrder = [
  "head",
  "leftUpperArm",
  "leftForearm",
  "rightUpperArm",
  "rightForearm",
  "torso",
  "pelvis",
  "leftLeg",
  "rightLeg",
] as const;

export const characterCards = [
  { id: "role-1", name: "贵妃", accent: "#bb6853" },
  { id: "role-2", name: "青衣", accent: "#9aa77b" },
  { id: "role-3", name: "武旦", accent: "#6d5f53" },
  { id: "role-4", name: "花旦", accent: "#cb8e79" },
];

/**
 * 选择皮影侧栏小图。优先用 `fullReferenceUrl`（由 PuppetAssetLoader 从「整图/效果图/参考…」等合图或 `isCompositeRootReferencePath` 规则匹配）。
 * 本表仅作无识别结果时的公网回退；未配置则侧栏为渐变底。
 * 新素材已去掉 `role1` 前缀时，可在此填 `/assets/images/characters/整图.png` 等（需自行放入对应文件）。
 */
export const characterCardStaticThumb: Partial<Record<string, string>> = {
  "role-1": "/assets/images/characters/role-1-full.png",
  "role-2": "/assets/images/characters/role-2-full.png",
  "role-3": "/assets/images/characters/role-3-full.png",
  "role-4": "/assets/images/characters/role-4-full.png",
};
