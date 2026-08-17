import type { PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";
import { AssemblyPartVisual } from "./AssemblyPartVisual";
import type { PuppetPartId } from "../../types/puppet";

export interface AssemblyPieceUI {
  id: PuppetPartId;
  label: string;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  visualCenterX?: number;
  visualCenterY?: number;
  placed: boolean;
}

interface PartsTrayProps {
  pieces: AssemblyPieceUI[];
  draggingId: PuppetPartId | null;
  partImages?: Partial<Record<PuppetPartId, string>>;
  /** 与左侧舞台/固化表一致，散件在托盘上的旋转角（度）；选中/拖拽时仍保持 */
  pieceRotationDeg?: (id: PuppetPartId) => number;
  pieceZIndex?: (id: PuppetPartId) => number;
  trayContentRef?: React.RefObject<HTMLDivElement>;
  layoutWidth?: number;
  layoutHeight?: number;
  layoutScale?: number;
  layoutOffsetX?: number;
  layoutOffsetY?: number;
  onPointerDown: (id: PuppetPartId, event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (id: PuppetPartId, event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (id: PuppetPartId, event: ReactPointerEvent<HTMLDivElement>) => void;
}

export function PartsTray({
  pieces,
  draggingId,
  partImages,
  pieceRotationDeg,
  pieceZIndex,
  trayContentRef,
  layoutWidth,
  layoutHeight,
  layoutScale = 1,
  layoutOffsetX = 0,
  layoutOffsetY = 0,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: PartsTrayProps) {
  return (
    <div className="relative h-full min-h-0 w-full">
      <div ref={trayContentRef} className="relative h-full min-h-0 w-full">
        <div
          className="absolute left-0 top-0"
          style={{
            width: layoutWidth,
            height: layoutHeight,
            transform: `translate(${layoutOffsetX}px, ${layoutOffsetY}px) scale(${layoutScale})`,
            transformOrigin: "top left",
          }}
        >
          {pieces.filter((piece) => !piece.placed).map((piece) => (
            <motion.div
              key={piece.id}
              initial={false}
              animate={{
                x: piece.x,
                y: piece.y,
                rotate: pieceRotationDeg?.(piece.id) ?? 0,
              }}
              transition={
                draggingId === piece.id
                  ? { duration: 0 }
                  : { type: "tween", duration: 0.28, ease: "easeOut" }
              }
              style={{
                zIndex: draggingId === piece.id ? 100 : pieceZIndex?.(piece.id) ?? 20,
                transformOrigin: `${piece.visualCenterX ?? piece.width / 2}px ${piece.visualCenterY ?? piece.height / 2}px`,
              }}
              className="absolute left-0 top-0 h-fit w-fit touch-none"
              onPointerDown={(event) => onPointerDown(piece.id, event)}
              onPointerMove={(event) => onPointerMove(piece.id, event)}
              onPointerUp={(event) => onPointerUp(piece.id, event)}
            >
              <AssemblyPartVisual
                partId={piece.id}
                label={piece.label}
                src={partImages?.[piece.id]}
                trayMode
                trayFitSize={{ w: piece.width, h: piece.height }}
                frameClassName="cursor-grab active:cursor-grabbing"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
