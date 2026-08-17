import * as THREE from '../libs/three.module.js';
import {
  type InteractionParams,
  type ProximityState,
  type TargetDropZoneScreen,
} from './interaction.js';
import {
  type BeadThreadVisualPhase,
  BEAD_CENTER_Y,
  BEAD_HOME_FALLBACK_DX,
  BEAD_HOME_FALLBACK_DZ,
  BEAD_MAJOR_R,
  BEAD_SHADOW_OFFSET,
  BEAD_TUBE_R,
  BG_BEAD_HOME_U,
  BG_BEAD_HOME_V,
  BG_PEG_BASE_U,
  BG_PEG_BASE_V,
  createBead,
  createPegStand,
  DESK_SURFACE_Y,
  getBeadDropCue,
  getBeadSnapPosition as computeBeadSnapOnPeg,
  getMinClearanceRadius,
  getPegDeskAnchor,
  getPegTopCenter,
  canReleaseThreadBead,
  canThreadBeadFromRelease,
  isBeadAtHoverHeight,
  isBeadAlignedForTopEntry,
  isBeadNearPegHint,
  getPegAxisXZ,
  snapBeadOntoPegAxis,
  getBeadHoverY,
  PEG_RADIUS_WORLD,
  PEG_SHADOW_OFFSET,
  resolveBeadDragPosition,
  PEG_WORLD_SCALE,
  REF_BEAD_EMISSIVE,
  REF_PEG_GLOW,
  updatePegThreadVisuals,
} from './bead-peg.js';
import { clamp, depthChannelT, lerp } from './params.js';
import type { VisualParams, VisionMode } from './params.js';
import type { SpatialSceneParams } from './spatial-depth.js';

const BLUR_PX = 14;
const OFFSET_X = 18;
const OFFSET_Y = 0;
const MISALIGN_GHOST = 0.76;

const RIGHT_EYE_BLUR_PX = 10;
const RIGHT_EYE_OFFSET_X = 18;
const RIGHT_EYE_OFFSET_Y = 0;
const RIGHT_EYE_MISALIGN_GHOST = 0.68;
const EYE_PREVIEW_OFFSET_X = 0.09;

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  offRenderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  bead: THREE.Mesh;
  peg: THREE.Group;
  pegGlow: THREE.Mesh;
  pegCapFront: THREE.Mesh;
  pegCapBack: THREE.Mesh;
  pegOccluder: THREE.Mesh;
  pegShaft: THREE.Mesh;
  pegThroughRing: THREE.Mesh;
  pegBoardShadow: THREE.Mesh;
  beadShadow: THREE.Mesh;
  pegShadow: THREE.Mesh;
  backgroundPlane: THREE.Mesh;
  dirLight: THREE.DirectionalLight;
  fog: THREE.Fog;
  farObjects: THREE.Object3D[];
  pegMaterial: THREE.MeshStandardMaterial;
  beadMaterial: THREE.MeshStandardMaterial;
  mainCanvas: HTMLCanvasElement;
  offCanvas: HTMLCanvasElement;
  mainViewportWidth: number;
  mainViewportHeight: number;
  /** 柱顶光圈接近开始时间（用于延迟显示）。 */
  pegGlowNearSince: number | null;
}

const SCENE_BG = 0xfff9ec;
const SCENE_BACKGROUND_URL = 'assets/images/scene-background.png';
const CAMERA_DEFAULT_POS = new THREE.Vector3(0.1, 2.45, 6.1);
const CAMERA_DEFAULT_LOOK = new THREE.Vector3(0.42, 0.52, 0.12);
const REF_CAMERA_FOV = 38;
const BACKGROUND_PLANE_DISTANCE = 5.4;
const REF_FOG_NEAR = 28;
const REF_FOG_FAR = 58;
const REF_LIGHT_INTENSITY = 1;
const REF_PEG_OPACITY = 1;
const DESK_SHADOW_LIFT = 0.0018;
const PEG_SHAFT_BASE_COLOR = new THREE.Color(0xf4f7fb);
const PEG_SHAFT_FLAT_COLOR = new THREE.Color(0xf2f0ea);
const PEG_SHAFT_BASE_EMISSIVE = new THREE.Color(0xe8eef6);
const PEG_SHAFT_FLAT_EMISSIVE = new THREE.Color(0xf4f1ea);

export interface DeskPlayBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function initThreeScene(
  mainCanvas: HTMLCanvasElement,
  onReady?: () => void
): SceneContext {
  const renderer = new THREE.WebGLRenderer({
    canvas: mainCanvas,
    antialias: true,
    alpha: false,
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const fog = new THREE.Fog(0xffffff, REF_FOG_NEAR, REF_FOG_FAR);
  scene.background = new THREE.Color(SCENE_BG);

  const camera = new THREE.PerspectiveCamera(REF_CAMERA_FOV, 1, 0.1, 50);
  camera.position.copy(CAMERA_DEFAULT_POS);
  camera.lookAt(CAMERA_DEFAULT_LOOK);

  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0xffffff, 0.62));
  scene.add(new THREE.AmbientLight(0xffffff, 0.38));

  const dirLight = new THREE.DirectionalLight(0xfff4e4, 1.06);
  dirLight.position.set(-7.8, 11.2, 4.2);
  scene.add(dirLight);

  const windowFill = new THREE.DirectionalLight(0xe8f2ff, 0.28);
  windowFill.position.set(-9, 8, 2);
  scene.add(windowFill);

  const { plane: backgroundPlane, farObjects } = createSceneBackground(scene, camera);
  const {
    peg,
    pegMaterial,
    pegGlow,
    pegCapFront,
    pegCapBack,
    pegOccluder,
    pegShaft,
    pegThroughRing,
    pegBoardShadow,
  } = createPegStand(scene);
  const { bead, beadMaterial } = createBead(scene);
  const beadShadow = createContactShadow(scene, 'bead');
  const pegShadow = createContactShadow(scene, 'peg');

  const ctxPartial = { peg, bead, beadShadow, pegShadow } as Pick<
    SceneContext,
    'peg' | 'bead' | 'beadShadow' | 'pegShadow'
  >;
  syncContactShadows(ctxPartial as SceneContext);
  applyContactShadowAppearance(ctxPartial as SceneContext, 1, false);

  loadSceneBackground(
    backgroundPlane.material as THREE.MeshBasicMaterial,
    onReady ?? (() => {})
  );

  const offCanvas = document.createElement('canvas');
  const offRenderer = new THREE.WebGLRenderer({
    canvas: offCanvas,
    antialias: true,
    alpha: false,
  });
  offRenderer.shadowMap.enabled = true;
  offRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  offRenderer.outputColorSpace = THREE.SRGBColorSpace;

  return {
    renderer,
    offRenderer,
    scene,
    camera,
    bead,
    peg,
    pegGlow,
    pegCapFront,
    pegCapBack,
    pegOccluder,
    pegShaft,
    pegThroughRing,
    pegBoardShadow,
    beadShadow,
    pegShadow,
    backgroundPlane,
    dirLight,
    fog,
    farObjects,
    pegMaterial,
    beadMaterial,
    mainCanvas,
    offCanvas,
    mainViewportWidth: 0,
    mainViewportHeight: 0,
    pegGlowNearSince: null,
  };
}

function positionBackgroundPlane(plane: THREE.Mesh, camera: THREE.PerspectiveCamera): void {
  const viewDir = new THREE.Vector3().subVectors(CAMERA_DEFAULT_LOOK, camera.position).normalize();
  const center = CAMERA_DEFAULT_LOOK.clone().addScaledVector(viewDir, BACKGROUND_PLANE_DISTANCE);
  plane.position.copy(center);
  plane.lookAt(camera.position);
  const dist = camera.position.distanceTo(plane.position);
  const vFov = (camera.fov * Math.PI) / 180;
  const h = 2 * Math.tan(vFov / 2) * dist * 1.06;
  const w = h * camera.aspect;
  plane.scale.set(w, h, 1);
}

function createSceneBackground(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): { plane: THREE.Mesh; farObjects: THREE.Object3D[] } {
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    depthWrite: false,
    fog: false,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  plane.renderOrder = -20;
  plane.frustumCulled = false;
  positionBackgroundPlane(plane, camera);
  scene.add(plane);
  return { plane, farObjects: [plane] };
}

function loadSceneBackground(material: THREE.MeshBasicMaterial, onLoaded: () => void): void {
  const loader = new THREE.TextureLoader();
  loader.load(
    SCENE_BACKGROUND_URL,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      material.map = tex;
      material.color.set(0xffffff);
      material.needsUpdate = true;
      onLoaded();
    },
    undefined,
    () => {
      material.color.set(SCENE_BG);
      onLoaded();
    }
  );
}

function createSoftShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.04, size * 0.5, size * 0.5, size * 0.5);
  grad.addColorStop(0, 'rgba(120, 94, 48, 1)');
  grad.addColorStop(0.42, 'rgba(90, 72, 42, 0.72)');
  grad.addColorStop(0.72, 'rgba(90, 72, 42, 0.28)');
  grad.addColorStop(1, 'rgba(90, 72, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadow(scene: THREE.Scene, kind: 'bead' | 'peg'): THREE.Mesh {
  const isPeg = kind === 'peg';
  const peakAlpha = isPeg ? 0.15 : 0.13;
  const pegFootprint = PEG_WORLD_SCALE * 0.95;
  const scaleX = isPeg ? pegFootprint * 2.1 : BEAD_MAJOR_R * 2.4;
  const scaleZ = isPeg ? pegFootprint * 1.55 : BEAD_MAJOR_R * 2.1;

  const mat = new THREE.MeshBasicMaterial({
    map: createSoftShadowTexture(),
    color: 0xffffff,
    transparent: true,
    opacity: peakAlpha,
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(scaleX, scaleZ, 1);
  mesh.renderOrder = 15;
  mesh.frustumCulled = false;
  mesh.userData.baseOpacity = peakAlpha;
  mesh.userData.baseScaleX = scaleX;
  mesh.userData.baseScaleZ = scaleZ;
  scene.add(mesh);
  return mesh;
}

function syncContactShadows(ctx: SceneContext, spatial?: SpatialSceneParams): void {
  const pegPos = new THREE.Vector3();
  ctx.peg.getWorldPosition(pegPos);
  ctx.pegShadow.position.set(
    pegPos.x + PEG_SHADOW_OFFSET.x,
    DESK_SURFACE_Y + DESK_SHADOW_LIFT,
    pegPos.z + PEG_SHADOW_OFFSET.z
  );

  const bead = ctx.bead.position;
  const mis = spatial?.shadowMisalign ?? 0;

  ctx.beadShadow.position.set(
    bead.x + BEAD_SHADOW_OFFSET.x + mis,
    DESK_SURFACE_Y + DESK_SHADOW_LIFT,
    bead.z + BEAD_SHADOW_OFFSET.z + mis * 0.72
  );
}

function getBeadHomeOffsetFromPeg(
  ctx: SceneContext,
  width: number,
  height: number
): { dx: number; dz: number } {
  const pegDesk = screenToWorldOnPegBase(
    ctx,
    width * BG_PEG_BASE_U,
    height * BG_PEG_BASE_V,
    width,
    height
  );
  const beadDesk = screenToWorldOnDesk(ctx, width * BG_BEAD_HOME_U, height * BG_BEAD_HOME_V, width, height);
  return { dx: beadDesk.x - pegDesk.x, dz: beadDesk.z - pegDesk.z };
}

function alignSceneToBackground(
  ctx: SceneContext,
  width: number,
  height: number,
  forceRecalc = false
): void {
  if (width < 2 || height < 2) return;

  let deskX: number;
  let deskZ: number;
  const hasPinned =
    typeof ctx.peg.userData.pinnedDeskX === 'number' &&
    typeof ctx.peg.userData.pinnedDeskZ === 'number';

  if (forceRecalc || !hasPinned) {
    const desk = screenToWorldOnPegBase(
      ctx,
      width * BG_PEG_BASE_U,
      height * BG_PEG_BASE_V,
      width,
      height
    );
    deskX = desk.x;
    deskZ = desk.z;
    ctx.peg.userData.pinnedDeskX = deskX;
    ctx.peg.userData.pinnedDeskZ = deskZ;
  } else {
    deskX = ctx.peg.userData.pinnedDeskX as number;
    deskZ = ctx.peg.userData.pinnedDeskZ as number;
  }

  ctx.peg.position.set(deskX, DESK_SURFACE_Y, deskZ);
  ctx.peg.visible = true;
  syncContactShadows(ctx);
}

export function restoreMainViewport(ctx: SceneContext): void {
  const w = ctx.mainViewportWidth || window.innerWidth;
  const h = ctx.mainViewportHeight || window.innerHeight;
  if (w < 2 || h < 2) return;
  resetCamera(ctx);
  ctx.camera.aspect = w / h;
  ctx.camera.updateProjectionMatrix();
  positionBackgroundPlane(ctx.backgroundPlane, ctx.camera);
  alignSceneToBackground(ctx, w, h);
}

export function resizeRenderer(ctx: SceneContext, width: number, height: number): void {
  ctx.mainViewportWidth = width;
  ctx.mainViewportHeight = height;
  ctx.renderer.setSize(width, height, false);
  resetCamera(ctx);
  ctx.camera.aspect = width / height;
  ctx.camera.updateProjectionMatrix();
  positionBackgroundPlane(ctx.backgroundPlane, ctx.camera);
  alignSceneToBackground(ctx, width, height, true);
}

function renderWith(
  ctx: SceneContext,
  renderer: THREE.WebGLRenderer,
  width: number,
  height: number
): void {
  renderer.setSize(width, height, false);
  ctx.camera.aspect = width / height;
  ctx.camera.updateProjectionMatrix();
  positionBackgroundPlane(ctx.backgroundPlane, ctx.camera);
  renderer.render(ctx.scene, ctx.camera);
}

export function renderBaseScene(ctx: SceneContext, width: number, height: number): void {
  if (width !== ctx.mainViewportWidth || height !== ctx.mainViewportHeight) {
    resizeRenderer(ctx, width, height);
  }
  ctx.renderer.render(ctx.scene, ctx.camera);
}

export function applyReferenceSceneAppearance(ctx: SceneContext): void {
  ctx.fog.near = REF_FOG_NEAR;
  ctx.fog.far = REF_FOG_FAR;
  ctx.dirLight.intensity = REF_LIGHT_INTENSITY;
  ctx.pegMaterial.opacity = REF_PEG_OPACITY;
  ctx.pegMaterial.emissiveIntensity = 0.04;

  const glowMat = ctx.pegGlow.material as THREE.MeshStandardMaterial;
  glowMat.emissiveIntensity = REF_PEG_GLOW;
  glowMat.opacity = 0.42;

  const frontMat = ctx.pegCapFront.material as THREE.MeshBasicMaterial;
  const backMat = ctx.pegCapBack.material as THREE.MeshBasicMaterial;
  frontMat.opacity = 0.78;
  backMat.opacity = 0.28;
  frontMat.depthWrite = false;
  ctx.pegCapFront.renderOrder = 7;

  const occluderMat = ctx.pegOccluder.material as THREE.MeshStandardMaterial;
  occluderMat.opacity = 0;
  ctx.pegOccluder.visible = false;
  ctx.pegThroughRing.visible = false;
  ctx.pegShaft.renderOrder = 5;
  ctx.bead.renderOrder = 10;
  ctx.peg.scale.setScalar(PEG_WORLD_SCALE);
  ctx.camera.fov = REF_CAMERA_FOV;
  ctx.pegGlow.position.x = 0;
  ctx.pegGlow.position.z = 0;

  applyContactShadowAppearance(ctx, 1, false);
  ctx.bead.scale.setScalar(1);
  ctx.beadMaterial.emissiveIntensity = REF_BEAD_EMISSIVE;
  syncContactShadows(ctx);
  applyFarObjectDepth(ctx, 1);
}

export function applyCentralSceneAppearance(ctx: SceneContext, params: VisualParams): void {
  const d = params.depthStrength;
  ctx.dirLight.intensity = REF_LIGHT_INTENSITY;
  ctx.peg.visible = true;
  ctx.pegMaterial.opacity = REF_PEG_OPACITY;
  ctx.pegMaterial.emissiveIntensity = 0.03 + 0.04 * d;
  ctx.beadMaterial.emissiveIntensity = REF_BEAD_EMISSIVE * (0.75 + 0.25 * d);

  const glowMat = ctx.pegGlow.material as THREE.MeshStandardMaterial;
  glowMat.emissiveIntensity = REF_PEG_GLOW * params.cupGlowStrength;
  glowMat.opacity = 0.04 + 0.38 * d;

  applyFarObjectDepth(ctx, d);
}

/** 按空间深度线索调整雾效、材质对比与桌面层次（不改变相机与物体世界坐标）。 */
export function applySpatialDepthAppearance(
  ctx: SceneContext,
  spatial: SpatialSceneParams
): void {
  const fogT = spatial.fogDepthT;
  const flat = 1 - spatial.perspectiveT;
  ctx.fog.near = lerp(REF_FOG_NEAR * 0.76, REF_FOG_NEAR, fogT);
  ctx.fog.far = lerp(REF_FOG_FAR * 0.65, REF_FOG_FAR, fogT);

  ctx.dirLight.intensity = lerp(
    REF_LIGHT_INTENSITY * 0.52,
    REF_LIGHT_INTENSITY * 1.1,
    spatial.perspectiveT
  );

  ctx.peg.scale.setScalar(PEG_WORLD_SCALE);

  const frontMat = ctx.pegCapFront.material as THREE.MeshBasicMaterial;
  const backMat = ctx.pegCapBack.material as THREE.MeshBasicMaterial;
  frontMat.opacity = lerp(0.018, 0.9, spatial.pegTopContrast);
  backMat.opacity = lerp(0.008, 0.28, spatial.pegTopContrast);

  ctx.beadMaterial.roughness = lerp(0.44, 0.2, spatial.beadHoleContrast);
  ctx.beadMaterial.metalness = lerp(0.02, 0.08, spatial.beadHoleContrast);
  ctx.beadMaterial.emissiveIntensity =
    REF_BEAD_EMISSIVE * lerp(0.35, 1.15, spatial.beadHoleContrast);

  const boardShadowMat = ctx.pegBoardShadow.material as THREE.MeshBasicMaterial;
  boardShadowMat.opacity = 0.08 * lerp(0.08, 1.4, spatial.deskDepthT);

  const pegShaftMat = ctx.pegShaft.material as THREE.MeshStandardMaterial;
  pegShaftMat.color.copy(PEG_SHAFT_BASE_COLOR).lerp(PEG_SHAFT_FLAT_COLOR, flat * 0.78);
  pegShaftMat.emissive.copy(PEG_SHAFT_BASE_EMISSIVE).lerp(PEG_SHAFT_FLAT_EMISSIVE, flat);
  pegShaftMat.emissiveIntensity = lerp(0.04, 0.22, flat);
  pegShaftMat.roughness = lerp(0.3, 0.88, flat);
  pegShaftMat.metalness = lerp(0.05, 0, flat);
}

export function applyInteractionAppearance(
  ctx: SceneContext,
  ip: InteractionParams,
  proximity: ProximityState,
  dragging: boolean,
  rimPulse = 0,
  threadPhase: BeadThreadVisualPhase = 'none',
  spatial?: SpatialSceneParams
): void {
  const d = ip.depthStrength;
  const depthT = depthChannelT(d);
  const now = performance.now();
  const aligned = proximity === 'drop';
  const glowStable = spatial?.glowStability ?? 1;

  if (aligned) {
    if (ctx.pegGlowNearSince === null) ctx.pegGlowNearSince = now;
  } else {
    ctx.pegGlowNearSince = null;
  }

  const glowDelay = ip.glowDelayMs;
  const nearElapsed = ctx.pegGlowNearSince ? now - ctx.pegGlowNearSince : 0;
  const glowReady = glowDelay <= 0 || nearElapsed >= glowDelay;
  const delayFade = glowDelay > 0 ? clamp(nearElapsed / glowDelay, 0, 1) : 1;

  const glowMat = ctx.pegGlow.material as THREE.MeshStandardMaterial;
  let glow = REF_PEG_GLOW * ip.rimGlowOpacity * (0.14 + 0.86 * d);
  if (aligned) glow *= (0.72 + 0.92 * depthT) * delayFade;
  else if (proximity === 'hint') glow *= 0.04 + 0.06 * depthT;
  else glow *= 0.05 + 0.14 * depthT;
  if (dragging && proximity === 'far') glow *= 1.02 + 0.05 * d;
  glow += rimPulse * (0.28 + 0.45 * ip.rimGlowOpacity);
  if (!glowReady) glow *= 0.12;
  if (glowStable < 0.95) {
    glow *= 0.72 + 0.28 * glowStable + 0.08 * Math.sin(now * 0.011);
  }

  glowMat.emissiveIntensity = glow;
  glowMat.opacity =
    (0.05 + 0.26 * d) *
    ip.rimGlowOpacity *
    (aligned ? delayFade : proximity === 'hint' ? 0.08 + 0.1 * depthT : 0.12 + 0.18 * depthT);

  ctx.pegGlow.position.x = 0;
  ctx.pegGlow.position.z = 0;

  const frontMat = ctx.pegCapFront.material as THREE.MeshBasicMaterial;
  const backMat = ctx.pegCapBack.material as THREE.MeshBasicMaterial;
  const capContrast = spatial?.pegTopContrast ?? depthT;
  const spatialT = spatial?.perspectiveT ?? depthT;
  const capProximity = proximity === 'drop' ? 1 : proximity === 'hint' ? 0.65 : 0.2;
  frontMat.opacity =
    lerp(0.018, 0.9, capContrast) *
    (0.62 + 0.38 * ip.rimGlowOpacity) *
    (dragging ? 0.75 + 0.25 * capProximity : 1);
  backMat.opacity = lerp(0.008, 0.28, capContrast) * (0.5 + 0.5 * ip.rimGlowOpacity);

  const oc = spatial?.occlusionClarity ?? depthT;
  const hoverY = getBeadHoverY(ctx.peg);
  const liftT = clamp(
    (ctx.bead.position.y - BEAD_CENTER_Y) / Math.max(0.001, hoverY - BEAD_CENTER_Y),
    0,
    1
  );
  const atHoverHeight = liftT >= 0.76 || isBeadAtHoverHeight(ctx.bead, ctx.peg);
  const nearPeg = isBeadNearPegHint(ctx.bead, ctx.peg, ip.snapRadiusScale);
  const hoveringAbovePeg = dragging && atHoverHeight && nearPeg;
  const effectivePhase: BeadThreadVisualPhase =
    threadPhase !== 'none' ? threadPhase : hoveringAbovePeg ? 'hover' : 'none';
  const threading = effectivePhase !== 'none';

  if (threading) {
    frontMat.opacity = Math.max(
      frontMat.opacity,
      lerp(lerp(0.12, 0.55, spatialT), lerp(0.24, 0.96, spatialT), oc)
    );
    frontMat.depthWrite = oc > 0.25;
    if (effectivePhase === 'hover') {
      ctx.pegShaft.renderOrder = 5;
      ctx.bead.renderOrder = 10;
      ctx.pegCapFront.renderOrder = 11;
      ctx.pegCapBack.renderOrder = 2;
    } else {
      ctx.bead.renderOrder = lerp(6, 8, oc);
      ctx.pegCapFront.renderOrder = 14;
      ctx.pegCapBack.renderOrder = 3;
    }
  } else {
    frontMat.depthWrite = false;
    ctx.pegCapFront.renderOrder = 8;
    if (dragging) {
      ctx.bead.renderOrder = 10;
      ctx.pegShaft.renderOrder = 5;
    } else {
      ctx.bead.renderOrder = lerp(6, 10, oc);
      ctx.pegShaft.renderOrder = lerp(6, 5, oc);
    }
  }

  updatePegThreadVisuals(
    ctx.peg,
    ctx.pegShaft,
    ctx.pegThroughRing,
    ctx.pegOccluder,
    ctx.bead.position.y,
    effectivePhase,
    oc
  );

  applyContactShadowAppearance(ctx, ip.shadowOpacity, dragging, d, spatial, liftT);

  const beadScale = dragging ? 1.03 + 0.02 * d : 1;
  ctx.bead.scale.setScalar(beadScale);
  syncContactShadows(ctx, spatial);

  if (ip.shadowOpacity < 0.96 && dragging) {
    const wobble =
      (1 - ip.shadowOpacity) * 0.003 * Math.sin(performance.now() * 0.01);
    ctx.beadShadow.position.x += wobble;
    ctx.beadShadow.position.z += wobble * 0.6;
  }
}

function applyContactShadowAppearance(
  ctx: SceneContext,
  shadowStrength: number,
  dragging: boolean,
  depthStrength = 1,
  spatial?: SpatialSceneParams,
  liftT = 0
): void {
  const spatialMul = spatial?.shadowStrength ?? 1;
  const spreadMul = spatial?.shadowSpread ?? 1;
  const dragBoost = dragging ? 1.06 + 0.05 * depthStrength : 1;
  const weaken = 1 - shadowStrength;
  const spread = (1 + weaken * 0.35) * spreadMul;
  const deskShadowT = 1 - clamp(liftT, 0, 1);
  for (const shadow of [ctx.beadShadow, ctx.pegShadow]) {
    const mat = shadow.material as THREE.MeshBasicMaterial;
    const baseOpacity = (shadow.userData.baseOpacity as number) ?? 0.11;
    const isBead = shadow === ctx.beadShadow;
    const depthMul = isBead ? 0.52 + 0.48 * depthStrength : 0.7 + 0.3 * depthStrength;
    const liftFade = isBead ? deskShadowT : 1;
    mat.opacity = baseOpacity * shadowStrength * spatialMul * dragBoost * depthMul * liftFade;
    const sx = (shadow.userData.baseScaleX as number) * spread;
    const sz =
      (shadow.userData.baseScaleZ as number) *
      spread *
      (isBead ? 1 + weaken * 0.1 : 1);
    shadow.scale.set(sx, sz, 1);
  }
}

function applyFarObjectDepth(ctx: SceneContext, depthStrength: number): void {
  const opacity = 0.9 + 0.1 * depthStrength;
  for (const obj of ctx.farObjects) {
    obj.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (m instanceof THREE.MeshBasicMaterial) {
          m.transparent = opacity < 0.99;
          m.opacity = opacity;
        }
      }
    });
  }
}

export function getPegTipScreen(
  ctx: SceneContext,
  width: number,
  height: number
): { x: number; y: number } {
  return projectToScreen(ctx, getPegTopCenter(ctx.peg), width, height);
}

export function getPegDropZoneScreen(
  ctx: SceneContext,
  width: number,
  height: number,
  dropZoneScale: number
): TargetDropZoneScreen {
  const top = getPegTopCenter(ctx.peg);
  const csTop = projectToScreen(ctx, top, width, height);
  const anchor = getPegDeskAnchor(ctx.peg);
  const csDesk = projectToScreen(ctx, anchor, width, height);

  const rimX = top.clone();
  rimX.x += PEG_RADIUS_WORLD;
  const rimScreenX = projectToScreen(ctx, rimX, width, height);

  const rimZ = top.clone();
  rimZ.z += PEG_RADIUS_WORLD * 0.55;
  const rimScreenZ = projectToScreen(ctx, rimZ, width, height);

  const pegW = Math.abs(rimScreenX.x - csTop.x) * 2.2;
  const pegH = Math.hypot(rimScreenZ.x - csTop.x, rimScreenZ.y - csTop.y) * 2;

  return {
    cx: csTop.x,
    cy: csTop.y,
    radiusX: pegW * 0.85 * dropZoneScale,
    radiusY: Math.max(pegH * 0.95, pegW * 0.42) * dropZoneScale,
  };
}

/** @deprecated */
export const getCupMouthScreen = getPegTipScreen;
/** @deprecated */
export const getCupDropZoneScreen = getPegDropZoneScreen;

export function computeDeskPlayBounds(
  ctx: SceneContext,
  width: number,
  height: number
): DeskPlayBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  const xs = [0.08, 0.18, 0.28, 0.38, 0.5, 0.62, 0.72, 0.82, 0.92];
  const ys = [0.38, 0.44, 0.5, 0.56, 0.62, 0.68, 0.74, 0.78, 0.82];

  for (const ux of xs) {
    for (const uy of ys) {
      const p = screenToWorldOnDesk(ctx, width * ux, height * uy, width, height);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) continue;
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
  }

  const peg = getPegDeskAnchor(ctx.peg);
  const beadHome = getBeadDefaultPosition(ctx);
  const reach = PEG_RADIUS_WORLD + BEAD_MAJOR_R * 2.4;

  minX = Math.min(minX, peg.x - reach, beadHome.x - reach);
  maxX = Math.max(maxX, peg.x + reach, beadHome.x + reach);
  minZ = Math.min(minZ, peg.z - reach, beadHome.z - reach);
  maxZ = Math.max(maxZ, peg.z + reach, beadHome.z + reach);

  if (!Number.isFinite(minX)) {
    return { minX: -0.2, maxX: 1.65, minZ: -0.4, maxZ: 0.95 };
  }

  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;
  const padX = spanX * 0.06;
  const padZ = spanZ * 0.06;
  return {
    minX: minX - padX,
    maxX: maxX + padX,
    minZ: minZ - padZ,
    maxZ: maxZ + padZ,
  };
}

export function clampBeadToDesk(pos: THREE.Vector3, bounds: DeskPlayBounds): THREE.Vector3 {
  pos.x = Math.min(bounds.maxX, Math.max(bounds.minX, pos.x));
  pos.z = Math.min(bounds.maxZ, Math.max(bounds.minZ, pos.z));
  return pos;
}

/** @deprecated */
export const clampBallToDesk = clampBeadToDesk;

export interface DragPointerState {
  lastScreenX: number;
  lastScreenY: number;
  grabOffsetX: number;
  grabOffsetZ: number;
  ready: boolean;
}

export function resetDragPointerState(
  drag: DragPointerState,
  sx: number,
  sy: number,
  ctx: SceneContext,
  width: number,
  height: number,
  beadX: number,
  beadZ: number
): void {
  const hit = screenToWorldOnHorizontalPlane(ctx, sx, sy, width, height, BEAD_CENTER_Y);
  drag.lastScreenX = sx;
  drag.lastScreenY = sy;
  drag.grabOffsetX = beadX - hit.x;
  drag.grabOffsetZ = beadZ - hit.z;
  drag.ready = true;
}

export function isPointerOnBead(
  ctx: SceneContext,
  sx: number,
  sy: number,
  width: number,
  height: number
): boolean {
  const ndc = new THREE.Vector2((sx / width) * 2 - 1, -(sy / height) * 2 + 1);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, ctx.camera);
  const hits = raycaster.intersectObject(ctx.bead, false);
  if (hits.length > 0) return true;

  const beadScreen = projectToScreen(ctx, ctx.bead.position, width, height);
  const dx = sx - beadScreen.x;
  const dy = sy - beadScreen.y;
  return dx * dx + dy * dy <= 62 * 62;
}

/** @deprecated */
export const isPointerOnBall = isPointerOnBead;

function getPointerPegSnapStrength(
  ctx: SceneContext,
  sx: number,
  sy: number,
  width: number,
  height: number,
  snapRadiusScale: number
): number {
  const tip = getPegTipScreen(ctx, width, height);
  const screenR = 88 * (0.62 + 0.38 * snapRadiusScale);
  const dist = Math.hypot(sx - tip.x, sy - tip.y);
  if (dist >= screenR) return 0;
  const t = 1 - dist / screenR;
  return t * t;
}

function moveBeadByDragDelta(
  ctx: SceneContext,
  sx: number,
  sy: number,
  width: number,
  height: number,
  drag: DragPointerState,
  bounds?: DeskPlayBounds,
  ip?: InteractionParams
): void {
  if (Math.abs(sx - drag.lastScreenX) < 0.25 && Math.abs(sy - drag.lastScreenY) < 0.25) {
    return;
  }

  const deskHit = screenToWorldOnHorizontalPlane(ctx, sx, sy, width, height, BEAD_CENTER_Y);
  const snapT = ip ? getPointerPegSnapStrength(ctx, sx, sy, width, height, ip.snapRadiusScale) : 0;
  const world = new THREE.Vector3(
    deskHit.x + drag.grabOffsetX,
    BEAD_CENTER_Y,
    deskHit.z + drag.grabOffsetZ
  );

  if (bounds) clampBeadToDesk(world, bounds);

  if (ip && (ip.spatialDragBiasX !== 0 || ip.spatialDragBiasZ !== 0)) {
    const axis = getPegAxisXZ(ctx.peg);
    const dist = Math.hypot(world.x - axis.x, world.z - axis.z);
    const nearPeg = dist < getMinClearanceRadius(ctx.peg) + BEAD_MAJOR_R * 0.65;
    if (!nearPeg) {
      const jitter =
        ip.shadowOpacity < 0.92
          ? (1 - ip.shadowOpacity) * 0.004 * Math.sin(performance.now() * 0.011)
          : 0;
      world.x += ip.spatialDragBiasX + jitter;
      world.z += ip.spatialDragBiasZ + jitter * 0.7;
    }
  }

  if (ip && ip.depthDriftWorld > 0) {
    const axis = getPegAxisXZ(ctx.peg);
    const dist = Math.hypot(world.x - axis.x, world.z - axis.z);
    const nearR = getMinClearanceRadius(ctx.peg) + BEAD_MAJOR_R * 3.2;
    const nearT = clamp(1 - dist / Math.max(0.001, nearR), 0, 1);
    if (nearT > 0.02) {
      const hoverY = getBeadHoverY(ctx.peg);
      const liftT = clamp(
        (ctx.bead.position.y - BEAD_CENTER_Y) / Math.max(0.001, hoverY - BEAD_CENTER_Y),
        0,
        1
      );
      const phase = performance.now() * 0.0022;
      const aimUncertainty = nearT * (0.42 + 0.58 * liftT);
      const drift = ip.depthDriftWorld * aimUncertainty;
      world.x += Math.sin(phase) * drift * 0.72;
      world.z += (Math.cos(phase * 0.74) * 0.78 + Math.sin(phase * 1.28) * 0.26) * drift;
      if (bounds) clampBeadToDesk(world, bounds);
    }
  }

  const dx = world.x - ctx.bead.position.x;
  const dz = world.z - ctx.bead.position.z;
  const horizontalStep = Math.hypot(dx, dz);
  const maxStep = BEAD_MAJOR_R * 0.95;
  if (horizontalStep > maxStep) {
    const s = maxStep / horizontalStep;
    world.x = ctx.bead.position.x + dx * s;
    world.z = ctx.bead.position.z + dz * s;
  }

  if (ip) {
    resolveBeadDragPosition(world, ctx.peg, ip, snapT, ctx.bead.position.y, ctx.bead.position);
  }

  ctx.bead.position.copy(world);
  drag.lastScreenX = sx;
  drag.lastScreenY = sy;
}

export type BeadDropCue = import('./bead-peg.js').BeadDropCue;

export function getBeadDropCueForScene(
  ctx: SceneContext,
  width: number,
  height: number,
  ip: InteractionParams,
  dragging: boolean
): BeadDropCue {
  const zone = getPegDropZoneScreen(ctx, width, height, ip.dropZoneScale);
  const beadScreen = projectToScreen(ctx, ctx.bead.position, width, height);
  return getBeadDropCue(ctx.bead, ctx.peg, beadScreen, zone, ip, dragging);
}

/** @deprecated */
export const getBallDropCue = getBeadDropCueForScene;

export function snapBeadFromReleasePointer(
  ctx: SceneContext,
  _sx: number,
  _sy: number,
  _width: number,
  _height: number,
  ip: InteractionParams
): void {
  if (!canThreadBeadFromRelease(ctx.bead, ctx.peg, ip.snapRadiusScale)) return;
  snapBeadOntoPegAxis(ctx.bead, ctx.peg, true);
}

export function canThreadBeadAtScreen(
  ctx: SceneContext,
  _width: number,
  _height: number,
  ip: InteractionParams
): boolean {
  return canThreadBeadFromRelease(ctx.bead, ctx.peg, ip.snapRadiusScale);
}

/** @deprecated */
export const isBallInDropZone = canThreadBeadAtScreen;

export function isBeadInSnapZone(
  ctx: SceneContext,
  width: number,
  height: number,
  ip: InteractionParams
): boolean {
  return canThreadBeadAtScreen(ctx, width, height, ip);
}

export function getBeadSnapPosition(ctx: SceneContext, slide = 0): THREE.Vector3 {
  return computeBeadSnapOnPeg(ctx.peg, slide);
}

/** @deprecated */
export const getBallSnapPosition = (ctx: SceneContext) => getBeadSnapPosition(ctx, 0);

export function placeBeadFromDragPointer(
  ctx: SceneContext,
  sx: number,
  sy: number,
  width: number,
  height: number,
  ip: InteractionParams,
  bounds: DeskPlayBounds,
  drag: DragPointerState
): void {
  moveBeadByDragDelta(ctx, sx, sy, width, height, drag, bounds, ip);
  ctx.bead.visible = true;
}

/** @deprecated */
export const placeBallFromDragPointer = placeBeadFromDragPointer;

export function getBeadDefaultPosition(ctx?: SceneContext): THREE.Vector3 {
  if (!ctx) {
    return new THREE.Vector3(BEAD_HOME_FALLBACK_DX, BEAD_CENTER_Y, BEAD_HOME_FALLBACK_DZ);
  }

  const pegBase = new THREE.Vector3();
  ctx.peg.getWorldPosition(pegBase);

  const w = ctx.mainViewportWidth;
  const h = ctx.mainViewportHeight;
  if (w >= 2 && h >= 2) {
    const { dx, dz } = getBeadHomeOffsetFromPeg(ctx, w, h);
    return new THREE.Vector3(pegBase.x + dx, BEAD_CENTER_Y, pegBase.z + dz);
  }

  return new THREE.Vector3(
    pegBase.x + BEAD_HOME_FALLBACK_DX,
    BEAD_CENTER_Y,
    pegBase.z + BEAD_HOME_FALLBACK_DZ
  );
}

/** @deprecated */
export const getBallDefaultPosition = getBeadDefaultPosition;

export function projectToScreen(
  ctx: SceneContext,
  pos: THREE.Vector3,
  width: number,
  height: number
): { x: number; y: number } {
  const v = pos.clone().project(ctx.camera);
  return {
    x: ((v.x + 1) / 2) * width,
    y: ((-v.y + 1) / 2) * height,
  };
}

export function screenToWorldOnHorizontalPlane(
  ctx: SceneContext,
  sx: number,
  sy: number,
  width: number,
  height: number,
  planeY: number
): THREE.Vector3 {
  const ndc = new THREE.Vector2((sx / width) * 2 - 1, -(sy / height) * 2 + 1);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, ctx.camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
  const target = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(plane, target);
  if (!hit || !Number.isFinite(target.x) || !Number.isFinite(target.z)) {
    const top = getPegTopCenter(ctx.peg);
    target.set(top.x, planeY, top.z);
  }
  target.y = planeY;
  return target;
}

export function screenToWorldOnDesk(
  ctx: SceneContext,
  sx: number,
  sy: number,
  width: number,
  height: number
): THREE.Vector3 {
  return screenToWorldOnHorizontalPlane(ctx, sx, sy, width, height, BEAD_CENTER_Y);
}

function screenToWorldOnPegBase(
  ctx: SceneContext,
  sx: number,
  sy: number,
  width: number,
  height: number
): THREE.Vector3 {
  return screenToWorldOnHorizontalPlane(ctx, sx, sy, width, height, DESK_SURFACE_Y);
}

type EyeSide = 'left' | 'right';

export function renderClearEyePreview(
  ctx: SceneContext,
  target: HTMLCanvasElement,
  eye: EyeSide
): void {
  const w = target.width;
  const h = target.height;
  applyReferenceSceneAppearance(ctx);
  resetCamera(ctx);
  applyEyePreviewCamera(ctx, eye);
  renderWith(ctx, ctx.offRenderer, w, h);
  restoreMainViewport(ctx);

  const c2d = target.getContext('2d')!;
  c2d.clearRect(0, 0, w, h);
  c2d.drawImage(ctx.offCanvas, 0, 0, w, h);
}

export function renderLeftEyePreview(ctx: SceneContext, target: HTMLCanvasElement): void {
  renderClearEyePreview(ctx, target, 'left');
}

function resetCamera(ctx: SceneContext): void {
  ctx.camera.fov = REF_CAMERA_FOV;
  ctx.camera.position.copy(CAMERA_DEFAULT_POS);
  ctx.camera.lookAt(CAMERA_DEFAULT_LOOK);
  ctx.camera.updateProjectionMatrix();
  ctx.peg.scale.setScalar(PEG_WORLD_SCALE);
}

function applyEyePreviewCamera(ctx: SceneContext, eye: 'left' | 'right'): void {
  const offset = eye === 'left' ? -EYE_PREVIEW_OFFSET_X : EYE_PREVIEW_OFFSET_X;
  ctx.camera.position.x = CAMERA_DEFAULT_POS.x + offset;
  ctx.camera.lookAt(
    CAMERA_DEFAULT_LOOK.x + offset * 0.45,
    CAMERA_DEFAULT_LOOK.y,
    CAMERA_DEFAULT_LOOK.z
  );
}

let rightEyeScratch: HTMLCanvasElement | null = null;

export function renderRightEyePreview(
  ctx: SceneContext,
  target: HTMLCanvasElement,
  mode: VisionMode,
  rightEyeAttenuation: number,
  eye: EyeSide = 'right'
): void {
  const w = target.width;
  const h = target.height;

  applyReferenceSceneAppearance(ctx);
  resetCamera(ctx);
  applyEyePreviewCamera(ctx, eye);
  renderWith(ctx, ctx.offRenderer, w, h);
  restoreMainViewport(ctx);

  const c2d = target.getContext('2d')!;
  const glCanvas = ctx.offCanvas;
  c2d.clearRect(0, 0, w, h);

  const scaleX = w / glCanvas.width;
  const scaleY = h / glCanvas.height;
  const ox = RIGHT_EYE_OFFSET_X * scaleX;
  const oy = RIGHT_EYE_OFFSET_Y * scaleY;

  switch (mode) {
    case 'normal':
      c2d.drawImage(glCanvas, 0, 0, w, h);
      break;
    case 'blur':
      c2d.filter = `blur(${RIGHT_EYE_BLUR_PX * scaleX}px)`;
      c2d.drawImage(glCanvas, 0, 0, w, h);
      c2d.filter = 'none';
      break;
    case 'misalignment': {
      const offsetScale = lerp(1, 0, rightEyeAttenuation);
      const ghostStr = lerp(1, 0, rightEyeAttenuation);
      c2d.drawImage(glCanvas, 0, 0, w, h);
      if (ghostStr > 0.015) {
        c2d.globalAlpha = RIGHT_EYE_MISALIGN_GHOST * ghostStr;
        c2d.drawImage(glCanvas, ox * offsetScale, oy * offsetScale, w, h);
        c2d.globalAlpha = 1;
      }
      break;
    }
    case 'occlusion':
      c2d.filter = `blur(${2.4 * scaleX}px) saturate(0.55) contrast(0.66) brightness(1.16)`;
      c2d.drawImage(glCanvas, 0, 0, w, h);
      c2d.filter = 'none';
      drawRightEyeOcclusionMask(c2d, w, h);
      break;
  }

  applyRightEyeAttenuation(c2d, w, h, rightEyeAttenuation);
}

function drawRightEyeOcclusionMask(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.globalAlpha = 1;

  const veil = ctx.createLinearGradient(0, 0, 0, h);
  veil.addColorStop(0, 'rgba(238, 230, 214, 0.96)');
  veil.addColorStop(0.28, 'rgba(250, 244, 229, 0.86)');
  veil.addColorStop(0.62, 'rgba(255, 251, 241, 0.62)');
  veil.addColorStop(1, 'rgba(255, 249, 236, 0.42)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.46;
  const cataract = ctx.createRadialGradient(cx, cy, w * 0.04, cx, cy, w * 0.7);
  cataract.addColorStop(0, 'rgba(255, 255, 252, 0.72)');
  cataract.addColorStop(0.36, 'rgba(255, 252, 244, 0.58)');
  cataract.addColorStop(0.72, 'rgba(255, 249, 236, 0.28)');
  cataract.addColorStop(1, 'rgba(255, 249, 236, 0)');
  ctx.fillStyle = cataract;
  ctx.fillRect(0, 0, w, h);

  const glare = ctx.createRadialGradient(w * 0.42, h * 0.3, 0, w * 0.42, h * 0.3, w * 0.38);
  glare.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
  glare.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glare;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function applyRightEyeAttenuation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength: number
): void {
  const t = Math.min(1, Math.max(0, strength));
  if (t <= 0.005) return;

  if (!rightEyeScratch) rightEyeScratch = document.createElement('canvas');
  if (rightEyeScratch.width !== w || rightEyeScratch.height !== h) {
    rightEyeScratch.width = w;
    rightEyeScratch.height = h;
  }
  const scratch = rightEyeScratch.getContext('2d')!;
  scratch.clearRect(0, 0, w, h);
  scratch.drawImage(ctx.canvas, 0, 0, w, h);

  ctx.clearRect(0, 0, w, h);
  ctx.filter = `saturate(${lerp(1, 0.32, t)}) contrast(${lerp(1, 0.62, t)}) brightness(${lerp(1, 1.08, t)})`;
  ctx.globalAlpha = lerp(1, 0.38, t);
  ctx.drawImage(rightEyeScratch, 0, 0, w, h);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;

  const topMist = ctx.createLinearGradient(0, 0, 0, h);
  topMist.addColorStop(0, `rgba(255, 252, 246, ${t * 0.36})`);
  topMist.addColorStop(0.45, `rgba(255, 249, 238, ${t * 0.2})`);
  topMist.addColorStop(1, `rgba(255, 249, 236, ${t * 0.08})`);
  ctx.fillStyle = topMist;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.4;
  const haze = ctx.createRadialGradient(cx, cy, w * 0.08, cx, cy, w * 0.82);
  haze.addColorStop(0, `rgba(255, 255, 252, ${t * 0.16})`);
  haze.addColorStop(0.55, `rgba(255, 249, 238, ${t * 0.1})`);
  haze.addColorStop(1, 'rgba(255, 249, 236, 0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h);
}

function drawCentralMisalignmentOverlay(
  ctx: CanvasRenderingContext2D,
  glCanvas: HTMLCanvasElement,
  w: number,
  h: number,
  params: VisualParams
): void {
  const { misalignOffsetScale, misalignGhostStrength, abnormalContribution } = params;
  if (misalignGhostStrength < 0.015) return;
  const scale = Math.max(0.85, w / 1440);
  const ox = OFFSET_X * scale * misalignOffsetScale;
  const oy = OFFSET_Y * scale * misalignOffsetScale;
  ctx.globalAlpha = MISALIGN_GHOST * 0.62 * misalignGhostStrength * abnormalContribution;
  ctx.drawImage(glCanvas, ox, oy, w, h);
}

function drawDepthFusionGhost(
  ctx: CanvasRenderingContext2D,
  glCanvas: HTMLCanvasElement,
  w: number,
  h: number,
  spatial?: SpatialSceneParams
): void {
  const strength = spatial?.fusionGhostStrength ?? 0;
  const offset = spatial?.fusionGhostOffsetPx ?? 0;
  if (strength < 0.01 || offset < 0.2) return;

  const t = performance.now() * 0.0012;
  const drift = 0.72 + 0.28 * Math.sin(t);
  const ox = offset * drift;
  const oy = offset * 0.24 * Math.cos(t * 0.8);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = strength * 0.16;
  ctx.drawImage(glCanvas, -ox, oy, w, h);
  ctx.globalAlpha = strength * 0.1;
  ctx.drawImage(glCanvas, ox * 0.62, -oy * 0.7, w, h);
  ctx.restore();
}

export function drawCentralOverlay(
  overlay: HTMLCanvasElement,
  glCanvas: HTMLCanvasElement,
  mode: VisionMode,
  params: VisualParams,
  spatial?: SpatialSceneParams
): void {
  const ctx = overlay.getContext('2d')!;
  const w = overlay.clientWidth;
  const h = overlay.clientHeight;
  ctx.clearRect(0, 0, w, h);

  const alpha = params.abnormalContribution;
  if (mode !== 'normal') {
    drawDepthFusionGhost(ctx, glCanvas, w, h, spatial);
  }

  if (mode === 'misalignment') {
    if (params.misalignGhostStrength > 0.015) {
      drawCentralMisalignmentOverlay(ctx, glCanvas, w, h, params);
    }
  } else if (mode !== 'normal' && alpha > 0.01) {
    if (mode === 'blur') {
      const viewScale = Math.max(0.85, w / 1280);
      const depthT = spatial?.perspectiveT ?? 1;
      const blurScale = spatial?.centralBlurScale ?? 1;
      const blurPx = BLUR_PX * blurScale * viewScale;
      const blurBlend = Math.min(1, alpha * lerp(1.45, 1.05, depthT));
      if (blurPx > 0.5 && blurBlend > 0.03) {
        ctx.globalAlpha = blurBlend;
        ctx.filter = `blur(${blurPx}px)`;
        ctx.drawImage(glCanvas, 0, 0, w, h);
        ctx.filter = 'none';
      }
    } else if (mode === 'occlusion') {
      ctx.globalAlpha = alpha * lerp(0.72, 0.96, spatial?.perspectiveT ?? 0.5);
      ctx.filter = `blur(${lerp(2.2, 4.6, 1 - (spatial?.perspectiveT ?? 0.5))}px) saturate(0.56) contrast(0.68) brightness(1.12)`;
      ctx.drawImage(glCanvas, 0, 0, w, h);
      ctx.filter = 'none';
      drawCentralOcclusionMask(ctx, w, h, lerp(0.88, 1.18, spatial?.perspectiveT ?? 0.5));
    }
    ctx.globalAlpha = 1;
  }

  if (mode !== 'normal') {
    const spatialAlpha = Math.max(alpha * 0.72, (spatial?.fusionGhostStrength ?? 0) * 0.35);
    drawSpatialFlattenMist(ctx, w, h, spatialAlpha, spatial);
    ctx.globalAlpha = 1;
  }
}

/** 压低空间层次感的薄雾（替代整屏强 blur）。 */
function drawSpatialFlattenMist(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  alpha: number,
  spatial?: SpatialSceneParams
): void {
  const flat = 1 - (spatial?.perspectiveT ?? 0.5);
  if (flat < 0.08) return;

  const cx = w * 0.52;
  const cy = h * 0.48;
  const mist = ctx.createRadialGradient(cx, cy, w * 0.06, cx, cy, w * 0.58);
  mist.addColorStop(0, `rgba(255, 252, 246, ${alpha * flat * 0.18})`);
  mist.addColorStop(0.55, `rgba(255, 249, 238, ${alpha * flat * 0.13})`);
  mist.addColorStop(1, 'rgba(255, 249, 236, 0)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, w, h);

  const deskGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
  deskGrad.addColorStop(0, 'rgba(255, 249, 236, 0)');
  deskGrad.addColorStop(1, `rgba(248, 244, 236, ${alpha * flat * 0.22})`);
  ctx.fillStyle = deskGrad;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
}

function drawCentralOcclusionMask(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength: number
): void {
  const s = Math.min(1.25, Math.max(0, strength));
  const fullGrad = ctx.createLinearGradient(0, 0, 0, h);
  fullGrad.addColorStop(0, `rgba(230, 222, 207, ${0.72 * s})`);
  fullGrad.addColorStop(0.34, `rgba(248, 242, 228, ${0.56 * s})`);
  fullGrad.addColorStop(0.72, `rgba(255, 251, 242, ${0.44 * s})`);
  fullGrad.addColorStop(1, `rgba(255, 249, 236, ${0.3 * s})`);
  ctx.fillStyle = fullGrad;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.52;
  const cy = h * 0.38;
  const grad = ctx.createRadialGradient(cx, cy, 6, cx, cy, w * 0.64);
  grad.addColorStop(0, `rgba(255, 255, 252, ${0.62 * s})`);
  grad.addColorStop(0.42, `rgba(255, 251, 242, ${0.48 * s})`);
  grad.addColorStop(0.76, `rgba(255, 249, 236, ${0.24 * s})`);
  grad.addColorStop(1, 'rgba(255, 249, 236, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawLocalDepthAmbiguity(
  ctx: CanvasRenderingContext2D,
  beadScreen: { x: number; y: number },
  targetZone: TargetDropZoneScreen,
  tip: { x: number; y: number },
  ambiguity: number
): void {
  if (ambiguity < 0.05) return;

  const now = performance.now() * 0.001;
  const amp = 4 + 7 * ambiguity;
  ctx.save();
  ctx.lineCap = 'round';

  for (let i = 0; i < 3; i++) {
    const phase = now * (1.1 + i * 0.18) + i * 2.15;
    const ox = Math.sin(phase) * amp * (0.45 + i * 0.18);
    const oy = Math.cos(phase * 0.86) * amp * 0.34;
    ctx.beginPath();
    ctx.ellipse(
      targetZone.cx + ox,
      targetZone.cy + oy,
      targetZone.radiusX * (1 + ambiguity * (0.26 + i * 0.08)),
      targetZone.radiusY * (1 + ambiguity * (0.42 + i * 0.1)),
      0,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = `rgba(86, 147, 226, ${0.07 * ambiguity * (1 - i * 0.18)})`;
    ctx.lineWidth = 0.9 + ambiguity * 0.75;
    ctx.stroke();
  }

  const ringR = Math.max(10, Math.min(30, targetZone.radiusX * 0.48));
  for (let i = 0; i < 2; i++) {
    const phase = now * (1.35 + i * 0.22) + i * 2.7;
    const ox = Math.cos(phase) * amp * 0.45;
    const oy = Math.sin(phase * 0.9) * amp * 0.28;
    ctx.beginPath();
    ctx.ellipse(
      beadScreen.x + ox,
      beadScreen.y + oy,
      ringR * (1.18 + i * 0.14),
      ringR * (0.52 + i * 0.06),
      0,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = `rgba(46, 116, 210, ${0.07 * ambiguity * (1 - i * 0.22)})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 3.8 + ambiguity * 4.8, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(74, 143, 232, ${0.045 * ambiguity})`;
  ctx.fill();
  ctx.restore();
}

export function drawInteractionOverlay(
  overlay: HTMLCanvasElement,
  ip: InteractionParams,
  proximity: ProximityState,
  dragging: boolean,
  beadScreen: { x: number; y: number },
  targetZone: TargetDropZoneScreen,
  pegTipScreen: { x: number; y: number },
  blockedDragHint = false,
  _dragFromScreen?: { x: number; y: number },
  spatial?: SpatialSceneParams
): void {
  const ctx = overlay.getContext('2d')!;
  const w = overlay.clientWidth;
  const h = overlay.clientHeight;
  const d = ip.depthStrength;
  const depthT = depthChannelT(d);
  const glowStable = spatial?.glowStability ?? 1;
  const tip = { ...pegTipScreen };
  const showBlueAimGuides = depthT > 0.45;
  if (glowStable < 0.92) {
    const amp = (1 - glowStable) * 10;
    const phase = performance.now() * 0.012;
    tip.x += Math.sin(phase) * amp;
    tip.y += Math.cos(phase * 0.9) * amp * 0.65;
  }
  const ambiguity = Math.min(2.35, spatial?.targetAmbiguity ?? 0);

  if (dragging && ambiguity > 0.05 && showBlueAimGuides) {
    drawLocalDepthAmbiguity(ctx, beadScreen, targetZone, tip, ambiguity);
  }

  if (dragging) {
    const zoneAlpha =
      ip.trajectoryOpacity *
      (proximity === 'drop'
        ? 0.22 + 0.54 * depthT
        : proximity === 'hint'
          ? 0.11 + 0.32 * depthT
          : 0.035 + 0.14 * depthT);

    if (showBlueAimGuides && zoneAlpha > 0.03 && (proximity !== 'far' || depthT > 0.5)) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(targetZone.cx, targetZone.cy, targetZone.radiusX, targetZone.radiusY, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(90, 156, 255, ${0.1 + zoneAlpha * 0.4})`;
      ctx.lineWidth = 1.2 + 0.7 * depthT;
      ctx.setLineDash([4, 7]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (proximity !== 'far') {
        ctx.fillStyle = `rgba(125, 183, 255, ${0.04 + zoneAlpha * 0.12})`;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  if (dragging && showBlueAimGuides && ip.trajectoryOpacity > 0.03 && proximity !== 'far') {
    const alpha = ip.trajectoryOpacity * (proximity === 'hint' ? 0.5 + 0.32 * d : 0.75 + 0.2 * d);
    ctx.save();
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 4 + 2 * depthT, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(90, 156, 255, ${0.22 + alpha * 0.4})`;
    ctx.fill();
    ctx.restore();
  }

  if (dragging && proximity === 'drop' && showBlueAimGuides) {
    ctx.save();
    ctx.strokeStyle = `rgba(74, 143, 232, ${0.22 + 0.66 * depthT})`;
    ctx.lineWidth = 1.4 + 1 * depthT;
    ctx.beginPath();
    ctx.ellipse(targetZone.cx, targetZone.cy, targetZone.radiusX, targetZone.radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (blockedDragHint) {
    ctx.save();
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(60, 72, 96, 0.82)';
    ctx.textAlign = 'center';
    ctx.fillText('请等圆环停稳后再拖动。', w * 0.5, h * 0.84);
    ctx.restore();
  }
}

export const DEFECT = { BLUR_PX, OFFSET_X, OFFSET_Y };
