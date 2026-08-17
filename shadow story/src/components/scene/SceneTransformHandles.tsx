import type { PointerEvent as ReactPointerEvent } from "react";
import { RotateCw, Trash2, Expand } from "lucide-react";
import { IconButton } from "../common/IconButton";

interface SceneTransformHandlesProps {
  visible: boolean;
  itemScale?: number;
  onStartRotate: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onStartScale: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onRemove: () => void;
}

const transformHandleButtonClass =
  "!border-[#b98245] !bg-[rgb(194,91,51)] !text-[#ffe2a3] !shadow-[0_8px_18px_rgba(55,25,11,0.35)] hover:!brightness-110";

export function SceneTransformHandles({
  visible,
  itemScale = 1,
  onStartRotate,
  onStartScale,
  onRemove,
}: SceneTransformHandlesProps) {
  if (!visible) return null;

  const handleScale = Number.isFinite(itemScale) && itemScale > 0 ? 1 / itemScale : 1;

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-20 border-2 border-[var(--color-theme-primary)]/70 shadow-[0_0_0_1px_rgba(217,92,74,0.16)_inset]" />

      <div
        className="scene-transform-handle scene-transform-handle-rotate pointer-events-auto absolute -right-5 -top-5 z-30"
        style={{ transform: `scale(${handleScale})`, transformOrigin: "center center" }}
      >
        <IconButton
          className={`scene-transform-handle-button h-10 w-10 !rounded-full ${transformHandleButtonClass}`}
          onPointerDown={(event) => {
            event.stopPropagation();
            onStartRotate(event);
          }}
        >
          <RotateCw size={16} />
        </IconButton>
      </div>

      <div
        className="scene-transform-handle scene-transform-handle-remove pointer-events-auto absolute -left-5 -bottom-5 z-30"
        style={{ transform: `scale(${handleScale})`, transformOrigin: "center center" }}
      >
        <IconButton
          className={`scene-transform-handle-button h-10 w-10 !rounded-full ${transformHandleButtonClass}`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 size={16} />
        </IconButton>
      </div>

      <div
        className={`scene-transform-handle scene-transform-handle-scale scene-transform-handle-button pointer-events-auto absolute -bottom-5 -right-5 z-30 flex h-10 w-10 cursor-nwse-resize items-center justify-center rounded-full border ${transformHandleButtonClass}`}
        style={{ transform: `scale(${handleScale})`, transformOrigin: "center center" }}
        onPointerDown={(event) => {
          event.stopPropagation();
          onStartScale(event);
        }}
      >
        <Expand size={16} />
      </div>
    </>
  );
}
