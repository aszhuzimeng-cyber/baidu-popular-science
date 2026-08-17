import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

const iconButtonImages: Record<string, string> = {
  返回: "/assets/images/ui/back.png",
  拍照: "/assets/images/ui/camera.png",
  添加角色: "/assets/images/ui/add-character.png",
  翻转皮影: "/assets/images/ui/flip-puppet.png",
  删除角色: "/assets/images/ui/delete-character.png",
};

export function IconButton({
  children,
  className = "",
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  const label =
    typeof props["aria-label"] === "string"
      ? props["aria-label"]
      : typeof props.title === "string"
        ? props.title
        : "";
  const image = iconButtonImages[label];

  if (image) {
    return (
      <button
        {...props}
        className={[
          "ui-art-icon-button relative flex h-[clamp(4.5rem,6vw,5.75rem)] w-[clamp(4.5rem,6vw,5.75rem)] items-center justify-center bg-transparent p-0 text-[0px] transition enabled:hover:brightness-110 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
          className,
        ].join(" ")}
      >
        <img
          src={image}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
        />
        <span className="sr-only">{label}</span>
      </button>
    );
  }

  return (
    <button
      {...props}
      className={[
        "ui-icon-button flex h-14 w-14 items-center justify-center",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
