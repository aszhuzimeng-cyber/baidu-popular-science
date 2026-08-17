import type { AssemblySlotLayout } from "./AssemblyCanvas";
import type { PuppetPartId } from "../../types/puppet";

export function findSlot(
  slots: AssemblySlotLayout[],
  id: PuppetPartId,
): AssemblySlotLayout | undefined {
  return slots.find((s) => s.id === id);
}

/** 与参考图一致：头与上躯干之间的窄中轴，用于底稿，非独立散件。 */
export function buildNeckRect(
  head: AssemblySlotLayout,
  torso: AssemblySlotLayout,
): { cx: number; cy: number; w: number; h: number } {
  const headB = head.y + head.height * 0.5;
  const torsoT = torso.y - torso.height * 0.5;
  const midY = (headB + torsoT) * 0.5;
  const gap = torsoT - headB;
  const h = gap < 0 ? Math.max(4, 5 + gap * 0.2) : Math.max(5, Math.min(22, gap * 0.85));
  const cy = midY;
  const cx = head.x * 0.4 + torso.x * 0.6;
  const w = Math.min(head.width, torso.width) * 0.3;
  return { cx, cy, w: Math.max(8, w), h };
}

export type JointId =
  | "neck"
  | "leftShoulder"
  | "rightShoulder"
  | "leftElbow"
  | "rightElbow"
  | "waist"
  | "leftHip"
  | "rightHip";

export type JointPointDef = { id: JointId; x: number; y: number };

/**
 * 关键连接点：用槽位与锚点推导，不贴「医学骨骼」。
 * — neck：颈带中心；肩/肘/胯取对应部件 slot 的 anchor，与幕上孔点一致
 */
export function buildJointPoints(slots: AssemblySlotLayout[]): JointPointDef[] {
  const s = (id: PuppetPartId) => findSlot(slots, id);
  const head = s("head");
  const torso = s("torso");
  const pelvis = s("pelvis");
  if (!head || !torso) return [];

  const neckR = buildNeckRect(head, torso);
  const out: JointPointDef[] = [{ id: "neck", x: neckR.cx, y: neckR.cy }];

  const lUA = s("leftUpperArm");
  const rUA = s("rightUpperArm");
  const lF = s("leftForearm");
  const rF = s("rightForearm");
  const lL = s("leftLeg");
  const rL = s("rightLeg");
  if (lUA) out.push({ id: "leftShoulder", x: lUA.anchorX, y: lUA.anchorY });
  if (rUA) out.push({ id: "rightShoulder", x: rUA.anchorX, y: rUA.anchorY });
  if (lF) out.push({ id: "leftElbow", x: lF.anchorX, y: lF.anchorY });
  if (rF) out.push({ id: "rightElbow", x: rF.anchorX, y: rF.anchorY });

  if (pelvis) {
    const torsoBottom = torso.y + torso.height * 0.5;
    const pelvisTop = pelvis.y - pelvis.height * 0.5;
    out.push({
      id: "waist",
      x: (torso.x + pelvis.x) * 0.5,
      y: (torsoBottom + pelvisTop) * 0.5,
    });
  }
  if (lL) out.push({ id: "leftHip", x: lL.anchorX, y: lL.anchorY });
  if (rL) out.push({ id: "rightHip", x: rL.anchorX, y: rL.anchorY });

  return out;
}

export type GuideIntensity = "rest" | "drag" | "near" | "success";

const jointToParts: Record<JointId, PuppetPartId[]> = {
  neck: ["head"],
  leftShoulder: ["leftUpperArm"],
  rightShoulder: ["rightUpperArm"],
  leftElbow: ["leftForearm"],
  rightElbow: ["rightForearm"],
  waist: ["torso", "pelvis"],
  leftHip: ["leftLeg"],
  rightHip: ["rightLeg"],
};

export function jointIntensity(
  j: JointId,
  _dragging: PuppetPartId | null,
  _near: PuppetPartId | null,
  success: PuppetPartId | null,
): GuideIntensity {
  if (j === "waist") {
    if (success && (success === "torso" || success === "pelvis")) return "success";
    return "rest";
  }
  for (const p of jointToParts[j]) {
    if (success === p) return "success";
  }
  return "rest";
}

export function partIntensity(
  part: PuppetPartId,
  _dragging: PuppetPartId | null,
  _near: PuppetPartId | null,
  success: PuppetPartId | null,
): GuideIntensity {
  if (success === part) return "success";
  return "rest";
}

export function neckIntensity(
  _dragging: PuppetPartId | null,
  _near: PuppetPartId | null,
  success: PuppetPartId | null,
): GuideIntensity {
  if (success === "head") return "success";
  return "rest";
}

/** 该连接点对应的部件已落位后不再显示（与底稿框同步消失） */
export function jointVisible(
  jid: JointId,
  placed: Readonly<Partial<Record<PuppetPartId, boolean>>>,
): boolean {
  const p = (id: PuppetPartId) => Boolean(placed[id]);
  switch (jid) {
    case "neck":
      return !p("head");
    case "leftShoulder":
      return !p("leftUpperArm");
    case "rightShoulder":
      return !p("rightUpperArm");
    case "leftElbow":
      return !p("leftForearm");
    case "rightElbow":
      return !p("rightForearm");
    case "waist":
      return !(p("torso") && p("pelvis"));
    case "leftHip":
      return !p("leftLeg");
    case "rightHip":
      return !p("rightLeg");
    default:
      return true;
  }
}

