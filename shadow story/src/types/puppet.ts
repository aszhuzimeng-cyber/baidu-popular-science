export interface Vec2 {
  x: number;
  y: number;
}

export type PuppetPartId =
  | "head"
  | "torso"
  | "pelvis"
  | "leftUpperArm"
  | "leftForearm"
  | "rightUpperArm"
  | "rightForearm"
  | "leftLeg"
  | "rightLeg";

export type PuppetJointId =
  | "neck"
  | "lumbar"
  | "leftShoulder"
  | "leftElbow"
  | "leftHand"
  | "rightShoulder"
  | "rightElbow"
  | "rightHand"
  | "waist"
  | "leftHip"
  | "rightHip"
  | "leftFoot"
  | "rightFoot";

export type PuppetControlPointId = "root" | "leftHand" | "rightHand";

export interface PuppetPartConfig {
  id: PuppetPartId;
  length: number;
  width: number;
  color: string;
  accent: string;
}

export interface PuppetJointConfig {
  id: PuppetJointId;
  parent: PuppetPartId;
  child?: PuppetPartId;
  limit: [number, number];
}

export interface PuppetConstraints {
  shoulder: [number, number];
  elbow: [number, number];
  waist: [number, number];
  leg: [number, number];
  head: [number, number];
}

export interface PuppetRootTransform {
  x: number;
  y: number;
}

export interface PuppetLocalPose {
  head: number;
  torso: number;
  pelvis: number;
  leftUpperArm: number;
  leftForearm: number;
  rightUpperArm: number;
  rightForearm: number;
  leftLeg: number;
  rightLeg: number;
}

export interface PuppetWorldJoints {
  neck: Vec2;
  lumbar: Vec2;
  leftShoulder: Vec2;
  leftElbow: Vec2;
  leftHand: Vec2;
  rightShoulder: Vec2;
  rightElbow: Vec2;
  rightHand: Vec2;
  waist: Vec2;
  leftHip: Vec2;
  rightHip: Vec2;
  leftFoot: Vec2;
  rightFoot: Vec2;
}

export interface PuppetRuntimeState {
  pose: PuppetLocalPose;
  joints: PuppetWorldJoints;
  rootVelocity: Vec2;
  torsoAngularVelocity: number;
  pelvisAngularVelocity: number;
  leftLegVelocity: number;
  rightLegVelocity: number;
  headAngularVelocity: number;
  previousRoot: Vec2;
  leftForearmLag: number;
  rightForearmLag: number;
}

export interface HandTargets {
  left: Vec2;
  right: Vec2;
}
