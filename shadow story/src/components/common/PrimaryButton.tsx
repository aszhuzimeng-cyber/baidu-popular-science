import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export function PrimaryButton({
  children,
  className = "",
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  const label = typeof children === "string" ? children : "";
  const image = label.includes("场景布置")
    ? "/assets/images/ui/arrange-scene-button.png"
    : label.includes("开始表演")
      ? "/assets/images/ui/start-button.png"
      : null;

  if (image) {
    return (
      <button
        {...props}
        className={[
          "relative aspect-[1740/312] w-[min(28vw,28rem)] bg-transparent p-0 text-[0px] transition enabled:hover:brightness-110 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
          className,
        ].join(" ")}
      >
        <img
          src={image}
          alt={label}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
        />
      </button>
    );
  }

  return (
    <button
      {...props}
      className={[
        "ui-primary-button px-8 py-3 font-body disabled:cursor-not-allowed disabled:opacity-40",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
