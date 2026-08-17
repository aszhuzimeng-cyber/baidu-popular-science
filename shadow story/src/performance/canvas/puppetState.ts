export interface HtmlPuppetState {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  /** 上一帧目标躯干角，用于估计转动速度 */
  prevTargetTorso: number;
  /** 平滑后的躯干目标角速度（度/帧量级，供晃动用） */
  torsoVelSmooth: number;
  /** 上一帧躯干目标角速度，用于估计角加速度 → 摆腿 */
  prevRawTorsoVel: number;
  lastTargetX: number;
  lastTargetY: number;
  /** 上一帧身体环旋钮 y，用于俯仰「速度」→ 摆腿 */
  prevJoyBodyY: number;
  /** 上一帧身体环累计角（度），用于扭转速度 → 摆腿 */
  prevBodyRingAngleDeg: number;
  bodyRingLegInited: boolean;
  torsoAngle: number;
  torsoBend: number;
  hipAngle: number;
  facingOffset: number;
  hipDrop: number;
  headAngle: number;
  fArmU: number;
  fArmL: number;
  bArmU: number;
  bArmL: number;
  fLeg: number;
  bLeg: number;
  /** 前腿角速度（度/帧） */
  fLegVelocity: number;
  /** 后腿角速度（度/帧） */
  bLegVelocity: number;
  /** 腿部用：比身体/摇杆更滞后的平移“手感”，做被拖拽的被动跟随 */
  legSmoothedVx: number;
  legSmoothedVy: number;
  /**
   * 由位移/扭转驱动累加的“相位”，只用于运动时左右腿反相小幅晃动（与固定频率正弦无关）；
   * 静止时衰减，避免原地抖腿。
   */
  legDragPhase: number;
  targets: {
    x: number;
    y: number;
    torsoAngle: number;
    torsoBend: number;
    hipAngle: number;
    facingOffset: number;
    hipDrop: number;
    headAngle: number;
    fArmU: number;
    fArmL: number;
    bArmU: number;
    bArmL: number;
    fLeg: number;
    bLeg: number;
  };
}

export const createHtmlPuppet = (cw: number, ch: number, baseXOffset = 0): HtmlPuppetState => {
  const baseX = cw / 2 + baseXOffset;
  const baseY = ch / 2 + 50;
  return {
    baseX,
    baseY,
    x: baseX,
    y: baseY,
    lastX: baseX,
    lastY: baseY,
    prevTargetTorso: 0,
    torsoVelSmooth: 0,
    prevRawTorsoVel: 0,
    lastTargetX: baseX,
    lastTargetY: baseY,
    prevJoyBodyY: -1,
    prevBodyRingAngleDeg: 0,
    bodyRingLegInited: false,
    torsoAngle: 0,
    torsoBend: 0,
    hipAngle: 0,
    facingOffset: 0,
    hipDrop: 0,
    headAngle: 0,
    // 默认全部归零：不带预设旋转角
    fArmU: 0,
    fArmL: 0,
    bArmU: 0,
    bArmL: 0,
    fLeg: 0,
    bLeg: 0,
    fLegVelocity: 0,
    bLegVelocity: 0,
    legSmoothedVx: 0,
    legSmoothedVy: 0,
    legDragPhase: 0,
    targets: {
      x: baseX,
      y: baseY,
      torsoAngle: 0,
      torsoBend: 0,
      hipAngle: 0,
      facingOffset: 0,
      hipDrop: 0,
      headAngle: 0,
      fArmU: 0,
      fArmL: 0,
      bArmU: 0,
      bArmL: 0,
      fLeg: 0,
      bLeg: 0,
    },
  };
};
