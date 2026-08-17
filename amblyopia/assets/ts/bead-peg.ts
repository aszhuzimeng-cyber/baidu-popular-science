import * as THREE from '../libs/three.module.js';
import type { InteractionParams, ProximityState, TargetDropZoneScreen } from './interaction.js';
import { ellipseContains, getProximityState } from './interaction.js';
import { clamp, lerp } from './params.js';

export const TASK_SCALE = 1.12;
export const PEG_WORLD_SCALE = 0.44 * TASK_SCALE;
export const PEG_RADIUS_WORLD = PEG_WORLD_SCALE * 0.2;
export const PEG_HEIGHT_WORLD = PEG_WORLD_SCALE * 0.74;
export const PEG_BODY_RADIUS = PEG_RADIUS_WORLD * 1.05;
/** 柱顶圆帽本地半径（碰撞与对准）。 */
export const PEG_SHAFT_LOCAL_RADIUS = 0.155;
export const PEG_ENTRY_ALIGN_RADIUS = PEG_RADIUS_WORLD * 0.45;
export const BEAD_MAJOR_R = 0.136 * TASK_SCALE;
export const BEAD_TUBE_R = 0.032 * TASK_SCALE;
export const DESK_SURFACE_Y = 0.1795;
export const BEAD_CENTER_Y = DESK_SURFACE_Y + BEAD_TUBE_R * 0.92;
/** @deprecated 请用 getPegTopWorldY / getBeadHoverY(peg) */
export const PEG_TOP_Y = DESK_SURFACE_Y + PEG_HEIGHT_WORLD;
/** 悬停时环心高于柱顶的距离（环在柱顶上方，套入前可见孔内柱帽）。 */
export const BEAD_HOVER_LIFT = BEAD_TUBE_R * 3.55 + BEAD_MAJOR_R * 0.18;
/** @deprecated 请用 getBeadHoverY(peg) */
export const BEAD_HOVER_Y = PEG_TOP_Y + BEAD_HOVER_LIFT;

export function getPegTopWorldY(peg: THREE.Group): number {
  return getPegTopCenter(peg).y;
}

export function getBeadHoverY(peg: THREE.Group): number {
  return getPegTopWorldY(peg) + BEAD_HOVER_LIFT;
}

export function getBeadThreadedY(peg: THREE.Group): number {
  return getPegTopWorldY(peg) - BEAD_TUBE_R * 0.38;
}

export function getBeadSlideDownY(peg: THREE.Group): number {
  const boardTop = new THREE.Vector3(0, 0.0555, 0);
  peg.localToWorld(boardTop);
  return Math.max(BEAD_CENTER_Y, boardTop.y + BEAD_TUBE_R * 0.96);
}

export const PEG_SHADOW_OFFSET = { x: 0.058, z: 0.048 };
export const BEAD_SHADOW_OFFSET = { x: 0.052, z: 0.044 };
export const BG_PEG_BASE_U = 0.5;
export const BG_PEG_BASE_V = 0.688;
export const BG_BEAD_HOME_U = 0.64;
export const BG_BEAD_HOME_V = 0.708;
export const BEAD_HOME_FALLBACK_DX = 0.58;
export const BEAD_HOME_FALLBACK_DZ = 0.16;

export const REF_BEAD_EMISSIVE = 0.06;
export const REF_PEG_GLOW = 0.92;

export type BeadThreadVisualPhase = 'none' | 'approach' | 'hover' | 'sliding' | 'done';

export interface PegSceneParts {
  peg: THREE.Group;
  pegMaterial: THREE.MeshStandardMaterial;
  pegGlow: THREE.Mesh;
  pegCapFront: THREE.Mesh;
  pegCapBack: THREE.Mesh;
  pegOccluder: THREE.Mesh;
  pegThroughRing: THREE.Mesh;
  pegBoardShadow: THREE.Mesh;
  pegShaft: THREE.Mesh;
}

export interface BeadSceneParts {
  bead: THREE.Mesh;
  beadMaterial: THREE.MeshStandardMaterial;
}

export function createPegStand(scene: THREE.Scene): PegSceneParts {
  const pegMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4f7fb,
    roughness: 0.26,
    metalness: 0.05,
    emissive: 0xe8eef6,
    emissiveIntensity: 0.04,
  });

  const capMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8f0fa,
    roughness: 0.2,
    metalness: 0.08,
    emissive: 0xd8e8f8,
    emissiveIntensity: 0.05,
  });

  const boardMat = new THREE.MeshStandardMaterial({
    color: 0xf8f6f2,
    roughness: 0.55,
    metalness: 0,
  });

  const peg = new THREE.Group();
  peg.position.set(0, DESK_SURFACE_Y, 0);
  peg.scale.setScalar(PEG_WORLD_SCALE);
  const pegShaftH = PEG_HEIGHT_WORLD / PEG_WORLD_SCALE;
  peg.userData.pegTopY = 0.07 + pegShaftH + 0.016;

  const board = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.84, 0.055, 48), boardMat);
  board.position.y = 0.028;

  const pegShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.132, 0.148, pegShaftH, 40),
    pegMaterial
  );
  pegShaft.position.y = 0.06 + pegShaftH * 0.5;
  pegShaft.renderOrder = 5;

  const pegCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.155, 0.132, 0.032, 40),
    capMaterial
  );
  pegCap.position.y = 0.06 + pegShaftH + 0.008;
  pegCap.renderOrder = 6;

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xe8f4ff,
    emissive: 0x6ab0ff,
    emissiveIntensity: 0.38,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const pegGlow = new THREE.Mesh(new THREE.TorusGeometry(0.162, 0.006, 12, 48), glowMat);
  pegGlow.rotation.x = Math.PI / 2;
  pegGlow.position.y = 0.06 + pegShaftH + 0.014;
  pegGlow.renderOrder = 7;

  const capFrontMat = new THREE.MeshBasicMaterial({
    color: 0xf8fbff,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const pegCapFront = new THREE.Mesh(new THREE.CircleGeometry(0.132, 40), capFrontMat);
  pegCapFront.rotation.x = -Math.PI / 2;
  pegCapFront.position.y = 0.06 + pegShaftH + 0.016;
  pegCapFront.renderOrder = 8;

  const capBackMat = new THREE.MeshBasicMaterial({
    color: 0xb8c4d0,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const pegCapBack = new THREE.Mesh(new THREE.CircleGeometry(0.12, 40), capBackMat);
  pegCapBack.rotation.x = -Math.PI / 2;
  pegCapBack.position.y = 0.06 + pegShaftH + 0.002;
  pegCapBack.renderOrder = 3;

  const occluderMat = new THREE.MeshStandardMaterial({
    color: 0xf4f7fb,
    roughness: 0.26,
    metalness: 0.05,
    transparent: true,
    opacity: 0,
  });
  const pegOccluder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.128, 0.128, pegShaftH * 0.52, 32),
    occluderMat
  );
  pegOccluder.position.y = 0.06 + pegShaftH * 0.4;
  pegOccluder.renderOrder = 4;
  pegOccluder.visible = false;

  const pegThroughRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.126, 0.126, (BEAD_TUBE_R * 1.65) / PEG_WORLD_SCALE, 32),
    capMaterial.clone()
  );
  pegThroughRing.position.y =
    0.06 + pegShaftH - (BEAD_TUBE_R * 0.35) / PEG_WORLD_SCALE;
  pegThroughRing.renderOrder = 16;
  pegThroughRing.visible = false;

  const boardShadowMat = new THREE.MeshBasicMaterial({
    color: 0x6a7888,
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
  });
  const pegBoardShadow = new THREE.Mesh(new THREE.CircleGeometry(0.82, 40), boardShadowMat);
  pegBoardShadow.rotation.x = -Math.PI / 2;
  pegBoardShadow.position.y = 0.001;
  pegBoardShadow.renderOrder = 1;

  peg.add(
    board,
    pegBoardShadow,
    pegShaft,
    pegCap,
    pegCapBack,
    pegOccluder,
    pegGlow,
    pegCapFront,
    pegThroughRing
  );
  scene.add(peg);

  return {
    peg,
    pegMaterial,
    pegGlow,
    pegCapFront,
    pegCapBack,
    pegOccluder,
    pegThroughRing,
    pegBoardShadow,
    pegShaft,
  };
}

export function createBead(scene: THREE.Scene): BeadSceneParts {
  const beadMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a9cff,
    roughness: 0.2,
    metalness: 0.08,
    emissive: 0x2a5a9e,
    emissiveIntensity: REF_BEAD_EMISSIVE,
  });
  const bead = new THREE.Mesh(
    new THREE.TorusGeometry(BEAD_MAJOR_R, BEAD_TUBE_R, 32, 72),
    beadMaterial
  );
  bead.rotation.x = Math.PI / 2;
  bead.position.set(0.58, BEAD_CENTER_Y, 0.16);
  bead.renderOrder = 10;
  scene.add(bead);
  return { bead, beadMaterial };
}

export function getPegTopCenter(peg: THREE.Group): THREE.Vector3 {
  const pegTopY = (peg.userData.pegTopY as number) ?? PEG_HEIGHT_WORLD / PEG_WORLD_SCALE + 0.08;
  const pos = new THREE.Vector3(0, pegTopY, 0);
  peg.localToWorld(pos);
  return pos;
}

export function getPegAxisXZ(peg: THREE.Group): { x: number; z: number } {
  const world = new THREE.Vector3();
  peg.getWorldPosition(world);
  return { x: world.x, z: world.z };
}

export function getPegDeskAnchor(peg: THREE.Group): THREE.Vector3 {
  const base = new THREE.Vector3();
  peg.getWorldPosition(base);
  return new THREE.Vector3(base.x, BEAD_CENTER_Y, base.z);
}

export function getHoleToPegXZDistance(bead: THREE.Mesh, peg: THREE.Group): number {
  const axis = getPegAxisXZ(peg);
  return Math.hypot(bead.position.x - axis.x, bead.position.z - axis.z);
}

export function getPegShaftRadiusWorld(peg: THREE.Group): number {
  return PEG_SHAFT_LOCAL_RADIUS * peg.scale.x;
}

export function getBeadHoleInnerRadius(): number {
  return BEAD_MAJOR_R - BEAD_TUBE_R * 0.82;
}

export function getMaxHoleOffset(peg: THREE.Group): number {
  return Math.max(0.018, getBeadHoleInnerRadius() - getPegShaftRadiusWorld(peg));
}

export function getEntryAlignRadius(snapRadiusScale: number, peg?: THREE.Group): number {
  const maxOff = peg ? getMaxHoleOffset(peg) : PEG_ENTRY_ALIGN_RADIUS;
  return Math.max(maxOff * (0.92 + 0.28 * snapRadiusScale), BEAD_MAJOR_R * 0.34);
}

export function getReleaseGraceRadius(peg: THREE.Group, snapRadiusScale: number): number {
  const entryR = getEntryAlignRadius(snapRadiusScale, peg);
  return Math.max(BEAD_MAJOR_R * 0.72, entryR * 1.65, getPegShaftRadiusWorld(peg) + BEAD_TUBE_R * 1.4);
}

export function getMinClearanceRadius(peg: THREE.Group): number {
  return getPegShaftRadiusWorld(peg) + BEAD_TUBE_R * 0.72;
}

export function isBeadOnDesk(bead: THREE.Mesh): boolean {
  return bead.position.y <= BEAD_CENTER_Y + BEAD_TUBE_R * 0.55;
}

export function getLiftApproachRadius(peg: THREE.Group, snapRadiusScale: number): number {
  const graceR = getReleaseGraceRadius(peg, snapRadiusScale);
  return Math.max(graceR + BEAD_MAJOR_R * 1.65, BEAD_MAJOR_R * 2.85);
}

export function getBeadApproachLift(
  distXZ: number,
  peg: THREE.Group,
  snapRadiusScale: number,
  screenAssist = 0
): number {
  const entryR = getEntryAlignRadius(snapRadiusScale, peg);
  const liftR = getLiftApproachRadius(peg, snapRadiusScale);
  if (distXZ > liftR * 1.04 && screenAssist < 0.05) return 0;

  const t = 1 - clamp((distXZ - entryR) / Math.max(0.001, liftR - entryR));
  const worldLift = t * t * (3 - 2 * t);
  const screenLift = screenAssist * screenAssist * 0.12;
  return Math.min(1, Math.max(worldLift, screenLift));
}

/** 当前抬升进度下，允许靠近柱轴的最近水平距离（越高可越贴轴心）。 */
export function getMinAllowedDistForLift(
  liftT: number,
  peg: THREE.Group,
  snapRadiusScale: number,
  beadY?: number
): number {
  const entryR = getEntryAlignRadius(snapRadiusScale, peg);
  const sideBlockR = BEAD_MAJOR_R + getPegShaftRadiusWorld(peg) + BEAD_TUBE_R * 0.1;
  const t = clamp(liftT, 0, 1);
  const liftGate = clamp((t - 0.72) / 0.2, 0, 1);
  const liftGateT = liftGate * liftGate * (3 - 2 * liftGate);
  const topStartY = getPegTopWorldY(peg) + BEAD_TUBE_R * 0.75;
  const topFullY = getBeadHoverY(peg) - BEAD_TUBE_R * 0.2;
  const topGate = typeof beadY === 'number'
    ? clamp((beadY - topStartY) / Math.max(0.001, topFullY - topStartY), 0, 1)
    : liftGate;
  const topGateT = topGate * topGate * (3 - 2 * topGate);
  const gateT = Math.min(liftGateT, topGateT);
  return lerp(sideBlockR, entryR * 0.98, gateT);
}

/** 根据水平对准程度，将圆环从桌面抬升到柱顶正上方。 */
export function applyBeadApproachHeight(
  pos: THREE.Vector3,
  peg: THREE.Group,
  snapRadiusScale: number
): number {
  const axis = getPegAxisXZ(peg);
  const dist = Math.hypot(pos.x - axis.x, pos.z - axis.z);
  const liftT = getBeadApproachLift(dist, peg, snapRadiusScale);
  const hoverY = getBeadHoverY(peg);
  pos.y = lerp(BEAD_CENTER_Y, hoverY, liftT);
  return liftT;
}

export function isBeadAlignedForTopEntry(
  bead: THREE.Mesh,
  peg: THREE.Group,
  snapRadiusScale: number
): boolean {
  const distXZ = getHoleToPegXZDistance(bead, peg);
  if (distXZ > getEntryAlignRadius(snapRadiusScale, peg)) return false;
  const hoverY = getBeadHoverY(peg);
  const minHoverY = BEAD_CENTER_Y + (hoverY - BEAD_CENTER_Y) * 0.88;
  return bead.position.y >= minHoverY - 0.008;
}

export function isBeadAtHoverHeight(bead: THREE.Mesh, peg: THREE.Group): boolean {
  const hoverY = getBeadHoverY(peg);
  const minHoverY = BEAD_CENTER_Y + (hoverY - BEAD_CENTER_Y) * 0.9;
  return bead.position.y >= minHoverY - 0.006;
}

/** 松手穿入：以圆环实际位置为准，需在悬停高度且孔心对准柱顶。 */
export function canThreadBeadFromRelease(
  bead: THREE.Mesh,
  peg: THREE.Group,
  snapRadiusScale: number
): boolean {
  if (!isBeadAtHoverHeight(bead, peg)) return false;
  const distXZ = getHoleToPegXZDistance(bead, peg);
  const entryR = getEntryAlignRadius(snapRadiusScale, peg);
  const releaseTolerance = 1.03 + 0.15 * clamp(snapRadiusScale, 0, 1);
  return distXZ <= entryR * releaseTolerance;
}

export function canReleaseThreadBead(
  bead: THREE.Mesh,
  peg: THREE.Group,
  snapRadiusScale: number
): boolean {
  const distXZ = getHoleToPegXZDistance(bead, peg);
  if (distXZ > getReleaseGraceRadius(peg, snapRadiusScale)) return false;
  const hoverY = getBeadHoverY(peg);
  const minHoverY = BEAD_CENTER_Y + (hoverY - BEAD_CENTER_Y) * 0.88;
  return bead.position.y >= minHoverY - 0.01;
}

export function snapBeadOntoPegAxis(
  bead: THREE.Mesh,
  peg: THREE.Group,
  hover = false
): void {
  const axis = getPegAxisXZ(peg);
  const hoverY = getBeadHoverY(peg);
  bead.position.x = axis.x;
  bead.position.z = axis.z;
  bead.rotation.x = Math.PI / 2;
  bead.rotation.y = 0;
  bead.rotation.z = 0;
  const midY = BEAD_CENTER_Y + (hoverY - BEAD_CENTER_Y) * 0.42;
  if (hover || bead.position.y >= midY) {
    bead.position.y = hoverY;
  } else {
    bead.position.y = BEAD_CENTER_Y;
  }
}

export function resolveBeadDragPosition(
  pos: THREE.Vector3,
  peg: THREE.Group,
  ip: InteractionParams,
  screenSnapT = 0,
  currentY = BEAD_CENTER_Y,
  currentPos?: THREE.Vector3
): { blocked: boolean; aligned: boolean; liftT: number } {
  const hoverY = getBeadHoverY(peg);
  const axis = getPegAxisXZ(peg);
  const origDx = pos.x - axis.x;
  const origDz = pos.z - axis.z;
  const rawOrigDist = Math.hypot(origDx, origDz);
  const origDist = rawOrigDist || 0.0001;
  const currentDx = currentPos ? currentPos.x - axis.x : origDx;
  const currentDz = currentPos ? currentPos.z - axis.z : origDz;
  const currentDist = Math.hypot(currentDx, currentDz);
  const pushDirX = currentDist > 0.0001
    ? currentDx / currentDist
    : rawOrigDist > 0.0001
      ? origDx / rawOrigDist
      : 1;
  const pushDirZ = currentDist > 0.0001
    ? currentDz / currentDist
    : rawOrigDist > 0.0001
      ? origDz / rawOrigDist
      : 0;

  const entryR = getEntryAlignRadius(ip.snapRadiusScale, peg);
  const liftRange = Math.max(0.001, hoverY - BEAD_CENTER_Y);

  const intentLift = getBeadApproachLift(
    origDist,
    peg,
    ip.snapRadiusScale,
    screenSnapT
  );
  let blocked = false;
  let dist = origDist;

  const targetY = lerp(BEAD_CENTER_Y, hoverY, intentLift);
  const liftBlend = targetY >= currentY ? 0.2 + ip.depthStrength * 0.18 : 0.16;
  pos.y = lerp(currentY, targetY, liftBlend);

  const newLiftProgress = clamp((pos.y - BEAD_CENTER_Y) / liftRange, 0, 1);
  const minAllowed = getMinAllowedDistForLift(newLiftProgress, peg, ip.snapRadiusScale, pos.y);

  if (origDist < minAllowed) {
    dist = minAllowed;
    pos.x = axis.x + pushDirX * minAllowed;
    pos.z = axis.z + pushDirZ * minAllowed;
    blocked = true;
  }

  const heightSynced = newLiftProgress >= 0.88;
  if (
    heightSynced &&
    dist < entryR * 1.5 &&
    intentLift > 0.9 &&
    origDist < entryR * 1.5
  ) {
    const pull = Math.min(
      0.08,
      0.025 + ip.magneticPull * 0.035 + screenSnapT * 0.02
    );
    if (pull > 0.02) {
      pos.x = lerp(pos.x, axis.x, pull);
      pos.z = lerp(pos.z, axis.z, pull);
      dist = Math.hypot(pos.x - axis.x, pos.z - axis.z) || 0.0001;
    }
  }

  const liftT = clamp((pos.y - BEAD_CENTER_Y) / liftRange, 0, 1);
  const aligned = dist <= entryR * 1.12 && liftT >= 0.88;
  return { blocked, aligned, liftT };
}

export function getBeadHoverPosition(peg: THREE.Group): THREE.Vector3 {
  const top = getPegTopCenter(peg);
  return new THREE.Vector3(top.x, getBeadHoverY(peg), top.z);
}

export function getBeadThreadSlidePosition(peg: THREE.Group, slide: number): THREE.Vector3 {
  const top = getPegTopCenter(peg);
  const y = lerp(getBeadThreadedY(peg), getBeadSlideDownY(peg), slide);
  return new THREE.Vector3(top.x, y, top.z);
}

export function getBeadSnapPosition(peg: THREE.Group, slide = 0): THREE.Vector3 {
  if (slide <= 0) return getBeadHoverPosition(peg);
  return getBeadThreadSlidePosition(peg, slide);
}

export function isBeadNearPegHint(
  bead: THREE.Mesh,
  peg: THREE.Group,
  snapRadiusScale: number
): boolean {
  const dist = getHoleToPegXZDistance(bead, peg);
  const hintR = getReleaseGraceRadius(peg, snapRadiusScale) * 1.08;
  return dist <= hintR;
}

export interface BeadDropCue {
  proximity: ProximityState;
  blockedBySide: boolean;
}

export function getBeadDropCue(
  bead: THREE.Mesh,
  peg: THREE.Group,
  beadScreen: { x: number; y: number },
  zone: TargetDropZoneScreen,
  ip: InteractionParams,
  dragging: boolean
): BeadDropCue {
  if (!dragging) {
    const state = getProximityState(
      beadScreen.x,
      beadScreen.y,
      zone,
      ip.snapRadiusScale,
      ip.hintZoneScale
    );
    return { proximity: state === 'drop' ? 'hint' : state, blockedBySide: false };
  }

  const aligned = isBeadAlignedForTopEntry(bead, peg, ip.snapRadiusScale);
  const nearHint = isBeadNearPegHint(bead, peg, ip.snapRadiusScale);
  const inScreen = ellipseContains(beadScreen.x, beadScreen.y, zone, ip.hintZoneScale);
  const atHover = isBeadAtHoverHeight(bead, peg);
  const dist = getHoleToPegXZDistance(bead, peg);
  const entryR = getEntryAlignRadius(ip.snapRadiusScale, peg);

  if (canThreadBeadFromRelease(bead, peg, ip.snapRadiusScale) || aligned) {
    return { proximity: 'drop', blockedBySide: false };
  }

  if (atHover && dist <= entryR * 1.35) {
    return { proximity: 'hint', blockedBySide: false };
  }

  if (nearHint || inScreen) {
    const blocked =
      dist < getMinClearanceRadius(peg) &&
      dist > getEntryAlignRadius(ip.snapRadiusScale, peg) * 1.2;
    return { proximity: 'hint', blockedBySide: blocked };
  }

  return { proximity: 'far', blockedBySide: false };
}

export function updatePegThreadVisuals(
  peg: THREE.Group,
  pegShaft: THREE.Mesh,
  pegThroughRing: THREE.Mesh,
  pegOccluder: THREE.Mesh,
  beadY: number,
  phase: BeadThreadVisualPhase,
  occlusionClarity = 1
): void {
  const threading =
    phase === 'approach' || phase === 'hover' || phase === 'sliding' || phase === 'done';
  pegShaft.renderOrder = 5;
  pegThroughRing.visible = false;
  pegThroughRing.scale.y = 1;
  pegOccluder.visible = false;
  const occMat = pegOccluder.material as THREE.MeshStandardMaterial;
  occMat.opacity = 0;

  if (!threading) {
    return;
  }

  // Keep the visible peg as a single stable mesh while the ring is being threaded.
  // Earlier versions faded in a proxy peg/occluder here, which read as the peg changing size.
  void peg;
  void beadY;
  void occlusionClarity;
}
