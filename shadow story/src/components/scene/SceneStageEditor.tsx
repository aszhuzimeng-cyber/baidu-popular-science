import { useRef } from "react";
import { getSceneDecorImageUrl } from "../../data/scenePalette";
import { SCENE_DECOR_BASE_WIDTH } from "../../data/sceneRenderConfig";
import { logicalStage } from "../../data/themeConfig";
import { useSceneTransform } from "../../hooks/useSceneTransform";
import { useAppStore } from "../../store/useAppStore";
import { clamp } from "../../utils/math";
import { StageFrame } from "../layout/StageFrame";
import { SceneTransformHandles } from "./SceneTransformHandles";
import type { SceneElementType } from "../../types/scene";

interface SceneStageEditorProps {
  onDropFromPalette?: (type: SceneElementType, stageX: number, stageY: number) => void;
}

export function SceneStageEditor({ onDropFromPalette }: SceneStageEditorProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const items = useAppStore((state) => state.sceneItems);
  const { selectedItem, selectSceneItem, updateSceneItem, removeSceneItem } =
    useSceneTransform();

  const toStagePoint = (clientX: number, clientY: number) => {
    const node = frameRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * logicalStage.width,
      y: ((clientY - rect.top) / rect.height) * logicalStage.height,
    };
  };

  const normalizeDeltaAngle = (angle: number) => {
    const twoPi = Math.PI * 2;
    let value = ((angle + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
    if (value > Math.PI) value -= twoPi;
    if (value < -Math.PI) value += twoPi;
    return value;
  };

  return (
    <StageFrame className="h-full w-full">
      <div
        ref={frameRef}
        className="relative h-full w-full overflow-hidden"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          const rawType =
            event.dataTransfer.getData("application/x-scene-item-type") ||
            event.dataTransfer.getData("text/plain");
          const type = rawType as SceneElementType;
          if (!type) return;
          event.preventDefault();
          const point = toStagePoint(event.clientX, event.clientY);
          if (!point) return;
          onDropFromPalette?.(
            type,
            clamp(point.x, 60, logicalStage.width - 60),
            clamp(point.y, 70, logicalStage.height - 70),
          );
        }}
        onPointerDown={(event) => {
          if (event.currentTarget === frameRef.current) selectSceneItem(null);
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(233,199,126,0.18),_transparent_62%)]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22><circle cx=%22120%22 cy=%22120%22 r=%2290%22 fill=%22none%22 stroke=%22rgba(217,92,74,0.10)%22 stroke-width=%222%22/></svg>')",
          }}
        />
        <div className="pointer-events-none absolute inset-1 rounded-[var(--radius-input)] border border-dashed border-[var(--color-border-default)] shadow-[inset_0_0_26px_rgba(95,67,35,0.08)]" />
        {items.map((item) => (
          <div
            key={item.id}
            className="absolute top-0 z-10 -translate-x-1/2 -translate-y-1/2 touch-none"
            style={{
              left: `${(item.transform.x / logicalStage.width) * 100}%`,
              top: `${(item.transform.y / logicalStage.height) * 100}%`,
              width: `${(SCENE_DECOR_BASE_WIDTH / logicalStage.width) * 100}%`,
              transform: `translate(-50%, -50%) rotate(${(item.transform.rotation * 180) / Math.PI}deg) scale(${item.transform.scale})`,
              transformOrigin: "center center",
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              selectSceneItem(item.id);
              const node = frameRef.current;
              if (!node) return;
              const startX = event.clientX;
              const startY = event.clientY;
              const initial = { ...item.transform };

              const move = (moveEvent: PointerEvent) => {
                const rect = node.getBoundingClientRect();
                const dx =
                  ((moveEvent.clientX - startX) / rect.width) * logicalStage.width;
                const dy =
                  ((moveEvent.clientY - startY) / rect.height) * logicalStage.height;
                updateSceneItem(item.id, {
                  x: clamp(initial.x + dx, 60, logicalStage.width - 60),
                  y: clamp(initial.y + dy, 70, logicalStage.height - 70),
                });
              };

              const up = () => {
                document.removeEventListener("pointermove", move);
                document.removeEventListener("pointerup", up);
              };

              document.addEventListener("pointermove", move);
              document.addEventListener("pointerup", up);
            }}
          >
            <div className="flex w-full items-center justify-center">
              <img
                src={getSceneDecorImageUrl(item.type)}
                alt=""
                draggable={false}
                className="h-auto w-full object-contain drop-shadow"
              />
            </div>
            <SceneTransformHandles
              visible={selectedItem?.id === item.id}
              itemScale={item.transform.scale}
              onRemove={() => removeSceneItem(item.id)}
              onStartRotate={(event) => {
                const center = { x: item.transform.x, y: item.transform.y };
                const startPoint = toStagePoint(event.clientX, event.clientY);
                if (!startPoint) return;
                const startAngle = Math.atan2(
                  startPoint.y - center.y,
                  startPoint.x - center.x,
                );
                const startRotation = item.transform.rotation;

                const move = (moveEvent: PointerEvent) => {
                  const point = toStagePoint(moveEvent.clientX, moveEvent.clientY);
                  if (!point) return;
                  const currentAngle = Math.atan2(
                    point.y - center.y,
                    point.x - center.x,
                  );
                  const delta = normalizeDeltaAngle(currentAngle - startAngle);
                  updateSceneItem(item.id, {
                    rotation: startRotation + delta,
                  });
                };

                const up = () => {
                  document.removeEventListener("pointermove", move);
                  document.removeEventListener("pointerup", up);
                };

                document.addEventListener("pointermove", move);
                document.addEventListener("pointerup", up);
              }}
              onStartScale={(event) => {
                const center = { x: item.transform.x, y: item.transform.y };
                const startPoint = toStagePoint(event.clientX, event.clientY);
                if (!startPoint) return;
                const startDistance = Math.hypot(
                  startPoint.x - center.x,
                  startPoint.y - center.y,
                );
                const startScale = item.transform.scale;

                const move = (moveEvent: PointerEvent) => {
                  const point = toStagePoint(moveEvent.clientX, moveEvent.clientY);
                  if (!point) return;
                  const currentDistance = Math.hypot(
                    point.x - center.x,
                    point.y - center.y,
                  );
                  const distanceRatio = startDistance <= 0.0001
                    ? 1
                    : currentDistance / startDistance;
                  updateSceneItem(item.id, {
                    scale: clamp(startScale * distanceRatio, 0.4, 4),
                  });
                };

                const up = () => {
                  document.removeEventListener("pointermove", move);
                  document.removeEventListener("pointerup", up);
                };

                document.addEventListener("pointermove", move);
                document.addEventListener("pointerup", up);
              }}
            />
          </div>
        ))}
      </div>
    </StageFrame>
  );
}
