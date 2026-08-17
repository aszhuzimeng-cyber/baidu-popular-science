import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface TopBarProps {
  title: string;
  titleImage?: string;
  titleImageClass?: string;
  left?: ReactNode;
  right?: ReactNode;
}

export function TopBar({ title, titleImage, titleImageClass = "", left, right }: TopBarProps) {
  const resolvedTitleImage =
    title.includes("皮影") || title.includes("鐨")
      ? "/assets/images/ui/assembly-title.png"
      : title.includes("场景") || title.includes("鍦")
        ? "/assets/images/ui/scene-title.png"
        : titleImage;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[15%]">
      <div className="pointer-events-auto absolute left-[5.2%] top-[18%] min-w-[72px]">{left}</div>
      <div className="pointer-events-none absolute inset-x-0 top-[9%] flex justify-center translate-y-[3px]">
        {resolvedTitleImage ? (
          <motion.img
            initial={{ y: -10, opacity: 0.2 }}
            animate={{ y: 0, opacity: 1 }}
            src={resolvedTitleImage}
            alt={title}
            draggable={false}
            className={[
              "pointer-events-auto -mt-4 h-auto w-[min(25.5vw,26.8rem)] select-none object-contain",
              titleImageClass,
            ].join(" ")}
          />
        ) : (
          <motion.div
            initial={{ y: -10, opacity: 0.2 }}
            animate={{ y: 0, opacity: 1 }}
            className="pointer-events-auto ui-card px-12 py-2.5 text-center font-body text-[36px] font-bold"
          >
            {title}
          </motion.div>
        )}
      </div>
      <div className="pointer-events-auto absolute right-[5.2%] top-[20%] flex min-w-[72px] justify-end gap-2">
        {right}
      </div>
    </div>
  );
}
