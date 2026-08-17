import type { DiskJoystickMutable, RingJoystickMutable } from "./joystickState";
import { getAngleDeg } from "./joystickState";
import { clamp, lerp, mapRange } from "./mathUtils";
import type { HtmlPuppetState } from "./puppetState";

const stepLegSpring = (
  angle: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
  velocityDrag: number,
  impulse = 0,
) => {
  const accel = (target - angle) * stiffness - velocity * velocityDrag + impulse;
  const nextVelocity = (velocity + accel) * damping;
  const nextAngle = angle + nextVelocity;
  return { angle: nextAngle, velocity: nextVelocity };
};

const PUPPET_MOVE_RANGE_MARGIN_X = 80;
const PUPPET_MOVE_RANGE_MARGIN_Y = 210;
const FRONT_UPPER_ARM_LIMIT_DEG: [number, number] = [-120, 125];
const FRONT_FOREARM_LIMIT_DEG: [number, number] = [-60, 75];
const BACK_UPPER_ARM_LIMIT_DEG: [number, number] = [-120, 125];
const BACK_FOREARM_LIMIT_DEG: [number, number] = [-60, 75];

export const updateHtmlKinematics = (
  puppet: HtmlPuppetState,
  joyTrans: DiskJoystickMutable,
  joyBody: RingJoystickMutable,
  joyRight: RingJoystickMutable,
  joyLeft: RingJoystickMutable,
  joyBoth: RingJoystickMutable,
  facingDir: number,
  cw: number,
  ch: number,
  bodyAngleSign = 1,
) => {
  const screenMoveX = cw / 2 - PUPPET_MOVE_RANGE_MARGIN_X;
  const screenMoveY = ch / 2 - PUPPET_MOVE_RANGE_MARGIN_Y;
  puppet.targets.x = puppet.baseX + joyTrans.x * screenMoveX;
  puppet.targets.y = puppet.baseY + joyTrans.y * screenMoveY;

  /** 目标点位移：摇杆一动就有信号，不被根位置 lerp 拖没 */
  const targetDx = puppet.targets.x - puppet.lastTargetX;
  const targetDy = puppet.targets.y - puppet.lastTargetY;
  puppet.lastTargetX = puppet.targets.x;
  puppet.lastTargetY = puppet.targets.y;

  const currentVx = puppet.x - puppet.lastX;
  const currentVy = puppet.y - puppet.lastY;
  puppet.lastX = puppet.x;
  puppet.lastY = puppet.y;

  const blendVx = currentVx * 0.42 + targetDx * 0.78;
  const blendVy = currentVy * 0.42 + targetDy * 0.78;

  const baseTorsoRot = getAngleDeg(joyBody) * facingDir * bodyAngleSign;
  const tBend = mapRange(joyBody.y, -1, 1, 0, 50);
  const tRot = clamp(baseTorsoRot * 0.55, -85, 85);

  const rawTorsoVel = tRot - puppet.prevTargetTorso;
  puppet.prevTargetTorso = tRot;
  puppet.torsoVelSmooth = lerp(puppet.torsoVelSmooth, rawTorsoVel, 0.28);
  let hRot = 0;
  let faceOff = 0;
  const absRot = Math.abs(tRot);
  const signRot = Math.sign(tRot);

  if (absRot < 20) {
    hRot = 0;
    faceOff = 0;
  } else if (absRot < 40) {
    hRot = mapRange(absRot, 20, 40, 8, 25) * signRot;
  } else {
    hRot = mapRange(absRot, 40, 85, 25, 45) * signRot;
    faceOff = mapRange(absRot, 40, 85, 0, 40) * signRot;
  }

  const hDrop = tBend > 16 ? mapRange(tBend, 16, 50, 0, 25) : 0;

  /** 侧倾越大，躯干略向前下方“吃重力”多弯一点 */
  const gravityBendAdd = mapRange(absRot, 0, 72, 1.5, 11) + clamp(Math.abs(puppet.torsoVelSmooth) * 3.2, 0, 6.5);
  const torsoBendWithGravity = clamp(tBend + gravityBendAdd, 0, 54);

  /** 转动加速度 → 骨盆左右晃；水平速度 → 轻微侧摆 */
  const hipWobble = clamp(-puppet.torsoVelSmooth * 0.62, -18, 18);
  const hipLateral = clamp(blendVx * 0.22, -6, 6);
  const hipWithPhysics = clamp(hRot + hipWobble + hipLateral, -52, 52);

  /** 重心略随侧倾下沉 */
  const hipDropWithWeight = hDrop + mapRange(absRot, 0, 75, 0, 6) + clamp(Math.abs(puppet.torsoVelSmooth) * 1.8, 0, 4);

  /** 头颈略滞后于急转，像惯性 */
  const headLag = clamp(-puppet.torsoVelSmooth * 0.38, -14, 14);

  puppet.targets.torsoAngle = tRot;
  puppet.targets.torsoBend = torsoBendWithGravity;
  puppet.targets.hipAngle = hipWithPhysics;
  puppet.targets.facingOffset = faceOff;
  puppet.targets.hipDrop = hipDropWithWeight;
  puppet.targets.headAngle = clamp(tRot * 0.55 + headLag, -55, 55);

  const bothOffset = -getAngleDeg(joyBoth);
  const leftOffset = -getAngleDeg(joyLeft);
  const rightOffset = -getAngleDeg(joyRight);

  const frontControl = bothOffset + leftOffset;
  const backControl = bothOffset + rightOffset;

  const deltaF = clamp(frontControl, -250, 250);
  // 无预设角：静止即 0，操作时再偏转
  puppet.targets.fArmU = clamp(deltaF * 0.5, FRONT_UPPER_ARM_LIMIT_DEG[0], FRONT_UPPER_ARM_LIMIT_DEG[1]);
  puppet.targets.fArmL = clamp(deltaF * 0.3, FRONT_FOREARM_LIMIT_DEG[0], FRONT_FOREARM_LIMIT_DEG[1]);

  const deltaB = clamp(backControl, -250, 250);
  // 后手与前手同样无预设角
  puppet.targets.bArmU = clamp(deltaB * 0.5, BACK_UPPER_ARM_LIMIT_DEG[0], BACK_UPPER_ARM_LIMIT_DEG[1]);
  puppet.targets.bArmL = clamp(deltaB * 0.3, BACK_FOREARM_LIMIT_DEG[0], BACK_FOREARM_LIMIT_DEG[1]);

  /** 角加速度、身体环微动 —— 腿仅作被动反应用 */
  const rawTorsoAccel = rawTorsoVel - puppet.prevRawTorsoVel;
  puppet.prevRawTorsoVel = rawTorsoVel;

  const deltaBodyKnobY = joyBody.y - puppet.prevJoyBodyY;
  puppet.prevJoyBodyY = joyBody.y;

  const bodyRingAngleDeg = getAngleDeg(joyBody);
  const deltaBodyRingDeg = puppet.bodyRingLegInited
    ? bodyRingAngleDeg - puppet.prevBodyRingAngleDeg
    : 0;
  puppet.prevBodyRingAngleDeg = bodyRingAngleDeg;
  puppet.bodyRingLegInited = true;

  // === 腿：由身体位移/旋转被动带出（非固定频率）===
  const moveEnergy = clamp(
    Math.abs(blendVx) * 0.85 +
      Math.abs(blendVy) * 0.45 +
      Math.abs(rawTorsoVel) * 0.32 +
      Math.abs(rawTorsoAccel) * 0.2 +
      Math.abs(deltaBodyKnobY) * 5.8 +
      Math.abs(deltaBodyRingDeg) * 0.08,
    0,
    18,
  );
  const isLegActive = moveEnergy > 0.22;

  // 身体先动，腿晚一点跟：腿用更慢的“感知速度”作为驱动
  const legLag = isLegActive ? 0.085 : 0.06;
  puppet.legSmoothedVx = lerp(puppet.legSmoothedVx, blendVx, legLag);
  puppet.legSmoothedVy = lerp(puppet.legSmoothedVy, blendVy, legLag);

  const moveBlend = clamp(moveEnergy / 6, 0, 1);
  // 交替幅度主区间 3°~8°
  const splitLimit = lerp(3, 8, moveBlend);

  // 同向跟随（两腿一起轻微倾斜）：整体仍是“挂在身体下面”
  const commonCarry = clamp(
    -puppet.legSmoothedVx * 0.16 -
      puppet.legSmoothedVy * 0.08 -
      puppet.torsoVelSmooth * 0.14 +
      puppet.torsoBend * 0.01,
    -4,
    4,
  );

  // 反向分离（左右腿交替）：由移动方向和上身转动带出，不用固定周期
  const splitFromMove = puppet.legSmoothedVx * 0.52 + rawTorsoAccel * 0.22;
  // 上身转动时，靠内侧腿略收、外侧腿略开
  const splitFromTwist = puppet.torsoAngle * 0.06 + puppet.hipAngle * 0.045;
  const splitCarry = clamp(splitFromMove + splitFromTwist, -splitLimit, splitLimit);

  puppet.targets.fLeg = clamp(commonCarry - splitCarry, -11, 11);
  puppet.targets.bLeg = clamp(commonCarry + splitCarry, -11, 11);

  puppet.x = lerp(puppet.x, puppet.targets.x, 0.25);
  puppet.y = lerp(puppet.y, puppet.targets.y, 0.25);

  puppet.torsoAngle = lerp(puppet.torsoAngle, puppet.targets.torsoAngle, 0.25);
  puppet.torsoBend = lerp(puppet.torsoBend, puppet.targets.torsoBend, 0.25);
  puppet.hipAngle = lerp(puppet.hipAngle, puppet.targets.hipAngle, 0.25);
  puppet.facingOffset = lerp(puppet.facingOffset, puppet.targets.facingOffset, 0.25);
  puppet.hipDrop = lerp(puppet.hipDrop, puppet.targets.hipDrop, 0.25);
  puppet.headAngle = lerp(puppet.headAngle, puppet.targets.headAngle, 0.25);

  puppet.fArmU = lerp(puppet.fArmU, puppet.targets.fArmU, 0.3);
  puppet.fArmL = lerp(puppet.fArmL, puppet.targets.fArmL, 0.15);
  puppet.bArmU = lerp(puppet.bArmU, puppet.targets.bArmU, 0.3);
  puppet.bArmL = lerp(puppet.bArmL, puppet.targets.bArmL, 0.15);

  // 停下后保留短暂余振（1~2 次），再进入稳态
  const stillLegSwinging =
    !isLegActive &&
    Math.abs(puppet.fLegVelocity) + Math.abs(puppet.bLegVelocity) > 0.22;

  const impulseGate = isLegActive ? Math.min(1, moveEnergy / 1.4) : stillLegSwinging ? 0.12 : 0;
  const baseImpulse = clamp(
    blendVx * 0.14 +
      blendVy * 0.06 +
      rawTorsoAccel * 0.22 +
      deltaBodyKnobY * 0.8 +
      deltaBodyRingDeg * 0.01,
    -0.75,
    0.75,
  );
  const frontImpulse = (baseImpulse * 0.82 + (isLegActive ? rawTorsoVel * 0.03 : 0)) * impulseGate;
  const backImpulse = (baseImpulse * 0.88 + (isLegActive ? rawTorsoVel * 0.035 : 0)) * impulseGate;

  const looseDamp = clamp(0.87 + moveBlend * 0.02, 0.87, 0.89);
  const settleDamp = 0.9;
  const idleDamp = 0.948;
  const frontDamping = isLegActive
    ? looseDamp
    : stillLegSwinging
      ? settleDamp
      : idleDamp;
  const backDamping = (isLegActive
    ? looseDamp
    : stillLegSwinging
      ? settleDamp
      : idleDamp) - 0.004;

  const stiff = isLegActive ? 0.048 : stillLegSwinging ? 0.058 : 0.1;
  const velDrag = isLegActive ? 0.034 : stillLegSwinging ? 0.038 : 0.062;

  const frontLeg = stepLegSpring(
    puppet.fLeg,
    puppet.fLegVelocity,
    puppet.targets.fLeg,
    stiff,
    frontDamping,
    velDrag,
    frontImpulse,
  );
  const backLeg = stepLegSpring(
    puppet.bLeg,
    puppet.bLegVelocity,
    puppet.targets.bLeg,
    stiff * 0.94,
    backDamping,
    velDrag * 0.98,
    backImpulse,
  );

  // 总体小幅（明显小于手臂），避免“主动走路”感
  puppet.fLeg = clamp(frontLeg.angle, -16, 16);
  puppet.bLeg = clamp(backLeg.angle, -16, 16);
  puppet.fLegVelocity = frontLeg.velocity;
  puppet.bLegVelocity = backLeg.velocity;
};
