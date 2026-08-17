import { useMemo } from "react";
import { motion } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { createDefaultAssemblyPartTransforms } from "../../data/assemblyDefaultTransforms";
import { forearmHandTipPixel, stageJointPixelFromTunedCenter } from "../../data/assemblyLayout";
import { useAppStore } from "../../store/useAppStore";
import type { PuppetPartId } from "../../types/puppet";
import type { PuppetRodSkinId } from "../../types/puppetSkin";

const ROD_ORDER: { id: PuppetRodSkinId; label: string; kind: "neck" | "rearHand" | "frontHand" }[] = [
  { id: "neck", label: "颈杆", kind: "neck" },
  { id: "rearHand", label: "后手杆", kind: "rearHand" },
  { id: "frontHand", label: "前手杆", kind: "frontHand" },
];

/** 与 `AssemblyPage` partMeta 一致，作 natural 回退 */
const DEFAULT_NAT: Partial<Record<PuppetPartId, { w: number; h: number }>> = {
  head: { w: 118, h: 128 },
  leftForearm: { w: 84, h: 148 },
  rightForearm: { w: 84, h: 148 },
};

type Props = {
  urls: Partial<Record<PuppetRodSkinId, string>>;
  viewWidth: number;
  viewHeight: number;
  partNatural: Partial<Record<PuppetPartId, { w: number; h: number }>>;
  className?: string;
};

/**
 * 三杆与幕上散件同坐标系：颈杆在头片颈孔、后/前手杆在左/右小臂远端（与手调位姿、拼接完成态同叠）。
 * 不再使用底部横排，避免与表演页脱节。
 */
export function AssemblyThreeRods({
  urls,
  viewWidth: vw,
  viewHeight: vh,
  partNatural,
  className = "pointer-events-none absolute inset-0 z-[32] min-h-0 min-w-0",
}: Props) {
  const transforms = useAppStore(
    useShallow(
      (s) =>
        s.assemblyPartTransformsByCharacterId[s.selectedCharacterId] ?? createDefaultAssemblyPartTransforms(),
    ),
  );

  const sz = (id: PuppetPartId) => {
    const n = partNatural[id] ?? DEFAULT_NAT[id];
    return n ?? { w: 100, h: 120 };
  };

  const layouts = useMemo(() => {
    const th = transforms.head;
    const tl = transforms.leftForearm;
    const tr = transforms.rightForearm;
    if (vw < 4 || vh < 4 || !th || !tl || !tr) {
      return null;
    }
    const hw = sz("head");
    const lfw = sz("leftForearm");
    const rfw = sz("rightForearm");
    return {
      neck: stageJointPixelFromTunedCenter("head", hw.w, hw.h, vw, vh, th),
      /** 素材约定：后手=左、前手=右（同 PuppetAssetLoader） */
      rearHand: forearmHandTipPixel("leftForearm", lfw.w, lfw.h, vw, vh, tl),
      frontHand: forearmHandTipPixel("rightForearm", rfw.w, rfw.h, vw, vh, tr),
      degNeck: th.rotationDeg - 8,
      degRear: tl.rotationDeg + 92,
      degFront: tr.rotationDeg + 92,
    };
  }, [transforms, vw, vh, partNatural]);

  if (!layouts) {
    return null;
  }
  const stageScale = Math.min(vw / 1280, vh / 720);
  const rodLengthPx = (kind: "neck" | "rearHand" | "frontHand") =>
    Math.max(180, Math.round((kind === "neck" ? 600 : 500) * stageScale));

  return (
    <div className={className} aria-hidden>
      {ROD_ORDER.map((r, i) => {
        const href = urls[r.id];
        const p =
          r.kind === "neck"
            ? { x: layouts.neck.x, y: layouts.neck.y, deg: layouts.degNeck }
            : r.kind === "rearHand"
              ? { x: layouts.rearHand.x, y: layouts.rearHand.y, deg: layouts.degRear }
              : { x: layouts.frontHand.x, y: layouts.frontHand.y, deg: layouts.degFront };
        const xPct = (p.x / vw) * 100;
        const yPct = (p.y / vh) * 100;
        const len = rodLengthPx(r.kind);
        if (!href) {
          return (
            <div
              key={r.id}
              aria-label={r.label}
              className="absolute pointer-events-none"
              style={{
                left: `${xPct}%`,
                top: `${yPct}%`,
                width: "4px",
                height: `${len}px`,
                transform: `translate(-50%, 0) rotate(${p.deg}deg)`,
                transformOrigin: "50% 0%",
              }}
            >
              <div
                className="absolute left-1/2 top-0 -translate-x-1/2 bg-[#222]"
                style={{ width: "4px", height: "100%" }}
              />
              <div
                className="absolute left-1/2 -translate-x-1/2 bg-[#5c4033]"
                style={{ width: "6px", height: `${Math.min(50, Math.round(len * 0.14))}px`, bottom: 0 }}
              />
            </div>
          );
        }
        return (
          <motion.img
            key={r.id}
            src={href}
            alt={r.label}
            draggable={false}
            className="absolute min-h-0 w-auto select-none object-contain"
            style={{
              left: `${xPct}%`,
              top: `${yPct}%`,
              height: `${len}px`,
              maxWidth: "18px",
              transform: `translate(-50%, 0) rotate(${p.deg}deg)`,
              transformOrigin: "50% 0%",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 * i, duration: 0.45, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}
