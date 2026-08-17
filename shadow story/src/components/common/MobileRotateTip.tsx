import { createPortal } from "react-dom";
import { RotateCw, Smartphone } from "lucide-react";

interface MobileRotateTipProps {
  visible: boolean;
}

export function MobileRotateTip({ visible }: MobileRotateTipProps) {
  if (!visible) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-lg bg-[#fff7df] px-5 py-4 font-display text-[#7a3f22] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <div className="relative flex h-12 w-12 items-center justify-center text-[#b13b2c]" aria-hidden>
          <Smartphone className="h-8 w-8 rotate-90" strokeWidth={2.2} />
          <RotateCw className="absolute -right-0.5 -top-0.5 h-5 w-5" strokeWidth={2.4} />
        </div>
        <div className="space-y-1 text-center leading-relaxed">
          <p className="text-lg">建议横屏体验</p>
          <p className="text-base">为了获得更好的皮影互动体验，请将手机横向旋转后继续。</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
