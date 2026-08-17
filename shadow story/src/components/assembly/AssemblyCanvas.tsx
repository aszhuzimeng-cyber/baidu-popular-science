import type { LegacyRef, ReactNode } from "react";
import { StageFrame } from "../layout/StageFrame";
import { AssemblyPlacedPuppetCanvas } from "./AssemblyPlacedPuppetCanvas";
import { AssemblyPlacementGuideSkeleton } from "./AssemblyPlacementGuideSkeleton";
import { AssemblyThreeRods } from "./AssemblyThreeRods";
import type { PuppetPartId } from "../../types/puppet";
import type { PuppetRodSkinId } from "../../types/puppetSkin";

/** 由 α 测得的虚线框；与 `anchorX/anchorY` 合并后为完整槽位 */
export type AssemblySlotFrame = {
  id: PuppetPartId;
  label: string;
  /** 部件外接框中心（与矢量人偶单件 α 框一致，仅作大致区域；孔位以 anchor* 为准） */
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
};

export type AssemblySlotLayout = AssemblySlotFrame & {
  /** 与 drawPuppet2d 关节链一致的孔位（幕布坐标） */
  anchorX: number;
  anchorY: number;
  /** 手臂类：虚线框与部件同角 */
  frameRotationDeg?: number;
};

interface AssemblyCanvasProps {
  slots: AssemblySlotLayout[];
  placedParts: Record<PuppetPartId, boolean>;
  highlightPartId: PuppetPartId | null;
  /** 为 true 时用与幕上相同的 `drawPuppet2d` 画布替换槽位上的占位部件 */
  assemblyComplete?: boolean;
  /** 内层舞台根（`AssemblyManualComposite`），与槽位/吸附/固化 (x,y) 同一参考框；勿用外裹层测宽高。 */
  stageRef?: LegacyRef<HTMLDivElement>;
  /** 全部落位后展示与幕上同坐标系的三杆 */
  showAssemblyRods?: boolean;
  rodImageUrls?: Partial<Record<PuppetRodSkinId, string>>;
  /** 拼接中：与舞台同一块幕布右侧的散落区（无独立底框） */
  scatteredTray?: ReactNode;
  /** 完成态右侧预留区内容；不改变左侧拼接预览舞台尺寸。 */
  completeSidePanel?: ReactNode;
  children?: ReactNode;
  /** 与 stage 内层同尺，用于放置参考骨架 viewBox */
  stageViewWidth?: number;
  stageViewHeight?: number;
  /** 与拼接幕同尺的部件原图尺寸，供操作杆与散件同坐标 */
  partNatural?: Partial<Record<PuppetPartId, { w: number; h: number }>>;
  stageContentOffsetYRatio?: number;
  stageContentScale?: number;
  stageCoordinateScale?: number;
  stageCoordinateDesignWidth?: number;
  stageCoordinateDesignHeight?: number;
  stageCoordinateOffsetX?: number;
  stageCoordinateOffsetY?: number;
  placedStagePixelOffsetY?: number;
  placedPartPixelOffsetY?: Partial<Record<PuppetPartId, number>>;
}

export function AssemblyCanvas({
  slots,
  placedParts,
  highlightPartId,
  assemblyComplete = false,
  stageRef,
  showAssemblyRods = false,
  rodImageUrls = {},
  scatteredTray,
  completeSidePanel,
  children,
  stageViewWidth = 0,
  stageViewHeight = 0,
  partNatural = {},
  stageContentOffsetYRatio = 0,
  stageContentScale = 1,
  stageCoordinateScale = 0,
  stageCoordinateDesignWidth,
  stageCoordinateDesignHeight,
  stageCoordinateOffsetX = 0,
  stageCoordinateOffsetY = 0,
  placedStagePixelOffsetY = 0,
  placedPartPixelOffsetY,
}: AssemblyCanvasProps) {
  /**
   * 完成前后都保持与拼接中一致的左右分栏宽度，避免完成瞬间舞台变宽导致皮影“重居中”。
   * 完成后右栏仅保留占位，不渲染散件内容。
   */
  const keepSplitLayout = Boolean(scatteredTray) || assemblyComplete;

  const stageInner = (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(233,199,126,0.18),_transparent_64%)]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><path d=%22M0 60 Q30 30 60 60 T120 60%22 fill=%22none%22 stroke=%22rgba(217,92,74,0.08)%22 stroke-width=%222%22/></svg>')]" />
      {!assemblyComplete ? (
        <AssemblyPlacementGuideSkeleton
          slots={slots}
          viewWidth={stageViewWidth}
          viewHeight={stageViewHeight}
          placedParts={placedParts}
        />
      ) : null}

      <AssemblyPlacedPuppetCanvas
        ref={stageRef}
        placedParts={placedParts}
        successFlashPartId={assemblyComplete ? null : highlightPartId}
        yOffsetRatio={stageContentOffsetYRatio}
        scaleRatio={stageContentScale}
        stageViewWidth={stageViewWidth}
        stageViewHeight={stageViewHeight}
        stageCoordinateScale={stageCoordinateScale}
        stageCoordinateDesignWidth={stageCoordinateDesignWidth}
        stageCoordinateDesignHeight={stageCoordinateDesignHeight}
        stageCoordinateOffsetX={stageCoordinateOffsetX}
        stageCoordinateOffsetY={stageCoordinateOffsetY}
        stagePixelOffsetY={placedStagePixelOffsetY}
        partPixelOffsetY={placedPartPixelOffsetY}
      />
      {showAssemblyRods ? (
        <AssemblyThreeRods
          urls={rodImageUrls}
          viewWidth={stageViewWidth}
          viewHeight={stageViewHeight}
          partNatural={partNatural}
        />
      ) : null}
      {children}
    </>
  );

  return (
    <StageFrame
      className={
        keepSplitLayout
          ? "flex h-full w-full min-h-0 min-w-0 flex-row !overflow-visible"
          : "h-full w-full min-h-0 min-w-0"
      }
    >
      {keepSplitLayout ? (
        <>
          <div className="assembly-stage-panel relative h-full min-h-0 min-w-0 flex-1 overflow-visible">
            {stageInner}
          </div>
          <div className="assembly-scattered-panel relative z-20 h-full min-h-0 w-[40%] min-w-[380px] max-w-[560px] shrink-0 overflow-visible">
            {assemblyComplete ? completeSidePanel : scatteredTray}
          </div>
        </>
      ) : (
        <div className="relative h-full min-h-0 w-full">{stageInner}</div>
      )}
    </StageFrame>
  );
}
