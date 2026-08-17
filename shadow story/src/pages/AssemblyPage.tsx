import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { stageJointPixelFromTunedCenter } from "../data/assemblyLayout";
import { createDefaultAssemblyPartTransforms } from "../data/assemblyDefaultTransforms";
import { assemblyPartOrder, characterCardStaticThumb, characterCards } from "../data/puppetConfig";
import {
  SCATTERED_TRAY_FIXED_SLOTS as RECORDED_SCATTERED_TRAY_FIXED_SLOTS,
  SCATTERED_TRAY_GROUP_SHIFT_DOWN_PX as RECORDED_SCATTERED_TRAY_GROUP_SHIFT_DOWN_PX,
  SCATTERED_TRAY_LAYOUT_BY_CHARACTER as RECORDED_SCATTERED_TRAY_LAYOUT_BY_CHARACTER,
  SCATTERED_TRAY_LAYOUT_VERSION,
  SCATTERED_TRAY_RIGHT_SHIFT_PX,
  SCATTERED_TRAY_SAFE_INSET as RECORDED_SCATTERED_TRAY_SAFE_INSET,
  SCATTERED_TRAY_SHIFT_DOWN_RATIO as RECORDED_SCATTERED_TRAY_SHIFT_DOWN_RATIO,
  SCATTERED_TRAY_TILT_DEG as RECORDED_SCATTERED_TRAY_TILT_DEG,
  SCATTERED_TRAY_Z_INDEX as RECORDED_SCATTERED_TRAY_Z_INDEX,
} from "../data/scatteredTrayLayout";
import { useSnapAssembly } from "../hooks/useSnapAssembly";
import { useAppStore } from "../store/useAppStore";
import type { PuppetPartId } from "../types/puppet";
import { clamp } from "../utils/math";
import { AssemblyCanvas, type AssemblySlotLayout } from "../components/assembly/AssemblyCanvas";
import { PartsTray, type AssemblyPieceUI } from "../components/assembly/PartsTray";
import { BottomBar } from "../components/layout/BottomBar";
import { TopBar } from "../components/layout/TopBar";
import { PrimaryButton } from "../components/common/PrimaryButton";
import { Panel } from "../components/common/Panel";
import { StepHeader } from "../components/common/StepHeader";
import { emptyPuppetSkinBundle } from "../types/puppetSkin";
import { SIDEBAR_TUNE_PRESET } from "../data/sidebarUiTuning";
import {
  ASSEMBLY_STAGE_CONTENT_SCALE,
  ASSEMBLY_STAGE_DESIGN_HEIGHT,
  ASSEMBLY_STAGE_DESIGN_WIDTH,
  ASSEMBLY_WORK_STAGE_DESIGN_HEIGHT,
  ASSEMBLY_WORK_STAGE_DESIGN_WIDTH,
  getAssemblyStageOffsetYRatio,
  getAssemblyWorkStageViewportScale,
  getAssemblyWorkStageVisualScale,
} from "../data/assemblyStageConfig";

const partMeta: {
  id: PuppetPartId;
  label: string;
  width: number;
  height: number;
  homeX: number;
  homeY: number;
}[] = [
  { id: "head", label: "头部", width: 118, height: 128, homeX: 170, homeY: 18 },
  { id: "torso", label: "上半身", width: 138, height: 188, homeX: 58, homeY: 108 },
  { id: "rightUpperArm", label: "右大臂", width: 106, height: 148, homeX: 198, homeY: 130 },
  { id: "leftUpperArm", label: "左大臂", width: 106, height: 148, homeX: 12, homeY: 230 },
  { id: "pelvis", label: "胯", width: 120, height: 96, homeX: 148, homeY: 282 },
  { id: "rightForearm", label: "右小臂", width: 84, height: 148, homeX: 194, homeY: 244 },
  { id: "leftForearm", label: "左小臂", width: 84, height: 148, homeX: 24, homeY: 54 },
  { id: "leftLeg", label: "左腿", width: 82, height: 172, homeX: 78, homeY: 70 },
  { id: "rightLeg", label: "右腿", width: 82, height: 172, homeX: 228, homeY: 84 },
];

const SLOT_META: { id: PuppetPartId; label: string; layer: number }[] = [
  { id: "head", label: "头部", layer: 9 },
  { id: "leftUpperArm", label: "左大臂", layer: 5 },
  { id: "leftForearm", label: "左小臂", layer: 4 },
  { id: "rightUpperArm", label: "右大臂", layer: 11 },
  { id: "rightForearm", label: "右小臂", layer: 12 },
  { id: "torso", label: "上半身", layer: 7 },
  { id: "pelvis", label: "胯", layer: 7 },
  { id: "leftLeg", label: "左腿", layer: 6 },
  { id: "rightLeg", label: "右腿", layer: 8 },
];

const ARM_FRAME_ROTATE: ReadonlySet<PuppetPartId> = new Set([
  "leftUpperArm",
  "rightUpperArm",
  "leftForearm",
  "rightForearm",
]);

const GUIDE_FRAME_CENTER_OFFSETS: Record<string, Partial<Record<PuppetPartId, { x: number; y: number }>>> = {};
const GUIDE_FRAME_PIXEL_OFFSETS: Record<string, Partial<Record<PuppetPartId, { x: number; y: number }>>> = {};
const GUIDE_FRAME_CENTER_X_OVERRIDES: Record<string, Partial<Record<PuppetPartId, number>>> = {};
const GUIDE_FRAME_USE_TUNED_CENTER: Record<string, ReadonlySet<PuppetPartId>> = {
  "role-3": new Set(assemblyPartOrder),
};
const PLACED_STAGE_PIXEL_OFFSET_Y: Record<string, number> = {
  "role-1": -3,
  "role-4": -3,
};
const ASSEMBLY_STAGE_PIXEL_OFFSET_X: Record<string, number> = {
  "role-3": 30,
  "role-4": 8,
};
const PLACED_PART_PIXEL_OFFSET_Y: Record<string, Partial<Record<PuppetPartId, number>>> = {
  "role-1": { head: 5 },
  "role-2": { head: 2 },
  "role-4": { head: 12 },
};

const SCATTERED_TRAY_DESIGN_WIDTH = 380;
const SCATTERED_TRAY_DESIGN_HEIGHT = 520;
const SCATTERED_TRAY_MIN_SCALE = 1;
const MOBILE_ASSEMBLY_STAGE_SCALE = 0.86;
const MOBILE_SCATTER_LAYOUT_VERSION = "compact-scatter-v6";
const MOBILE_SCATTER_PILE_CENTER = { x: 190, y: 152 };
const MOBILE_SCATTER_COMPACT_SLOTS: Record<PuppetPartId, { x: number; y: number }> = {
  head: { x: 156, y: 96 },
  torso: { x: 214, y: 132 },
  pelvis: { x: 150, y: 174 },
  rightUpperArm: { x: 232, y: 78 },
  rightForearm: { x: 246, y: 168 },
  leftUpperArm: { x: 126, y: 128 },
  leftForearm: { x: 184, y: 214 },
  leftLeg: { x: 116, y: 226 },
  rightLeg: { x: 232, y: 232 },
};

type PartImageMetrics = {
  src: string;
  w: number;
  h: number;
  visible?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
};

const getScatteredTrayPartSize = (
  pm: (typeof partMeta)[number],
  transforms: ReturnType<typeof createDefaultAssemblyPartTransforms>,
  natural: Partial<Record<PuppetPartId, PartImageMetrics>>,
  scaleRatio = ASSEMBLY_STAGE_CONTENT_SCALE,
) => {
  const metrics = natural[pm.id];
  const sourceW = metrics?.w ?? pm.width;
  const sourceH = metrics?.h ?? pm.height;
  const scale = (transforms[pm.id]?.scale ?? 1) * scaleRatio;
  return {
    width: Math.max(8, Math.round(sourceW * scale)),
    height: Math.max(8, Math.round(sourceH * scale)),
    visualCenterX: sourceW * 0.5 * scale,
    visualCenterY: sourceH * 0.5 * scale,
  };
};

const measureVisibleImageBounds = (
  img: HTMLImageElement,
): PartImageMetrics["visible"] | undefined => {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w <= 0 || h <= 0) return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return undefined;
  try {
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha <= 10) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < minX || maxY < minY) return undefined;
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  } catch {
    return undefined;
  }
};

const buildSlotsFromTuned = (
  width: number,
  height: number,
  transforms: ReturnType<typeof createDefaultAssemblyPartTransforms>,
  natural: Partial<Record<PuppetPartId, PartImageMetrics>>,
  characterId: string,
  scaleRatio = 1,
  pixelOffsetScale = 1,
): AssemblySlotLayout[] => {
  const padding = 8;
  return SLOT_META.map((row) => {
    const pm = partMeta.find((p) => p.id === row.id);
    if (!pm) {
      return {
        id: row.id,
        label: row.label,
        x: width / 2,
        y: height / 2,
        width: 80,
        height: 80,
        zIndex: row.layer + 4,
        anchorX: width / 2,
        anchorY: height / 2,
      };
    }
    const t = transforms[row.id];
    if (!t) {
      return {
        id: row.id,
        label: row.label,
        x: width / 2,
        y: height / 2,
        width: pm.width + padding * 2,
        height: pm.height + padding * 2,
        zIndex: row.layer + 4,
        anchorX: width / 2,
        anchorY: height / 2,
      };
    }
    const metrics = natural[row.id];
    const uw = metrics?.w ?? pm.width;
    const uh = metrics?.h ?? pm.height;
    const visible = metrics?.visible ?? { x: 0, y: 0, w: uw, h: uh };
    const effectiveScale = t.scale * scaleRatio;
    const joint = stageJointPixelFromTunedCenter(row.id, uw, uh, width, height, {
      ...t,
      scale: effectiveScale,
    });
    const visibleDx = (visible.x + visible.w * 0.5 - uw * 0.5) * effectiveScale;
    const visibleDy = (visible.y + visible.h * 0.5 - uh * 0.5) * effectiveScale;
    const frameOffset = GUIDE_FRAME_CENTER_OFFSETS[characterId]?.[row.id] ?? { x: 0, y: 0 };
    const framePixelOffset = GUIDE_FRAME_PIXEL_OFFSETS[characterId]?.[row.id] ?? { x: 0, y: 0 };
    const frameCenterX = GUIDE_FRAME_CENTER_X_OVERRIDES[characterId]?.[row.id] ?? t.x;
    const useTunedFrameCenter = GUIDE_FRAME_USE_TUNED_CENTER[characterId]?.has(row.id) ?? false;
    const rad = (t.rotationDeg * Math.PI) / 180;
    const visualCx = useTunedFrameCenter
      ? (frameCenterX + frameOffset.x) * width +
        framePixelOffset.x * pixelOffsetScale
      : (frameCenterX + frameOffset.x) * width +
        visibleDx * Math.cos(rad) -
        visibleDy * Math.sin(rad) +
        framePixelOffset.x * pixelOffsetScale;
    const visualCy = useTunedFrameCenter
      ? (t.y + frameOffset.y) * height + framePixelOffset.y * pixelOffsetScale
      : (t.y + frameOffset.y) * height +
        visibleDx * Math.sin(rad) +
        visibleDy * Math.cos(rad) +
        framePixelOffset.y * pixelOffsetScale;
    const boxW = Math.max(8, Math.round(visible.w * effectiveScale));
    const boxH = Math.max(8, Math.round(visible.h * effectiveScale));
    const frameRotationDeg = ARM_FRAME_ROTATE.has(row.id) ? t.rotationDeg : 0;
    return {
      id: row.id,
      label: row.label,
      x: visualCx,
      y: visualCy,
      width: boxW,
      height: boxH,
      anchorX: joint.x,
      anchorY: joint.y,
      frameRotationDeg: frameRotationDeg || undefined,
      zIndex: t.zIndex + 4,
    };
  });
};

/**
 * 拼接：右侧散落件尺寸 = 原图 `naturalWidth/Height` × 固化 `scale`（与幕上 `img`+`scale()` 一致）；无原图时回退 `partMeta`。
 * role-1 默认位姿见 `assemblyTunedPresets`。
 */
export function AssemblyPage() {
  const [highlightPartId, setHighlightPartId] = useState<PuppetPartId | null>(null);
  const [draggingId, setDraggingId] = useState<PuppetPartId | null>(null);
  const puppetSidebarTune = SIDEBAR_TUNE_PRESET.puppet;
  const [pieces, setPieces] = useState<AssemblyPieceUI[]>(
    partMeta.map((item) => ({
      ...item,
      x: item.homeX,
      y: item.homeY,
      placed: false,
      width: Math.round(item.width * 0.51 * ASSEMBLY_STAGE_CONTENT_SCALE),
      height: Math.round(item.height * 0.51 * ASSEMBLY_STAGE_CONTENT_SCALE),
    })),
  );

  const {
    selectedCharacterId,
    selectCharacter,
    setStep,
    placePart,
    resetAssembly,
    assembledParts,
    isAssemblyComplete,
    assemblyPartTransforms,
    activePuppetSkin,
    puppetSkinByCharacterId,
  } = useAppStore(
    useShallow((s) => ({
      selectedCharacterId: s.selectedCharacterId,
      selectCharacter: s.selectCharacter,
      setStep: s.setStep,
      placePart: s.placePart,
      resetAssembly: s.resetAssembly,
      assembledParts: s.assembledParts,
      isAssemblyComplete: s.isAssemblyComplete,
      assemblyPartTransforms:
        s.assemblyPartTransformsByCharacterId[s.selectedCharacterId] ?? createDefaultAssemblyPartTransforms(),
      activePuppetSkin: s.puppetSkinByCharacterId[s.selectedCharacterId] ?? emptyPuppetSkinBundle(),
      puppetSkinByCharacterId: s.puppetSkinByCharacterId,
    })),
  );

  useEffect(() => {
    resetAssembly();
  }, [resetAssembly, selectedCharacterId]);


  /** 与 `AssemblyManualComposite` 根节点同框，与固化 (x,y) 百分比一致；勿用外衬层。 */
  const stageRef = useRef<HTMLDivElement | null>(null);
  const trayContentRef = useRef<HTMLDivElement | null>(null);
  const scatterLayoutKeyRef = useRef("");
  const [stageSize, setStageSize] = useState({ width: 0, height: 0, appWidth: 0, appHeight: 0 });
  const [traySize, setTraySize] = useState({ width: 320, height: 520 });
  const [trayMeasured, setTrayMeasured] = useState(false);
  /** 与幕上散件同基准：原图像素尺寸，用于 tray 宽/高 = natural × 固化 scale（避免 partMeta 与 PNG 不一致）。 */
  const [partNaturalPx, setPartNaturalPx] = useState<Partial<Record<PuppetPartId, PartImageMetrics>>>(
    {},
  );
  const sw = stageSize.width > 4 ? stageSize.width : ASSEMBLY_STAGE_DESIGN_WIDTH;
  const sh = stageSize.height > 4 ? stageSize.height : ASSEMBLY_STAGE_DESIGN_HEIGHT;
  const appW = stageSize.appWidth > 4 ? stageSize.appWidth : ASSEMBLY_STAGE_DESIGN_WIDTH;
  const appH = stageSize.appHeight > 4 ? stageSize.appHeight : ASSEMBLY_STAGE_DESIGN_HEIGHT;
  const isMobileLandscapeStage = appW > appH && appH <= 620;
  const trayMeasureSize = {
    width: Math.max(1, traySize.width),
    height: Math.max(1, traySize.height),
  };
  const isCompactScatteredTray =
    isMobileLandscapeStage || trayMeasureSize.height < SCATTERED_TRAY_DESIGN_HEIGHT * 0.86;
  const scatteredTrayFitScale = SCATTERED_TRAY_MIN_SCALE;
  const scatteredTrayGroupOffset = {
    x: Math.max(0, (trayMeasureSize.width - SCATTERED_TRAY_DESIGN_WIDTH * scatteredTrayFitScale) / 2),
    y: Math.max(0, (trayMeasureSize.height - SCATTERED_TRAY_DESIGN_HEIGHT * scatteredTrayFitScale) / 2),
  };
  const fitPieceIntoTray = (x: number, y: number) => ({
    x: clamp(
      x,
      RECORDED_SCATTERED_TRAY_SAFE_INSET.left,
      Math.max(RECORDED_SCATTERED_TRAY_SAFE_INSET.left, SCATTERED_TRAY_DESIGN_WIDTH - RECORDED_SCATTERED_TRAY_SAFE_INSET.right),
    ),
    y: clamp(
      y,
      RECORDED_SCATTERED_TRAY_SAFE_INSET.top,
      Math.max(RECORDED_SCATTERED_TRAY_SAFE_INSET.top, SCATTERED_TRAY_DESIGN_HEIGHT - RECORDED_SCATTERED_TRAY_SAFE_INSET.bottom),
    ),
  });

  const getScatteredTrayHome = (
    id: PuppetPartId,
    width: number,
    height: number,
    visualCenterX = width / 2,
    visualCenterY = height / 2,
  ) => {
    const slot = RECORDED_SCATTERED_TRAY_LAYOUT_BY_CHARACTER[selectedCharacterId]?.[id] ?? RECORDED_SCATTERED_TRAY_FIXED_SLOTS[id];
    if (isCompactScatteredTray) {
      const compactSlot = MOBILE_SCATTER_COMPACT_SLOTS[id];
      const pileSpread = clamp(assemblyStageContentScale / 0.86, 0.3, 0.86);
      return fitPieceIntoTray(
        MOBILE_SCATTER_PILE_CENTER.x + (compactSlot.x - MOBILE_SCATTER_PILE_CENTER.x) * pileSpread - visualCenterX,
        MOBILE_SCATTER_PILE_CENTER.y + (compactSlot.y - MOBILE_SCATTER_PILE_CENTER.y) * pileSpread - visualCenterY,
      );
    }
    return fitPieceIntoTray(
      SCATTERED_TRAY_DESIGN_WIDTH * slot.x - visualCenterX + SCATTERED_TRAY_RIGHT_SHIFT_PX,
      SCATTERED_TRAY_DESIGN_HEIGHT * (slot.y + RECORDED_SCATTERED_TRAY_SHIFT_DOWN_RATIO) - visualCenterY,
    );
  };

  const assemblyMobileStageScale = isMobileLandscapeStage ? MOBILE_ASSEMBLY_STAGE_SCALE : 1;
  const scatteredTrayShiftY = isCompactScatteredTray ? 0 : RECORDED_SCATTERED_TRAY_GROUP_SHIFT_DOWN_PX;
  const assemblyStageOffsetYRatio = getAssemblyStageOffsetYRatio(selectedCharacterId);
  const assemblyStageViewportScale =
    getAssemblyWorkStageViewportScale(appW, appH, sw, sh) * assemblyMobileStageScale;
  const assemblyStageContentScale =
    getAssemblyWorkStageVisualScale(selectedCharacterId, appW, appH, sw, sh) * assemblyMobileStageScale;
  const assemblyStagePlaneWidth = ASSEMBLY_WORK_STAGE_DESIGN_WIDTH * assemblyStageViewportScale;
  const assemblyStagePlaneHeight = ASSEMBLY_WORK_STAGE_DESIGN_HEIGHT * assemblyStageViewportScale;
  const assemblyStagePlaneX = (sw - assemblyStagePlaneWidth) / 2;
  const assemblyStagePlaneY = (sh - assemblyStagePlaneHeight) / 2;
  const assemblyStageOffsetX = ASSEMBLY_STAGE_PIXEL_OFFSET_X[selectedCharacterId] ?? 0;
  const assemblyStageOffsetY = assemblyStagePlaneHeight * assemblyStageOffsetYRatio;
  const assemblyPartTransformsForLayout = assemblyPartTransforms;

  const partImageUrlKey = useMemo(
    () => partMeta.map((p) => activePuppetSkin.partImages[p.id] ?? "").join("\n"),
    [activePuppetSkin, selectedCharacterId],
  );
  useEffect(() => {
    scatterLayoutKeyRef.current = "";
  }, [partImageUrlKey, selectedCharacterId]);

  const scatteredPartSizeKey = useMemo(
    () =>
      partMeta
        .map((p) => {
          const url = activePuppetSkin.partImages[p.id];
          const metrics = partNaturalPx[p.id];
          const sizeKey = metrics && metrics.src === url ? `${metrics.w}x${metrics.h}` : "pending";
          return `${p.id}:${url ?? ""}:${sizeKey}`;
        })
        .join("|"),
    [activePuppetSkin, partNaturalPx],
  );
  const assemblyTransformSizeKey = useMemo(
    () =>
      partMeta
        .map((p) => {
          const tr = assemblyPartTransformsForLayout[p.id];
          return `${p.id}:${tr?.scale ?? 1}:${tr?.rotationDeg ?? 0}`;
        })
        .join("|"),
    [assemblyPartTransformsForLayout],
  );

  const partNaturalReady = useMemo(
    () =>
      partMeta.every((pm) => {
        const url = activePuppetSkin.partImages[pm.id];
        if (!url) return true;
        return partNaturalPx[pm.id]?.src === url;
      }),
    [activePuppetSkin, partNaturalPx],
  );
  const scatteredTrayReady = partNaturalReady;
  const scatteredLayoutKey = useMemo(
    () =>
      [
        SCATTERED_TRAY_LAYOUT_VERSION,
        selectedCharacterId,
        partImageUrlKey,
        scatteredPartSizeKey,
        assemblyTransformSizeKey,
        Math.round(assemblyStageContentScale * 10000),
        Math.round(traySize.width),
        Math.round(traySize.height),
        isCompactScatteredTray ? MOBILE_SCATTER_LAYOUT_VERSION : "desktop-scatter",
      ].join("|"),
    [
      assemblyStageContentScale,
      assemblyTransformSizeKey,
      isCompactScatteredTray,
      partImageUrlKey,
      scatteredPartSizeKey,
      selectedCharacterId,
      traySize.height,
      traySize.width,
    ],
  );
  const scatteredTrayVisible = scatteredTrayReady && scatterLayoutKeyRef.current === scatteredLayoutKey;

  useEffect(() => {
    setPartNaturalPx({});
    let cancelled = false;
    (async () => {
      const out: Partial<Record<PuppetPartId, PartImageMetrics>> = {};
      await Promise.all(
        partMeta.map(
          (pm) =>
            new Promise<void>((resolve) => {
              const url = activePuppetSkin.partImages[pm.id];
              if (!url) {
                resolve();
                return;
              }
              const img = new Image();
              img.onload = () => {
                if (!cancelled) {
                  const visible = measureVisibleImageBounds(img);
                  out[pm.id] = {
                    src: url,
                    w: img.naturalWidth,
                    h: img.naturalHeight,
                    visible,
                  };
                }
                resolve();
              };
              img.onerror = () => {
                if (!cancelled) {
                  out[pm.id] = {
                    src: url,
                    w: pm.width,
                    h: pm.height,
                  };
                }
                resolve();
              };
              img.src = url;
            }),
        ),
      );
      if (!cancelled) {
        setPartNaturalPx(out);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partImageUrlKey, activePuppetSkin]);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const appFrame = el.closest("[data-app-shell-frame]") as HTMLElement | null;
      setStageSize({
        width: el.clientWidth,
        height: el.clientHeight,
        appWidth: appFrame?.clientWidth ?? window.innerWidth,
        appHeight: appFrame?.clientHeight ?? window.innerHeight,
      });
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      const onWin = () => measure();
      window.addEventListener("resize", onWin);
      return () => window.removeEventListener("resize", onWin);
    }
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [selectedCharacterId]);

  useEffect(() => {
    const node = trayContentRef.current;
    if (!node) return;
    if (typeof ResizeObserver === "undefined") {
      const onResize = () => {
        const rect = node.getBoundingClientRect();
        setTraySize({ width: rect.width, height: rect.height });
        setTrayMeasured(true);
      };
      onResize();
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
    const observer = new ResizeObserver(([entry]) => {
      const rect = entry.target.getBoundingClientRect();
      const width = entry.contentRect.width || rect.width;
      const height = entry.contentRect.height || rect.height;
      if (width <= 0 || height <= 0) return;
      setTraySize({ width, height });
      setTrayMeasured(true);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!scatteredTrayReady) return;
    if (scatterLayoutKeyRef.current === scatteredLayoutKey) return;
    setPieces(
      partMeta.map((pm) => {
        const {
          width,
          height,
          visualCenterX,
          visualCenterY,
        } = getScatteredTrayPartSize(
          pm,
          assemblyPartTransformsForLayout,
          partNaturalPx,
          assemblyStageContentScale,
        );
        const home = getScatteredTrayHome(pm.id, width, height, visualCenterX, visualCenterY);
        return {
          ...pm,
          x: home.x,
          y: home.y,
          homeX: home.x,
          homeY: home.y,
          placed: false,
          width,
          height,
          visualCenterX,
          visualCenterY,
        };
      }),
    );
    scatterLayoutKeyRef.current = scatteredLayoutKey;
  }, [
    assemblyPartTransformsForLayout,
    assemblyStageContentScale,
    getScatteredTrayHome,
    partNaturalPx,
    scatteredLayoutKey,
    scatteredTrayReady,
  ]);

  useEffect(() => {
    setPieces((current) =>
      current.map((piece) => {
        if (assembledParts[piece.id]) {
          return piece.placed ? piece : { ...piece, placed: true };
        }
        if (piece.placed) {
          return { ...piece, placed: false };
        }
        return piece;
      }),
    );
  }, [assembledParts]);

  const partLayouts = useMemo(() => {
    if (sw < 4 || sh < 4) return [] as AssemblySlotLayout[];
    return buildSlotsFromTuned(
      assemblyStagePlaneWidth,
      assemblyStagePlaneHeight,
      assemblyPartTransformsForLayout,
      partNaturalPx,
      selectedCharacterId,
      assemblyStageContentScale,
      assemblyStageViewportScale,
    ).map((slot) => ({
      ...slot,
      x: slot.x + assemblyStagePlaneX + assemblyStageOffsetX,
      y: slot.y + assemblyStagePlaneY + assemblyStageOffsetY,
      anchorX: slot.anchorX + assemblyStagePlaneX + assemblyStageOffsetX,
      anchorY: slot.anchorY + assemblyStagePlaneY + assemblyStageOffsetY,
    }));
  }, [
    assemblyPartTransformsForLayout,
    assemblyStageContentScale,
    assemblyStageOffsetX,
    assemblyStageOffsetY,
    assemblyStagePlaneHeight,
    assemblyStagePlaneWidth,
    assemblyStagePlaneX,
    assemblyStagePlaneY,
    assemblyStageViewportScale,
    partNaturalPx,
    selectedCharacterId,
    sh,
    sw,
  ]);

  const anchorTargetMap = useMemo(() => {
    if (sw < 4 || sh < 4) return {} as Record<PuppetPartId, { x: number; y: number }>;
    return Object.fromEntries(
      partLayouts.map((slot) => [slot.id, { x: slot.x, y: slot.y }]),
    ) as Record<PuppetPartId, { x: number; y: number }>;
  }, [partLayouts, sh, sw]);

  const snapThreshold = useMemo(
    () => (sw < 4 || sh < 4 ? 64 : Math.max(64, Math.min(sw, sh) * 0.09)),
    [sh, sw],
  );
  const { getSnapTarget } = useSnapAssembly(anchorTargetMap, snapThreshold);

  const handlePointerDown = (id: PuppetPartId, event: ReactPointerEvent<HTMLDivElement>) => {
    if (assembledParts[id]) return;
    const piece = pieces.find((item) => item.id === id);
    if (!piece) return;
    setDraggingId(id);
    event.currentTarget.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    const initial = { x: piece.x, y: piece.y };
    const trayScale = scatteredTrayFitScale || 1;
    const trayOffset = scatteredTrayGroupOffset;

    const move = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / trayScale;
      const dy = (moveEvent.clientY - startY) / trayScale;
      setPieces((current) =>
        current.map((item) =>
          item.id === id ? { ...item, x: initial.x + dx, y: initial.y + dy } : item,
        ),
      );
    };

    const up = (upEvent: PointerEvent) => {
      const trayRect = trayContentRef.current?.getBoundingClientRect();
      const stageRect = stageRef.current?.getBoundingClientRect();
      let didSnap = false;
      const released = {
        x: initial.x + (upEvent.clientX - startX) / trayScale,
        y: initial.y + (upEvent.clientY - startY) / trayScale,
      };

      if (trayRect && stageRect && stageRect.width >= 1 && stageRect.height >= 1) {
        const snapCenter = {
          x: piece.visualCenterX ?? piece.width / 2,
          y: piece.visualCenterY ?? piece.height / 2,
        };
        const pieceAnchor = {
          x: trayRect.left + trayOffset.x + (released.x + snapCenter.x) * trayScale,
          y: trayRect.top + trayOffset.y + (released.y + snapCenter.y) * trayScale,
        };
        const localPoint = {
          x: pieceAnchor.x - stageRect.left,
          y: pieceAnchor.y - stageRect.top,
        };
        const snap = getSnapTarget(id, localPoint);

        if (snap) {
          didSnap = true;
          const targetX = (stageRect.left + snap.x - trayRect.left - trayOffset.x) / trayScale - snapCenter.x;
          const targetY = (stageRect.top + snap.y - trayRect.top - trayOffset.y) / trayScale - snapCenter.y;
          setPieces((current) =>
            current.map((item) =>
              item.id === id ? { ...item, x: targetX, y: targetY, placed: true } : item,
            ),
          );
          placePart(id);
          setHighlightPartId(id);
          if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
            navigator.vibrate(12);
          }
          window.setTimeout(() => setHighlightPartId(null), 780);
        }
      }

      if (!didSnap) {
        setPieces((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  x: released.x,
                  y: released.y,
                  placed: false,
                }
              : item,
          ),
        );
      }

      setDraggingId(null);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  return (
    <div className="assembly-page relative h-full w-full">
      <TopBar
        title="皮影拼接"
        titleImage="/assets/images/ui/assembly-title.png"
        titleImageClass="-mt-4 w-[min(25.5vw,26.8rem)]"
        right={
          <div className="flex items-center gap-2">
            <StepHeader current={1} total={3} label="皮影拼接" />
          </div>
        }
      />
      <div className="assembly-page-grid grid h-full grid-cols-[20%_minmax(0,1fr)] gap-[1.7%] px-[5.1%] pb-[6.6%] pt-[3.8%]">

      <Panel title="choose-puppet" className="assembly-page-character-panel h-full translate-x-[26%] -translate-y-[1%]">
        <div
          className="flex h-full min-h-0 flex-col items-center"
          style={{
            gap: `${puppetSidebarTune.itemGapPct}%`,
            paddingTop: `${puppetSidebarTune.contentPaddingTopPct}%`,
          }}
        >
          {characterCards.map((card) => {
            const active = card.id === selectedCharacterId;
            const bundle = puppetSkinByCharacterId[card.id] ?? emptyPuppetSkinBundle();
            const thumbSrc =
              bundle.fullReferenceUrl ?? characterCardStaticThumb[card.id] ?? null;
            const thumbScale =
              card.id === "role-2"
                ? puppetSidebarTune.imageScaleRole2 ?? puppetSidebarTune.imageScaleDefault
                : puppetSidebarTune.imageScaleDefault;
            return (
              <button
                key={card.id}
                onClick={() => selectCharacter(card.id)}
                className={[
                  "group flex min-h-0 shrink-0 items-center justify-center overflow-hidden px-0.5 text-left transition",
                  active
                    ? "ui-thumb-active"
                    : "ui-thumb-hover hover:-translate-y-0.5",
                ].join(" ")}
                style={{
                  height: `${puppetSidebarTune.itemHeightPct}%`,
                  width: `${puppetSidebarTune.itemWidthPct}%`,
                  borderRadius: puppetSidebarTune.itemRadiusPx,
                  transform: `translate(${puppetSidebarTune.itemTranslateXPct}%, ${puppetSidebarTune.itemTranslateYPct}%)`,
                }}
              >
                <div
                  className={[
                    "relative flex-shrink-0 overflow-hidden",
                    thumbSrc ? "bg-transparent" : "",
                  ].join(" ")}
                  style={{
                    height: `${puppetSidebarTune.imageBoxHeightPct}%`,
                    width: `${puppetSidebarTune.imageBoxWidthPct}%`,
                    ...(!thumbSrc
                      ? { background: `linear-gradient(180deg, ${card.accent}, var(--color-bg-warm-light))` }
                      : {}),
                  }}
                >
                  {thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt=""
                      draggable={false}
                      className="pointer-events-none h-full w-full origin-top object-contain object-center"
                      style={{ transform: `scale(${thumbScale})` }}
                    />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

        <div className="relative h-full min-h-0 min-w-0">
          <AssemblyCanvas
            stageRef={stageRef}
            slots={partLayouts}
            placedParts={assembledParts}
            highlightPartId={highlightPartId}
            stageViewWidth={sw}
            stageViewHeight={sh}
            partNatural={partNaturalPx}
            assemblyComplete={isAssemblyComplete}
            stageContentOffsetYRatio={assemblyStageOffsetYRatio}
            stageContentScale={assemblyStageContentScale}
            stageCoordinateScale={assemblyStageViewportScale}
            stageCoordinateDesignWidth={ASSEMBLY_WORK_STAGE_DESIGN_WIDTH}
            stageCoordinateDesignHeight={ASSEMBLY_WORK_STAGE_DESIGN_HEIGHT}
            stageCoordinateOffsetX={assemblyStageOffsetX}
            placedStagePixelOffsetY={PLACED_STAGE_PIXEL_OFFSET_Y[selectedCharacterId] ?? 0}
            placedPartPixelOffsetY={PLACED_PART_PIXEL_OFFSET_Y[selectedCharacterId]}
            showAssemblyRods={false}
            rodImageUrls={activePuppetSkin.rodImages}
            scatteredTray={
              !isAssemblyComplete ? (
                <div
                  className="h-full w-full"
                  style={{
                    opacity: scatteredTrayVisible ? 1 : 0,
                    pointerEvents: scatteredTrayVisible ? "auto" : "none",
                    transform: `translateY(${scatteredTrayShiftY * scatteredTrayFitScale}px)`,
                    transition: "opacity 120ms ease-out",
                  }}
                >
                  <PartsTray
                    pieces={pieces}
                    draggingId={draggingId}
                    partImages={activePuppetSkin.partImages}
                    pieceRotationDeg={(id) => {
                      const referenceRotation = RECORDED_SCATTERED_TRAY_TILT_DEG[id];
                      if (referenceRotation !== undefined) return referenceRotation;
                      return assemblyPartTransformsForLayout[id]?.rotationDeg ?? 0;
                    }}
                    pieceZIndex={(id) => RECORDED_SCATTERED_TRAY_Z_INDEX[id]}
                    trayContentRef={trayContentRef}
                    layoutWidth={SCATTERED_TRAY_DESIGN_WIDTH}
                    layoutHeight={SCATTERED_TRAY_DESIGN_HEIGHT}
                    layoutScale={scatteredTrayFitScale}
                    layoutOffsetX={scatteredTrayGroupOffset.x}
                    layoutOffsetY={scatteredTrayGroupOffset.y}
                    onPointerDown={handlePointerDown}
                    onPointerMove={() => undefined}
                    onPointerUp={() => undefined}
                  />
                </div>
              ) : undefined
            }
          />
        </div>
      </div>

      {isAssemblyComplete ? (
        <BottomBar>
          <div className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-3">
            <PrimaryButton onClick={() => setStep("scene")} className="assembly-next-button -translate-y-[90px]">
              场景布置
            </PrimaryButton>
          </div>
        </BottomBar>
      ) : null}
    </div>
  );
}
