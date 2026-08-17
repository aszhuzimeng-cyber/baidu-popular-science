import { useEffect, useState, type PropsWithChildren } from "react";
import { GraduationCap, Medal, Trophy, X } from "lucide-react";
import { MobileRotateTip } from "../common/MobileRotateTip";
import { isMobileDevice, isPortraitOrientation } from "../../utils/device";

const INTRO_CARD_WIDTH = 1040;
const INTRO_CARD_HEIGHT = 550;

const PRELOAD_IMAGE_URLS = [
  "/assets/images/ui/background.png",
  "/assets/images/ui/stage-frame.png",
  "/assets/images/ui/bupt-intelligent-interaction-card-bg.png",
  "/assets/images/ui/bupt-intelligent-interaction-logo.png",
  "/assets/images/ui/my-works-save.png",
  "/assets/images/ui/arrange-scene-button.png",
  "/assets/images/ui/scene-title.png",
  "/assets/images/ui/flip-puppet.png",
  "/assets/images/ui/back.png",
  "/assets/images/ui/start-button.png",
  "/assets/images/ui/performance-title.png",
  "/assets/images/ui/camera.png",
  "/assets/images/ui/assembly-title.png",
  "/assets/images/ui/delete-character.png",
  "/assets/images/ui/gesture-mode-button.png",
  "/assets/images/ui/gesture-mode-guide.png",
  "/assets/images/ui/add-secondary-puppet.png",
  "/assets/images/ui/add-character.png",
  "/assets/images/ui/my-works.png",
  "/assets/images/ui/my-works-exit.png",
  "/assets/images/ui/scene-decoration-panel.png",
  "/assets/images/ui/puppet-select-panel.png",
  "/assets/images/ui/rods-toggle-off.png",
  "/assets/images/ui/rods-toggle-on.png",
  "/assets/images/scene/pavilion.png",
  "/assets/images/scene/willow.png",
  "/assets/images/scene/bridge.png",
  "/assets/images/scene/bamboo.png",
] as const;

let preloadStarted = false;
const preloadedImages: HTMLImageElement[] = [];

const preloadImages = () => {
  if (preloadStarted || typeof Image === "undefined") return;
  preloadStarted = true;
  PRELOAD_IMAGE_URLS.forEach((src) => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = src;
    void img.decode?.().catch(() => undefined);
    preloadedImages.push(img);
  });
};

const introStats = [
  {
    title: "国内首个",
    icon: GraduationCap,
  },
  {
    title: "北京市一流本科专业",
    icon: Medal,
  },
  {
    title: "软科A+",
    icon: Trophy,
  },
];

export function AppShell({ children }: PropsWithChildren) {
  const [showRotateTip, setShowRotateTip] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    preloadImages();
  }, []);

  useEffect(() => {
    const updateRotateTip = () => {
      setShowRotateTip(isMobileDevice() && isPortraitOrientation());
    };

    updateRotateTip();
    window.addEventListener("resize", updateRotateTip);
    window.addEventListener("orientationchange", updateRotateTip);
    return () => {
      window.removeEventListener("resize", updateRotateTip);
      window.removeEventListener("orientationchange", updateRotateTip);
    };
  }, []);

  useEffect(() => {
    if (!showIntro) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowIntro(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showIntro]);

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);
    window.addEventListener("orientationchange", updateViewportSize);
    return () => {
      window.removeEventListener("resize", updateViewportSize);
      window.removeEventListener("orientationchange", updateViewportSize);
    };
  }, []);

  const introScale =
    viewportSize.width > 0 && viewportSize.height > 0
      ? Math.min(
          1,
          (viewportSize.width * 0.92) / INTRO_CARD_WIDTH,
          (viewportSize.height * 0.92) / INTRO_CARD_HEIGHT,
        )
      : 1;

  return (
    <div
      className="flex h-screen min-h-screen w-full items-center justify-center overflow-hidden bg-[#edc98d] bg-cover bg-center font-body text-[var(--color-text-primary)]"
      style={{
        height: "100dvh",
        minHeight: "100dvh",
        backgroundImage: "url('/assets/images/ui/background.png')",
      }}
    >
      <div
        data-app-shell-frame
        className="relative h-[min(100vh,56.25vw)] w-[min(100vw,177.7778vh)] overflow-hidden bg-transparent"
        style={{
          height: "min(100dvh, 56.25vw)",
          width: "min(100vw, 177.7778dvh)",
        }}
      >
        <div className="pointer-events-none absolute inset-[6.4%_7.3%_8.8%_7.3%] z-[1] bg-[var(--color-curtain-mid)]" />
        <div className="pointer-events-none absolute inset-[6.4%_7.3%_8.8%_7.3%] z-[1] bg-[radial-gradient(ellipse_at_48%_56%,_rgba(255,250,221,0.98)_0%,_rgba(248,236,196,0.88)_34%,_rgba(239,197,136,0.68)_68%,_rgba(239,197,136,0.5)_100%)]" />
        <div className="pointer-events-none absolute inset-[6.4%_7.3%_8.8%_7.3%] z-[1] bg-[linear-gradient(180deg,_rgba(239,197,136,0.2),_transparent_30%,_transparent_78%,_rgba(239,197,136,0.12))]" />
        <div className="pointer-events-none absolute inset-[6.4%_7.3%_8.8%_7.3%] z-[1] bg-[linear-gradient(90deg,_rgba(239,197,136,0.16),_transparent_24%,_transparent_76%,_rgba(239,197,136,0.18))]" />
        <div
          className="pointer-events-none absolute inset-0 z-[5] bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/assets/images/ui/stage-frame.png')" }}
        />
        <div className="relative z-10 h-full w-full">{children}</div>
      </div>
      <button
        type="button"
        onClick={() => setShowIntro(true)}
        className="fixed bottom-[clamp(8px,1.6vw,18px)] right-[clamp(8px,1.6vw,18px)] z-[60] w-[clamp(64px,7vw,118px)] bg-transparent p-0 opacity-95 transition hover:brightness-110 active:scale-95"
        aria-label="查看北邮智能交互设计介绍"
        title="北邮智能交互设计"
      >
        <img
          src="/assets/images/ui/bupt-intelligent-interaction-logo.png"
          alt=""
          draggable={false}
          className="pointer-events-none block w-full select-none object-contain"
        />
      </button>
      {showIntro ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#2b170d]/35 px-[3vw] py-[3vh] backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="intro-dialog-title"
        >
          <div
            className="intro-dialog relative h-[550px] w-[1040px] shrink-0 overflow-hidden rounded-[30px] bg-[#fffaf3] text-[#29292b] shadow-[0_18px_50px_rgba(54,30,18,0.22)]"
            style={{ transform: `scale(${introScale})` }}
          >
            <img
              src="/assets/images/ui/bupt-intelligent-interaction-card-bg.png"
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-100"
            />
            <button
              type="button"
              onClick={() => setShowIntro(false)}
              className="absolute right-[28px] top-[28px] z-20 flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[#eee7df] bg-white/82 text-[#38383a] shadow-[0_4px_14px_rgba(50,35,24,0.08)] transition hover:brightness-105 active:scale-95"
              aria-label="关闭介绍"
              title="关闭"
            >
              <X className="h-[28px] w-[28px]" strokeWidth={2.2} />
            </button>
            <div className="absolute left-[64px] top-[56px] z-10 w-[912px]">
              <h2 id="intro-dialog-title" className="intro-title text-[44px] leading-none text-[#242426]">
                北京邮电大学智能交互设计
              </h2>
              <div className="mt-[16px] h-[7px] w-[190px] rounded-full bg-[linear-gradient(90deg,#ae2525_0%,#b92d2d_42%,rgba(185,45,45,0.3)_76%,rgba(185,45,45,0)_100%)]" />
              <p className="intro-body mt-[34px] max-w-[912px] text-[20px] leading-[1.68] text-[#303033]">
                北京邮电大学智能交互设计专业是教育部批准设立的国内首个智能交互设计本科专业，入选北京市“一流本科专业”建设点，获评软科A+专业。面向国家“人工智能+”战略布局，专业构建“智能计算+交互创新”双核培养体系，持续引领智能产品设计与开发的前沿方向。
              </p>
            </div>
            <div className="absolute bottom-[56px] left-[64px] z-10 grid w-[912px] grid-cols-3 gap-[32px]">
              {introStats.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex h-[154px] flex-col items-center justify-between rounded-[23px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.94)_58%,rgba(250,246,240,0.9)_100%)] px-[16px] py-[18px] shadow-[0_15px_30px_rgba(88,55,35,0.15),0_5px_15px_rgba(128,74,43,0.11),inset_0_1px_0_rgba(255,255,255,0.95)]"
                  >
                    <span className="flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_34%_26%,#bc3d35_0%,#a62a24_45%,#8d180e_100%)] text-white shadow-[0_8px_16px_rgba(122,20,16,0.24),inset_0_1px_0_rgba(255,255,255,0.18)]">
                      <Icon className="h-[40px] w-[40px]" strokeWidth={2.45} />
                    </span>
                    <span className="intro-stat-title block whitespace-nowrap text-center text-[23px] leading-none text-[#9f2c2b] drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">
                      {item.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      <MobileRotateTip visible={showRotateTip} />
    </div>
  );
}
