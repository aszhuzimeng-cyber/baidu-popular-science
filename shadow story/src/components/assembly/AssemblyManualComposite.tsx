import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type MutableRefObject,
  type RefObject,
} from "react";
import { motion } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { assemblyPartOrder } from "../../data/puppetConfig";
import {
  ASSEMBLY_WORK_STAGE_DESIGN_HEIGHT,
  ASSEMBLY_WORK_STAGE_DESIGN_WIDTH,
} from "../../data/assemblyStageConfig";
import { createDefaultAssemblyPartTransforms } from "../../data/assemblyDefaultTransforms";
import { useAppStore } from "../../store/useAppStore";
import { emptyPuppetSkinBundle } from "../../types/puppetSkin";
import { clamp } from "../../utils/math";
import type { PuppetPartId } from "../../types/puppet";
import { assemblyPartLabel } from "../../data/assemblyPartLabels";

const POSITION_MIN = -1;
const POSITION_MAX = 2;
const clampPosition = (v: number) => clamp(v, POSITION_MIN, POSITION_MAX);

export type AssemblyManualCompositeProps = {
  showReference?: boolean;
  /** 为 false 时仅展示、不可操作（如完成态只读或嵌入预览） */
  interactive?: boolean;
  /** 有值时只绘制已落位的散件（拼接过程叠在底图上） */
  placedOnly?: Readonly<Partial<Record<PuppetPartId, boolean>>>;
  /** 刚落位时对该部件做一次性强调（与拼接页高亮同周期） */
  successFlashPartId?: PuppetPartId | null;
  className?: string;
  /** 受控：当前选中的部件（调节页可与侧栏联动）；不传则组件内自选 */
  selectedPartId?: PuppetPartId | null;
  onSelectedPartIdChange?: (id: PuppetPartId | null) => void;
  yOffsetRatio?: number;
  scaleRatio?: number;
  stageViewWidth?: number;
  stageViewHeight?: number;
  stageCoordinateScale?: number;
  stageCoordinateDesignWidth?: number;
  stageCoordinateDesignHeight?: number;
  stageCoordinateOffsetX?: number;
  stageCoordinateOffsetY?: number;
  stagePixelOffsetY?: number;
  partPixelOffsetY?: Partial<Record<PuppetPartId, number>>;
  matchPlacedPreview?: boolean;
  partImageOpacity?: number;
};

/**
 * 按 store 中手调参数叠加：可选完整参考图底 + 各散件位图。
 * interactive 时：拖拽平移、滚轮缩放、Shift+滚轮调旋转，数值会写回 store（与侧栏同步）。
 * ref 挂在外层即「舞台」根节点，与 t.x / t.y 百分比为同一参考框，供吸附用。
 *
 * 参考图须与部件同一套坐标：全舞台 `inset-0 + object-contain`，勿再叠一层 92% 居中框，否则底图与 (x,y) 固化值不在同一归一化空间。
 * 散件图仅用 `transform: scale/rotate` 控制大小，勿加 vw/vh 的 max-w（否则与固化 scale 冲突）。
 */
export const AssemblyManualComposite = forwardRef<HTMLDivElement, AssemblyManualCompositeProps>(
  function AssemblyManualComposite(
    {
      showReference = false,
      interactive = true,
      placedOnly = undefined,
      successFlashPartId = null,
      className = "absolute inset-0 overflow-hidden",
      selectedPartId: selectedPartIdProp,
      onSelectedPartIdChange,
      yOffsetRatio = 0,
      scaleRatio = 1,
      stageViewWidth = 0,
      stageViewHeight = 0,
      stageCoordinateScale = 0,
      stageCoordinateDesignWidth = ASSEMBLY_WORK_STAGE_DESIGN_WIDTH,
      stageCoordinateDesignHeight = ASSEMBLY_WORK_STAGE_DESIGN_HEIGHT,
      stageCoordinateOffsetX = 0,
      stageCoordinateOffsetY = 0,
      stagePixelOffsetY = 0,
      partPixelOffsetY,
      matchPlacedPreview = false,
      partImageOpacity = 1,
    },
    ref,
  ) {
  const innerStageRef = useRef<HTMLDivElement | null>(null) as MutableRefObject<HTMLDivElement | null>;
  const setStageRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      innerStageRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as { current: HTMLDivElement | null }).current = node;
      }
    },
    [ref],
  );
  const [internalSelectedId, setInternalSelectedId] = useState<PuppetPartId | null>(null);
  const selectedId =
    selectedPartIdProp !== undefined ? selectedPartIdProp : internalSelectedId;
  const setSelectedId = useCallback(
    (id: PuppetPartId | null) => {
      if (selectedPartIdProp === undefined) {
        setInternalSelectedId(id);
      }
      onSelectedPartIdChange?.(id);
    },
    [onSelectedPartIdChange, selectedPartIdProp],
  );

  const { skin, transforms, refOpacity, characterId, setPart } = useAppStore(
    useShallow((s) => ({
      characterId: s.selectedCharacterId,
      skin: s.puppetSkinByCharacterId[s.selectedCharacterId] ?? emptyPuppetSkinBundle(),
      transforms: s.assemblyPartTransformsByCharacterId[s.selectedCharacterId] ?? createDefaultAssemblyPartTransforms(),
      refOpacity: s.assemblyReferenceOpacity,
      setPart: s.setAssemblyPartTransform,
    })),
  );

  const partIds = useMemo(() => {
    return [...assemblyPartOrder].sort((a, b) => {
      // 头部先绘制：让身体等后续部件覆盖在头部之上。
      if (a === "head" && b !== "head") return -1;
      if (b === "head" && a !== "head") return 1;
      return (transforms[a]?.zIndex ?? 0) - (transforms[b]?.zIndex ?? 0);
    });
  }, [transforms]);

  const useScaledCoordinatePlane =
    stageViewWidth > 4 && stageViewHeight > 4 && stageCoordinateScale > 0;
  const coordinatePlane = useMemo(() => {
    if (!useScaledCoordinatePlane) return null;
    const width = stageCoordinateDesignWidth * stageCoordinateScale;
    const height = stageCoordinateDesignHeight * stageCoordinateScale;
    return {
      x: (stageViewWidth - width) / 2 + stageCoordinateOffsetX,
      y: (stageViewHeight - height) / 2 + stageCoordinateOffsetY,
      width,
      height,
    };
  }, [
    stageCoordinateDesignHeight,
    stageCoordinateDesignWidth,
    stageCoordinateOffsetX,
    stageCoordinateOffsetY,
    stageCoordinateScale,
    stageViewHeight,
    stageViewWidth,
    useScaledCoordinatePlane,
  ]);

  return (
    <div
      ref={setStageRootRef}
      data-assembly-stage
      className={className}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setSelectedId(null);
      }}
    >
      {showReference && skin.fullReferenceUrl ? (
        <img
          src={skin.fullReferenceUrl}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain object-center select-none"
          style={{ opacity: refOpacity }}
        />
      ) : null}
      <div className="absolute inset-0">
        {partIds.map((id) => {
          if (placedOnly && !placedOnly[id]) return null;
          const t = transforms[id];
          if (!t) return null;
          const src = skin.partImages[id];
          if (!src) return null;
          return (
            <InteractivePartLayer
              key={`${characterId}-${id}`}
              stageRef={innerStageRef}
              partId={id}
              label={assemblyPartLabel[id]}
              src={src}
              t={t}
              yOffsetRatio={yOffsetRatio}
              scaleRatio={scaleRatio}
              coordinatePlane={coordinatePlane}
              stagePixelOffsetY={stagePixelOffsetY}
              partPixelOffsetY={partPixelOffsetY}
              matchPlacedPreview={matchPlacedPreview}
              partImageOpacity={partImageOpacity}
              characterId={characterId}
              setPart={setPart}
              interactive={interactive}
              selected={selectedId === id}
              onSelect={() => setSelectedId(id)}
              successFlash={!interactive && successFlashPartId === id}
            />
          );
        })}
      </div>
    </div>
  );
  },
);

const dragStateRef = { current: null as null | { startC: { x: number; y: number }; startN: { x: number; y: number } } };

function InteractivePartLayer({
  stageRef,
  partId,
  label,
  src,
  t,
  yOffsetRatio,
  scaleRatio,
  coordinatePlane,
  stagePixelOffsetY,
  partPixelOffsetY,
  matchPlacedPreview,
  partImageOpacity,
  characterId,
  setPart,
  interactive,
  selected,
  onSelect,
  successFlash = false,
}: {
  stageRef: RefObject<HTMLDivElement | null>;
  partId: PuppetPartId;
  label: string;
  src: string;
  t: { x: number; y: number; scale: number; rotationDeg: number; zIndex: number };
  yOffsetRatio: number;
  scaleRatio: number;
  coordinatePlane: { x: number; y: number; width: number; height: number } | null;
  stagePixelOffsetY: number;
  partPixelOffsetY?: Partial<Record<PuppetPartId, number>>;
  matchPlacedPreview: boolean;
  partImageOpacity: number;
  characterId: string;
  setPart: (cid: string, id: PuppetPartId, p: Partial<typeof t>) => void;
  interactive: boolean;
  selected: boolean;
  onSelect: () => void;
  successFlash?: boolean;
}) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const tRef = useRef(t);
  tRef.current = t;

  const previewLikePlaced = !interactive || matchPlacedPreview;
  // 拼接展示层固定让头部位于身体之后；调节页可选择按最终拼接预览层级显示。
  const baseZIndex = previewLikePlaced && partId === "head" ? -1 : t.zIndex;
  const effectiveZIndex =
    interactive && selected && !matchPlacedPreview ? baseZIndex + 480 : baseZIndex;
  const pixelOffsetScale = coordinatePlane
    ? coordinatePlane.height / ASSEMBLY_WORK_STAGE_DESIGN_HEIGHT
    : 1;
  const pixelOffsetY = (stagePixelOffsetY + (partPixelOffsetY?.[partId] ?? 0)) * pixelOffsetScale;

  useEffect(() => {
    if (!interactive) return;
    const el = layerRef.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const tr = tRef.current;
      if (e.shiftKey) {
        const next = tr.rotationDeg + (e.deltaY > 0 ? 1.2 : -1.2);
        setPart(characterId, partId, { rotationDeg: next });
        return;
      }
      const factor = e.deltaY < 0 ? 1.04 : 1 / 1.04;
      setPart(characterId, partId, { scale: clamp(tr.scale * factor, 0.05, 4) });
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [characterId, interactive, partId, setPart]);

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      onSelect();
      dragStateRef.current = {
        startC: { x: e.clientX, y: e.clientY },
        startN: { x: t.x, y: t.y },
      };
    },
    [interactive, onSelect, t.x, t.y],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!interactive || !dragStateRef.current) return;
      const stage = stageRef.current;
      if (!stage) return;
      const d = dragStateRef.current;
      const r = stage.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const dx = (e.clientX - d.startC.x) / (coordinatePlane?.width ?? r.width);
      const dy = (e.clientY - d.startC.y) / (coordinatePlane?.height ?? r.height);
      setPart(characterId, partId, {
        x: clampPosition(d.startN.x + dx),
        y: clampPosition(d.startN.y + dy),
      });
    },
    [characterId, coordinatePlane, interactive, partId, setPart, stageRef],
  );

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragStateRef.current = null;
  }, []);

  return (
    <div
      ref={layerRef}
      className={[
        "absolute inline-flex h-fit w-fit touch-manipulation will-change-transform",
        interactive ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
      ].join(" ")}
      style={{
        left: coordinatePlane ? coordinatePlane.x + t.x * coordinatePlane.width : `${t.x * 100}%`,
        top: coordinatePlane
          ? coordinatePlane.y + (t.y + yOffsetRatio) * coordinatePlane.height
          : `${(t.y + yOffsetRatio) * 100}%`,
        zIndex: effectiveZIndex,
        transform: `translate(-50%, -50%) translateY(${pixelOffsetY}px)`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <motion.div
        className={[
          "inline-block rounded-sm",
          selected && interactive ? "ring-2 ring-[#b13b2c] ring-offset-1 ring-offset-[#faf3e6]" : "",
        ].join(" ")}
        initial={false}
        animate={
          successFlash
            ? {
                scale: [1, 1.04, 1],
                filter: [
                  "drop-shadow(0 1px 2px rgba(32, 22, 10, 0.12))",
                  "drop-shadow(0 5px 14px rgba(45, 30, 14, 0.28)) drop-shadow(0 2px 6px rgba(40, 26, 12, 0.2))",
                  "drop-shadow(0 2px 8px rgba(42, 28, 14, 0.22)) drop-shadow(0 1px 3px rgba(30, 20, 10, 0.14))",
                ],
              }
            : { scale: 1, filter: "none" }
        }
        transition={
          successFlash
            ? { duration: 0.6, times: [0, 0.4, 1], ease: [0.25, 0.8, 0.35, 1] }
            : { duration: 0.2 }
        }
      >
        <img
          src={src}
          alt={label}
          title={interactive ? `${label}：拖移 · 滚轮缩放 · Shift+滚轮旋转` : label}
          draggable={false}
          className="block h-auto w-auto max-h-none max-w-none select-none"
          style={{
            transform: `rotate(${t.rotationDeg}deg) scale(${t.scale * scaleRatio})`,
            transformOrigin: "center center",
            filter: previewLikePlaced ? "brightness(1.025) contrast(0.965)" : undefined,
            opacity: partImageOpacity,
            pointerEvents: "none",
          }}
        />
      </motion.div>
    </div>
  );
}
