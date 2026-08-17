import { ArrowLeft } from "lucide-react";
import { IconButton } from "../common/IconButton";
import { StepHeader } from "../common/StepHeader";

interface PerformanceToolbarProps {
  onBack: () => void;
}

export function PerformanceToolbar({ onBack }: PerformanceToolbarProps) {
  return (
    <div className="absolute inset-x-0 top-0 z-30 h-[15%]">
      <div className="pointer-events-auto absolute left-[1.2%] top-[1.2vw] z-40">
        <IconButton onClick={onBack} aria-label="返回" title="返回">
          <ArrowLeft size={18} />
        </IconButton>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[9%] flex justify-center">
        <img
          src="/assets/images/ui/performance-title.png"
          alt="幕上表演"
          draggable={false}
          className="-mt-4 h-auto w-[min(25.5vw,26.8rem)] select-none object-contain"
        />
      </div>
      <StepHeader current={3} total={3} label="幕上表演" />
    </div>
  );
}
