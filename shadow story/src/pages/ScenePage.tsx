import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { StepHeader } from "../components/common/StepHeader";
import { BottomBar } from "../components/layout/BottomBar";
import { TopBar } from "../components/layout/TopBar";
import { ScenePalette } from "../components/scene/ScenePalette";
import { SceneStageEditor } from "../components/scene/SceneStageEditor";
import { useAppStore } from "../store/useAppStore";
import { IconButton } from "../components/common/IconButton";

const shouldStartScenePaletteCollapsed = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  const iPadOSDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const phoneOrTabletByUserAgent = /iPhone|iPod|iPad|Android|Windows Phone|Mobile/i.test(ua);

  return phoneOrTabletByUserAgent || iPadOSDesktopMode;
};

export function ScenePage() {
  const [scenePaletteOpen, setScenePaletteOpen] = useState(() => !shouldStartScenePaletteCollapsed());
  const { setStep, addSceneItem, addSceneItemAt } = useAppStore(
    useShallow((state) => ({
      setStep: state.setStep,
      addSceneItem: state.addSceneItem,
      addSceneItemAt: state.addSceneItemAt,
    })),
  );

  return (
    <div className="relative h-full w-full">
      <TopBar
        title="场景布置"
        titleImage="/assets/images/ui/scene-title.png"
        titleImageClass="w-[min(25.5vw,26.8rem)]"
        right={
          <div className="flex items-center gap-2">
            <StepHeader current={2} total={3} label="场景布置" />
          </div>
        }
      />
      <div className="pointer-events-auto absolute left-[1.2%] top-[1.2vw] z-40">
        <IconButton onClick={() => setStep("assembly")} aria-label="返回" title="返回">
          <ArrowLeft size={18} />
        </IconButton>
      </div>
      <div className="pointer-events-auto absolute bottom-[7.6%] left-[7.3%] right-[7.3%] top-[9.2%] z-10 min-h-0 min-w-0">
        <SceneStageEditor onDropFromPalette={addSceneItemAt} />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-20 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/images/ui/stage-frame.png')" }}
      />
      <div
        className={[
          "pointer-events-none absolute bottom-[7.6%] left-[5.1%] top-[9.2%] z-30 min-h-0 w-fit transition-transform duration-200",
          scenePaletteOpen ? "translate-x-[26%]" : "-translate-x-[calc(100%+5.1vw)]",
        ].join(" ")}
      >
        <ScenePalette
          onAdd={addSceneItem}
          panelClassName="pointer-events-auto h-full -translate-y-[1%]"
        />
        {scenePaletteOpen ? (
          <button
            type="button"
            onClick={() => setScenePaletteOpen(false)}
            className="scene-palette-toggle scene-palette-toggle-open pointer-events-auto absolute right-[7.2%] top-1/2 flex h-12 w-9 translate-x-full -translate-y-1/2 items-center justify-center rounded-r-full border border-l-0 border-[#b98245] bg-[rgb(194,91,51)] text-[#ffe2a3] shadow-[0_8px_18px_rgba(55,25,11,0.35)] transition hover:brightness-110"
            aria-label="收起选择场景"
            title="收起选择场景"
          >
            <ChevronLeft size={22} />
          </button>
        ) : null}
      </div>
      {!scenePaletteOpen ? (
        <button
          type="button"
          onClick={() => setScenePaletteOpen(true)}
          className="scene-palette-toggle scene-palette-toggle-closed pointer-events-auto absolute left-[5.8%] top-1/2 z-40 flex h-[3.6rem] w-[3.6rem] -translate-y-1/2 items-center justify-center rounded-full border border-[#b98245] bg-[rgb(194,91,51)] text-[#ffe2a3] shadow-[0_5px_12px_rgba(55,25,11,0.28)] transition hover:brightness-110"
          aria-label="展开选择场景"
          title="展开选择场景"
        >
          <ChevronRight size={33} />
        </button>
      ) : null}
      <BottomBar>
        <button
          type="button"
          onClick={() => setStep("performance")}
          className="scene-next-button -translate-y-[90px] w-[min(28vw,28rem)] bg-transparent p-0 transition hover:brightness-110 active:scale-[0.98]"
          aria-label="开始表演"
          title="开始表演"
        >
          <img
            src="/assets/images/ui/start-button.png"
            alt=""
            draggable={false}
            className="block h-auto w-full select-none object-contain"
          />
        </button>
      </BottomBar>
    </div>
  );
}
