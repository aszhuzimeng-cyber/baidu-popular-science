import { useMemo } from "react";
import { motion } from "framer-motion";
import type { AssemblySlotLayout } from "./AssemblyCanvas";
import type { PuppetPartId } from "../../types/puppet";
import {
  buildJointPoints,
  buildNeckRect,
  findSlot,
  jointVisible,
  type GuideIntensity,
  type JointId,
} from "./assemblyPlacementGuideUtils";
import { isMobileDevice } from "../../utils/device";

export type AssemblyPlacementGuideSkeletonProps = {
  slots: AssemblySlotLayout[];
  viewWidth: number;
  viewHeight: number;
  placedParts: Readonly<Partial<Record<PuppetPartId, boolean>>>;
};

function strokeFor(i: GuideIntensity) {
  switch (i) {
    case "rest":
      return { c: "rgba(170, 122, 72, 0.44)", w: 1.08 as number };
    case "drag":
      return { c: "rgba(176, 128, 78, 0.5)", w: 1.16 };
    case "near":
      return { c: "rgba(188, 133, 77, 0.58)", w: 1.32 };
    case "success":
      return { c: "rgba(188, 133, 77, 0.54)", w: 1.26 };
  }
}

/**
 * 与 `AssemblyManualComposite` 的散件层一致：中心点用 left/top 百分比 + translate(-50%,-50%)，
 * 外接框的宽高分别相对幕布宽、高用 %，与 t.x / t.y 的归一化空间一致。不再使用 SVG viewBox
 * + preserveAspectRatio="none"（在设备子像素/测量延迟下易 X、Y 非等比拉开）。
 */
function PlacedPartRect({
  dataSlot,
  slot,
  intensity,
  vw,
  vh,
  skipRotate = false,
}: {
  dataSlot: string;
  slot: AssemblySlotLayout;
  intensity: GuideIntensity;
  vw: number;
  vh: number;
  skipRotate?: boolean;
}) {
  const { x, y, width: w, height: h, frameRotationDeg: rot = 0 } = slot;
  const r = skipRotate ? 0 : rot;
  const s = strokeFor(intensity);
  return (
    <motion.div
      data-slot={dataSlot}
      className="absolute box-border rounded-sm"
      style={{
        left: `${(x / vw) * 100}%`,
        top: `${(y / vh) * 100}%`,
        width: `${(w / vw) * 100}%`,
        height: `${(h / vh) * 100}%`,
        borderWidth: s.w,
        borderStyle: "dashed",
        borderColor: s.c,
        transform: `translate(-50%, -50%)${Math.abs(r) > 0.1 ? ` rotate(${r}deg)` : ""}`,
        transformOrigin: "center",
      }}
      initial={false}
      animate={{ borderColor: s.c }}
      transition={{ duration: 0.2 }}
    />
  );
}

function JointPoint({
  j,
  intensity,
  vw,
  vh,
}: {
  j: { id: JointId; x: number; y: number };
  intensity: GuideIntensity;
  vw: number;
  vh: number;
}) {
  const s = strokeFor(intensity);
  return (
    <motion.div
      data-joint={j.id}
      className="absolute box-border rounded-full"
      style={{
        left: `${(j.x / vw) * 100}%`,
        top: `${(j.y / vh) * 100}%`,
        width: 5,
        height: 5,
        borderWidth: 1.1,
        borderStyle: "solid",
        borderColor: s.c,
        transform: "translate(-50%, -50%)",
        opacity: intensity === "near" ? 0.9 : 0.62,
      }}
      initial={false}
      animate={{ borderColor: s.c, width: intensity === "near" ? 6.5 : 5, height: intensity === "near" ? 6.5 : 5 }}
      transition={{ duration: 0.18 }}
    />
  );
}

/**
 * 皮影拼装底稿层：与手调/散件**同一**百分比坐标系。置于散件之下、幕面纹理之上。
 */
export function AssemblyPlacementGuideSkeleton({
  slots,
  viewWidth: vw,
  viewHeight: vh,
  placedParts,
}: AssemblyPlacementGuideSkeletonProps) {
  const joints = useMemo(() => buildJointPoints(slots), [slots]);
  const visibleJoints = useMemo(
    () => joints.filter((j) => jointVisible(j.id, placedParts)),
    [joints, placedParts],
  );
  const hideAuxiliaryGuides = isMobileDevice();

  if (vw < 4 || vh < 4 || slots.length < 2) {
    return null;
  }

  const head = findSlot(slots, "head");
  const torso = findSlot(slots, "torso");
  const pelvis = findSlot(slots, "pelvis");
  if (!head || !torso) {
    return null;
  }

  const neck = buildNeckRect(head, torso);
  const s = (id: PuppetPartId) => findSlot(slots, id);
  const p = (id: PuppetPartId) => Boolean(placedParts[id]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[8] min-h-0 min-w-0"
      aria-hidden
    >
      {pelvis && !p("pelvis") ? (
        <PlacedPartRect
          dataSlot="lowerBodySlot"
          slot={pelvis}
          intensity="rest"
          vw={vw}
          vh={vh}
        />
      ) : null}

      {s("leftLeg") && !p("leftLeg") ? (
        <PlacedPartRect
          dataSlot="leftLegSlot"
          slot={s("leftLeg")!}
          intensity="rest"
          vw={vw}
          vh={vh}
        />
      ) : null}
      {s("rightLeg") && !p("rightLeg") ? (
        <PlacedPartRect
          dataSlot="rightLegSlot"
          slot={s("rightLeg")!}
          intensity="rest"
          vw={vw}
          vh={vh}
        />
      ) : null}

      {!p("torso") ? (
        <PlacedPartRect
          dataSlot="upperBodySlot"
          slot={torso}
          intensity="rest"
          vw={vw}
          vh={vh}
        />
      ) : null}

      {s("leftUpperArm") && !p("leftUpperArm") ? (
        <PlacedPartRect
          dataSlot="leftUpperArmSlot"
          slot={s("leftUpperArm")!}
          intensity="rest"
          vw={vw}
          vh={vh}
        />
      ) : null}
      {s("rightUpperArm") && !p("rightUpperArm") ? (
        <PlacedPartRect
          dataSlot="rightUpperArmSlot"
          slot={s("rightUpperArm")!}
          intensity="rest"
          vw={vw}
          vh={vh}
        />
      ) : null}
      {s("leftForearm") && !p("leftForearm") ? (
        <PlacedPartRect
          dataSlot="leftForearmSlot"
          slot={s("leftForearm")!}
          intensity="rest"
          vw={vw}
          vh={vh}
        />
      ) : null}
      {s("rightForearm") && !p("rightForearm") ? (
        <PlacedPartRect
          dataSlot="rightForearmSlot"
          slot={s("rightForearm")!}
          intensity="rest"
          vw={vw}
          vh={vh}
        />
      ) : null}

      {!hideAuxiliaryGuides && !p("head")
        ? (() => {
            const st = strokeFor("rest");
            return (
              <motion.div
                data-slot="neckSlot"
                className="absolute box-border rounded-sm"
                style={{
                  left: `${(neck.cx / vw) * 100}%`,
                  top: `${(neck.cy / vh) * 100}%`,
                  width: `${(neck.w / vw) * 100}%`,
                  height: `${(neck.h / vh) * 100}%`,
                  borderWidth: st.w * 0.9,
                  borderStyle: "dashed",
                  borderColor: st.c,
                  transform: "translate(-50%, -50%)",
                }}
                initial={false}
                transition={{ duration: 0.2 }}
              />
            );
          })()
        : null}

      {!p("head") ? (
        <PlacedPartRect
          dataSlot="headSlot"
          slot={head}
          intensity="rest"
          vw={vw}
          vh={vh}
        />
      ) : null}

      {!hideAuxiliaryGuides ? (
        <div data-slot="jointPoints" className="contents">
          {visibleJoints.map((j) => (
            <JointPoint
              key={j.id}
              j={j}
              intensity="rest"
              vw={vw}
              vh={vh}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
