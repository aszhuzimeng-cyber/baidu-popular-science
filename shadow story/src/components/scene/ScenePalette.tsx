import { Panel } from "../common/Panel";
import { getSceneDecorImageUrl, scenePalette } from "../../data/scenePalette";
import type { SceneElementType } from "../../types/scene";
import { SIDEBAR_TUNE_PRESET } from "../../data/sidebarUiTuning";

interface ScenePaletteProps {
  onAdd: (type: SceneElementType) => void;
  panelClassName?: string;
}

export function ScenePalette({
  onAdd,
  panelClassName = "flex h-full min-h-0 min-w-0 flex-col",
}: ScenePaletteProps) {
  const tuneConfig = SIDEBAR_TUNE_PRESET.scene;

  return (
    <Panel title="choose-scene" className={panelClassName}>
      <div
        className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto"
        style={{
          gap: `${tuneConfig.itemGapPct}%`,
          paddingTop: `${tuneConfig.contentPaddingTopPct}%`,
        }}
      >
        {scenePalette.map((item) => {
          const src = getSceneDecorImageUrl(item.type);
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => onAdd(item.type)}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-scene-item-type", item.type);
                event.dataTransfer.setData("text/plain", item.type);
                event.dataTransfer.effectAllowed = "copy";
              }}
              className="group ui-thumb-hover flex min-h-0 min-w-0 shrink-0 cursor-grab items-center justify-center transition hover:-translate-y-0.5 active:cursor-grabbing"
              style={{
                height: `${tuneConfig.itemHeightPct}%`,
                width: `${tuneConfig.itemWidthPct}%`,
                borderRadius: tuneConfig.itemRadiusPx,
                padding: `${tuneConfig.itemPaddingPct ?? 0}%`,
                transform: `translate(${tuneConfig.itemTranslateXPct}%, ${tuneConfig.itemTranslateYPct}%)`,
              }}
            >
              <img
                src={src}
                alt=""
                draggable={false}
                className="max-h-full object-contain object-center drop-shadow group-hover:brightness-105"
                style={{
                  height: `${tuneConfig.imageBoxHeightPct}%`,
                  width: `${tuneConfig.imageBoxWidthPct}%`,
                  transform: `scale(${tuneConfig.imageScaleDefault})`,
                }}
              />
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
