import type { PropsWithChildren } from "react";

export function BottomBar({ children }: PropsWithChildren) {
  return (
    <div className="absolute inset-x-0 bottom-4 z-30 flex items-center justify-center px-6">
      {children}
    </div>
  );
}
