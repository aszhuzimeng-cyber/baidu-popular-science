import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useShallow } from "zustand/react/shallow";
import { drawPuppet2d } from "../../performance/canvas/drawPuppet2d";
import { createHtmlPuppet } from "../../performance/canvas/puppetState";
import { useAppStore } from "../../store/useAppStore";
import type { PuppetPartId } from "../../types/puppet";
import { emptyPuppetSkinBundle, type PuppetSkinBundle } from "../../types/puppetSkin";

interface AssemblyPartVisualProps {
  partId: PuppetPartId;
  label: string;
  src?: string | null;
  className?: string;
  style?: CSSProperties;
  /** 最外层：尺寸、cursor、边框等（贴图时作裁切框） */
  frameClassName: string;
  /** 拼接托盘：不拉伸贴图、无裁切感，等比适配容器 */
  trayMode?: boolean;
  /** 托盘内散件外框尺寸（与 store 中 scale 一致）；有则命中区紧贴该框，不额外撑满父级 */
  trayFitSize?: { w: number; h: number };
}

/** 头部凤冠较高，略加大离屏避免缩略时裁切 */
const offscreenSizeForPart = (partId: PuppetPartId) => (partId === "head" ? 800 : 520);
const SPRITE_PADDING = 10;
const collectSkinUrls = (skin: PuppetSkinBundle) =>
  [...Object.values(skin.partImages), ...Object.values(skin.rodImages)].filter((u): u is string => Boolean(u));

/** 拼接盘：有 URL 用贴图；否则用与幕上表演一致的皮影占位 */
export function AssemblyPartVisual({
  partId,
  label,
  src,
  className = "",
  style,
  frameClassName,
  trayMode = false,
  trayFitSize,
}: AssemblyPartVisualProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cacheRef = useRef(new Map<string, HTMLImageElement>());
  const emptyBundle = useMemo(() => emptyPuppetSkinBundle(), []);
  const [skinDecodeEpoch, setSkinDecodeEpoch] = useState(0);

  const { selectedCharacterId, puppetSkinByCharacterId } = useAppStore(
    useShallow((s) => ({
      selectedCharacterId: s.selectedCharacterId,
      puppetSkinByCharacterId: s.puppetSkinByCharacterId,
    })),
  );
  const activeSkin = puppetSkinByCharacterId[selectedCharacterId] ?? emptyBundle;
  const skinUrlsKey = collectSkinUrls(activeSkin).sort().join("|");

  useEffect(() => {
    const cache = cacheRef.current;
    collectSkinUrls(activeSkin).forEach((url) => {
      if (cache.has(url)) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        cache.set(url, img);
        setSkinDecodeEpoch((n) => n + 1);
      };
      img.onerror = () => cache.delete(url);
      img.src = url;
    });
  }, [activeSkin, skinUrlsKey]);

  useEffect(() => {
    if (src) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const paint = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w < 12 || h < 12) return;

      const os = offscreenSizeForPart(partId);
      const puppetY = os / 2 + 28;
      const offscreen = document.createElement("canvas");
      offscreen.width = os;
      offscreen.height = os;
      const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return;
      offCtx.clearRect(0, 0, os, os);
      offCtx.imageSmoothingEnabled = true;
      offCtx.imageSmoothingQuality = "high";
      const puppet = createHtmlPuppet(os, os);
      puppet.x = os / 2;
      puppet.y = puppetY;
      puppet.baseX = puppet.x;
      puppet.baseY = puppet.y;
      drawPuppet2d(offCtx, puppet, 1, activeSkin, cacheRef.current, 1, partId);

      const imageData = offCtx.getImageData(0, 0, os, os).data;
      let minX = os;
      let minY = os;
      let maxX = 0;
      let maxY = 0;
      for (let y = 0; y < os; y += 1) {
        for (let x = 0; x < os; x += 1) {
          const a = imageData[(y * os + x) * 4 + 3];
          if (a < 8) continue;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
      if (maxX <= minX || maxY <= minY) return;

      const cropX = Math.max(0, minX - SPRITE_PADDING);
      const cropY = Math.max(0, minY - SPRITE_PADDING);
      const cropW = Math.min(os - cropX, maxX - minX + 1 + SPRITE_PADDING * 2);
      const cropH = Math.min(os - cropY, maxY - minY + 1 + SPRITE_PADDING * 2);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const scale = Math.min(w / cropW, h / cropH);
      const dw = cropW * scale;
      const dh = cropH * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(offscreen, cropX, cropY, cropW, cropH, dx, dy, dw, dh);
    };

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [activeSkin, partId, selectedCharacterId, skinDecodeEpoch, src]);

  if (src) {
    if (trayMode) {
      const box = trayFitSize;
      return (
        <div
          data-part={partId}
          style={style}
          className={["inline-block shrink-0", frameClassName, className].filter(Boolean).join(" ")}
        >
          <img
            src={src}
            alt={label}
            className="pointer-events-none block select-none"
            draggable={false}
            style={
              box
                ? {
                    width: box.w,
                    height: box.h,
                    objectFit: "contain",
                  }
                : { maxHeight: "100%", maxWidth: "100%", width: "auto", height: "auto", objectFit: "contain" }
            }
          />
        </div>
      );
    }
    return (
      <div
        data-part={partId}
        style={style}
        className={["relative overflow-hidden", frameClassName, className].filter(Boolean).join(" ")}
      >
        <img
          src={src}
          alt={label}
          className="pointer-events-none h-full w-full max-h-full max-w-full select-none object-contain"
          draggable={false}
          style={{ objectPosition: "center bottom" }}
        />
      </div>
    );
  }

  return (
    <div
      data-part={partId}
      ref={wrapRef}
      style={
        trayMode && trayFitSize
          ? { ...style, width: trayFitSize.w, height: trayFitSize.h }
          : style
      }
      className={[
        "relative overflow-hidden bg-transparent",
        trayMode && trayFitSize ? "inline-block shrink-0" : "",
        frameClassName,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <canvas ref={canvasRef} className="block h-full w-full" aria-label={label} />
    </div>
  );
}
