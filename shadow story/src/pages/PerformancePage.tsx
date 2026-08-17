import { useEffect, useState } from "react";
import { PerformanceStage } from "../components/performance/PerformanceStage";
import { PerformanceToolbar } from "../components/performance/PerformanceToolbar";
import { useAppStore } from "../store/useAppStore";
import { characterCards } from "../data/puppetConfig";
import { logicalStage } from "../data/themeConfig";
import { isMobileDevice } from "../utils/device";

const UNIFIED_PERFORMANCE_PUPPET_SCALE = 0.88;
const ROLE4_PERFORMANCE_PUPPET_SCALE = UNIFIED_PERFORMANCE_PUPPET_SCALE * 1.1;
const WORK_MODAL_DESIGN_WIDTH = 1096;
const WORK_MODAL_DESIGN_HEIGHT = 830;

export function PerformancePage() {
  const setStep = useAppStore((state) => state.setStep);
  const setPerformancePuppetTransform = useAppStore((state) => state.setPerformancePuppetTransform);
  const selectedCharacterId = useAppStore((state) => state.selectedCharacterId);
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    characterCards.forEach((card) => {
      setPerformancePuppetTransform(card.id, {
        scale: card.id === "role-4" ? ROLE4_PERFORMANCE_PUPPET_SCALE : UNIFIED_PERFORMANCE_PUPPET_SCALE,
        ...(card.id === selectedCharacterId ? { x: logicalStage.width / 2 } : {}),
      });
    });
  }, [selectedCharacterId, setPerformancePuppetTransform]);

  useEffect(() => {
    const updateMobileState = () => {
      setIsMobile(isMobileDevice());
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateMobileState();
    window.addEventListener("resize", updateMobileState);
    window.addEventListener("orientationchange", updateMobileState);
    return () => {
      window.removeEventListener("resize", updateMobileState);
      window.removeEventListener("orientationchange", updateMobileState);
    };
  }, []);

  const handleCapture = (imageDataUrl: string) => {
    setShareImage(imageDataUrl);
  };

  const handleSaveWork = () => {
    if (!shareImage) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const a = document.createElement("a");
    a.href = shareImage;
    a.download = `shadow-puppet-work-${stamp}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const workModalScale =
    viewportSize.width > 0 && viewportSize.height > 0
      ? Math.min(
          1,
          (viewportSize.width - 32) / WORK_MODAL_DESIGN_WIDTH,
          (viewportSize.height * 0.84) / WORK_MODAL_DESIGN_HEIGHT,
        )
      : 1;

  return (
    <div className="relative h-full w-full">
      <PerformanceToolbar onBack={() => setStep("scene")} />
      <div className="absolute inset-[9.2%_7.3%_7.6%_7.3%] min-h-0">
        <div className="relative h-full min-h-0 w-full !overflow-visible">
          <PerformanceStage onCapture={handleCapture} disableGestureMode={isMobile} />
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-[15] bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/images/ui/stage-frame.png')" }}
      />
      {shareImage ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/45 px-4 backdrop-blur-[1px]">
          <div
            className="relative shrink-0"
            style={{
              width: WORK_MODAL_DESIGN_WIDTH,
              height: WORK_MODAL_DESIGN_HEIGHT,
              transform: `scale(${workModalScale})`,
            }}
          >
            <img
              src="/assets/images/ui/my-works.png"
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
            />
            <button
              type="button"
              onClick={() => setShareImage(null)}
              className="absolute z-10 bg-transparent p-0 transition hover:brightness-110 active:scale-95"
              style={{
                right: 18,
                top: 25,
                width: 90,
              }}
              aria-label="关闭"
              title="关闭"
            >
              <img
                src="/assets/images/ui/my-works-exit.png"
                alt=""
                draggable={false}
                className="block h-auto w-full select-none object-contain"
              />
            </button>
            <div
              className="absolute flex items-center justify-center overflow-hidden rounded-[10px]"
              style={{
                left: 81,
                right: 81,
                top: 190,
                bottom: 150,
              }}
            >
              <img
                src={shareImage}
                alt="我的作品"
                className="block max-h-full max-w-full object-contain shadow-[0_6px_16px_rgba(93,55,22,0.22)]"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveWork}
              className="absolute left-1/2 z-10 -translate-x-1/2 bg-transparent p-0 transition hover:brightness-110 active:scale-[0.98]"
              style={{
                bottom: 33,
                width: 263,
              }}
              aria-label="保存我的作品"
              title="保存"
            >
              <img
                src="/assets/images/ui/my-works-save.png"
                alt=""
                draggable={false}
                className="block h-auto w-full select-none object-contain"
              />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
