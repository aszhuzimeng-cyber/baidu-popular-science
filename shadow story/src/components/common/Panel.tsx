import type { PropsWithChildren } from "react";

interface PanelProps extends PropsWithChildren {
  title?: string;
  className?: string;
}

type PanelAsset = {
  src: string;
  width: number;
  height: number;
};

const resolvePanelAsset = (title: string): PanelAsset | null => {
  if (
    title === "choose-puppet" ||
    title.includes("选择皮影") ||
    title.includes("皮影") ||
    title.includes("鐨")
  ) {
    return { src: "/assets/images/ui/puppet-select-panel.png", width: 304, height: 883 };
  }
  if (
    title === "choose-scene" ||
    title.includes("选择场景装饰") ||
    title.includes("场景") ||
    title.includes("鍦")
  ) {
    return { src: "/assets/images/ui/scene-decoration-panel.png", width: 304, height: 883 };
  }
  return null;
};

export function Panel({ title, className = "", children }: PanelProps) {
  const panelAsset = resolvePanelAsset(title ?? "");

  if (panelAsset) {
    return (
      <div
        className={["relative min-h-0 min-w-0 overflow-hidden", className].join(" ")}
        style={{ aspectRatio: `${panelAsset.width} / ${panelAsset.height}` }}
      >
        <img
          src={panelAsset.src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
        />
        <div className="absolute inset-0 z-10 flex min-h-0 flex-col px-[12%] pb-[10%] pt-[20%]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={["ui-card p-[var(--spacing-pc-card-padding)]", className].join(" ")}>
      {title ? (
        <div className="ui-panel-title mb-[var(--spacing-pc-title-body-gap)] px-1 pb-2 font-body">
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
}
