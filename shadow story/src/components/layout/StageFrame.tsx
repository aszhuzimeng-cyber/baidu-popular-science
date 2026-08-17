import type { PropsWithChildren } from "react";

interface StageFrameProps extends PropsWithChildren {
  className?: string;
}

export function StageFrame({ children, className = "" }: StageFrameProps) {
  return (
    <div
      className={[
        "relative overflow-hidden bg-transparent",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
