import type { Vec2 } from "../../types/puppet";
import { DEG2RAD } from "./mathUtils";
import { createHtmlPuppet, type HtmlPuppetState } from "./puppetState";

/**
 * 与 drawPuppet2d 的 ctx 变换链一致，求关节在幕布/拼接画布上的像素位置（孔位/连接点，非外接框中心）。
 * 不依赖单部件 α 外接盒。
 */
type Mat = { a: number; b: number; c: number; d: number; e: number; f: number };

const translate = (tx: number, ty: number): Mat => ({ a: 1, b: 0, c: 0, d: 1, e: tx, f: ty });

const scale = (sx: number, sy: number): Mat => ({ a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 });

/** Canvas rotate(θ)（y 轴向下、顺时针为正）与 setTransform 一致 */
const rotate = (rad: number): Mat => {
  const co = Math.cos(rad);
  const si = Math.sin(rad);
  return { a: co, b: si, c: -si, d: co, e: 0, f: 0 };
};

const mul = (A: Mat, B: Mat): Mat => ({
  a: A.a * B.a + A.c * B.b,
  b: A.b * B.a + A.d * B.b,
  c: A.a * B.c + A.c * B.d,
  d: A.b * B.c + A.d * B.d,
  e: A.a * B.e + A.c * B.f + A.e,
  f: A.b * B.e + A.d * B.f + A.f,
});

const apply = (M: Mat, p: Readonly<{ x: number; y: number }>): Vec2 => ({
  x: M.a * p.x + M.c * p.y + M.e,
  y: M.b * p.x + M.d * p.y + M.f,
});

/**
 * 从 drawPuppet2d 根到「身体内坐标」（scale 1.2*viewScale 之后）的变换。
 * 身体内坐标中各关节与 drawPuppet2d 内子路径一致。
 */
const rootM = (p: HtmlPuppetState, viewScale: number, facingDir: number): Mat => {
  const s = 1.2 * viewScale;
  return mul(
    translate(p.x, p.y),
    mul(
      scale(facingDir, 1),
      mul(rotate(p.facingOffset * DEG2RAD), scale(s, s)),
    ),
  );
};

export type PuppetRigWorldPoints = {
  /** 颈/头-上身连接，与头关节 (0,0) 同链 */
  neck: Vec2;
  /** 胯部顶端（与骨盆多边形原点一致） */
  pelvisTop: Vec2;
  leftShoulder: Vec2;
  rightShoulder: Vec2;
  leftElbow: Vec2;
  rightElbow: Vec2;
  leftHip: Vec2;
  rightHip: Vec2;
};

/**
 * 与 drawPuppet2d 人偶位姿、viewScale、facingDir 一致时的孔位世界坐标（像素，幕布/拼接画布系）。
 */
export const computePuppetRigWorldPoints = (
  p: HtmlPuppetState,
  viewScale: number,
  facingDir: number = 1,
): PuppetRigWorldPoints => {
  const R0 = rootM(p, viewScale, facingDir);

  const t = p.torsoAngle * DEG2RAD;
  const h = p.hipAngle * DEG2RAD;
  const drop = p.hipDrop;

  // 颈/头关节：T(0,hipDrop) * R(torso) * T(0,-90) * T(7.5,10) * R(head - torso) * (0,0)
  const Mneck = mul(
    translate(0, drop),
    mul(
      rotate(t),
      mul(translate(0, -90), mul(translate(7.5, 10), rotate((p.headAngle - p.torsoAngle) * DEG2RAD))),
    ),
  );

  // 左大臂根：T(0,-80) 与上身躯干 y=-90 不同，与 drawPuppet2d 一致
  const Mlb0 = mul(
    translate(0, drop),
    mul(rotate(t), mul(translate(0, -80), rotate((p.bArmU - p.torsoAngle) * DEG2RAD))),
  );
  const Mlelb = mul(
    Mlb0,
    translate(0, 65), // 肘在上臂末
  );

  // 右大臂
  const Mrb0 = mul(
    translate(0, drop),
    mul(rotate(t), mul(translate(5, -80), rotate((p.fArmU - p.torsoAngle) * DEG2RAD))),
  );
  const Mrelb = mul(Mrb0, translate(0, 65));

  // 骨盆顶（0,0）在髋旋转后空间
  const MhipRoot = mul(translate(0, drop), rotate(h));
  // 左/右腿与胯连接点
  const MlLegTop = mul(MhipRoot, translate(-5, 80));
  const MrLegTop = mul(MhipRoot, translate(8, 80));

  return {
    neck: apply(mul(R0, Mneck), { x: 0, y: 0 }),
    pelvisTop: apply(mul(R0, MhipRoot), { x: 0, y: 0 }),
    leftShoulder: apply(mul(R0, Mlb0), { x: 0, y: 0 }),
    rightShoulder: apply(mul(R0, Mrb0), { x: 0, y: 0 }),
    leftElbow: apply(mul(R0, Mlelb), { x: 0, y: 0 }),
    rightElbow: apply(mul(R0, Mrelb), { x: 0, y: 0 }),
    leftHip: apply(mul(R0, MlLegTop), { x: 0, y: 0 }),
    rightHip: apply(mul(R0, MrLegTop), { x: 0, y: 0 }),
  };
};

/**
 * 与 `measurePartLayouts` / 中央拼接区使用的位姿、缩放一致，用于吸附目标与虚线点。
 */
export const createPuppetForAssembly = (w: number, h: number): HtmlPuppetState => {
  const puppet = createHtmlPuppet(w, h);
  puppet.x = w / 2;
  puppet.y = h / 2 + Math.min(36, h * 0.06);
  puppet.baseX = puppet.x;
  puppet.baseY = puppet.y;
  return puppet;
};

export const assemblyViewScale = (w: number, h: number) => Math.min(0.92, Math.min(w, h) / 520);
