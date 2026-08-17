import { forwardRef } from "react";
import { AssemblyManualComposite } from "./AssemblyManualComposite";
import type { PuppetPartId } from "../../types/puppet";

export type AssemblyPlacedPuppetCanvasProps = {
  placedParts: Record<PuppetPartId, boolean>;
  /** 与拼接成功高亮同步，幕上该件一次强调动画 */
  successFlashPartId?: PuppetPartId | null;
  className?: string;
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
};

/**
 * 已落位散件：按 store 中手调/固化表叠到幕布上（与吸附目标一致），不再用矢量 α 裁切。
 * ref 为舞台根（与 t.x / t.y 的 % 参考框相同），与槽位/吸附用同一套像素尺度。
 */
export const AssemblyPlacedPuppetCanvas = forwardRef<HTMLDivElement, AssemblyPlacedPuppetCanvasProps>(
  function AssemblyPlacedPuppetCanvas(
    {
      placedParts,
      successFlashPartId = null,
      className = "pointer-events-none absolute inset-0 z-[15] min-h-0 min-w-0",
      yOffsetRatio = 0,
      scaleRatio = 1,
      stageViewWidth = 0,
      stageViewHeight = 0,
      stageCoordinateScale = 0,
      stageCoordinateDesignWidth,
      stageCoordinateDesignHeight,
      stageCoordinateOffsetX,
      stageCoordinateOffsetY,
      stagePixelOffsetY = 0,
      partPixelOffsetY,
    },
    ref,
  ) {
    return (
      <AssemblyManualComposite
        ref={ref}
        showReference={false}
        interactive={false}
        placedOnly={placedParts}
        successFlashPartId={successFlashPartId}
        className={className}
        yOffsetRatio={yOffsetRatio}
        scaleRatio={scaleRatio}
        stageViewWidth={stageViewWidth}
        stageViewHeight={stageViewHeight}
        stageCoordinateScale={stageCoordinateScale}
        stageCoordinateDesignWidth={stageCoordinateDesignWidth}
        stageCoordinateDesignHeight={stageCoordinateDesignHeight}
        stageCoordinateOffsetX={stageCoordinateOffsetX}
        stageCoordinateOffsetY={stageCoordinateOffsetY}
        stagePixelOffsetY={stagePixelOffsetY}
        partPixelOffsetY={partPixelOffsetY}
      />
    );
  },
);
