import { getSceneDecorImageUrl } from "../../data/scenePalette";
import { SCENE_DECOR_BASE_WIDTH } from "../../data/sceneRenderConfig";
import type { SceneElementType, SceneItem } from "../../types/scene";

/** 逻辑幕布上装饰的基准宽度（px），与 `item.transform.scale` 相乘。 */

const drawSceneItemVector = (ctx: CanvasRenderingContext2D, type: SceneElementType) => {
  ctx.fillStyle = "rgba(93, 56, 36, 0.75)";
  switch (type) {
    case "willow": {
      ctx.strokeStyle = "rgba(86, 50, 31, 0.82)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-20, -50);
      ctx.bezierCurveTo(-40, -90, 10, -120, 24, -160);
      ctx.stroke();
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * 10, -70);
        ctx.bezierCurveTo(i * 16, -96, i * 26, -132, i * 20, -170);
        ctx.stroke();
      }
      break;
    }
    case "pavilion": {
      ctx.fillStyle = "rgba(90, 51, 31, 0.84)";
      ctx.beginPath();
      ctx.moveTo(-100, -20);
      ctx.lineTo(0, -92);
      ctx.lineTo(100, -20);
      ctx.lineTo(78, 4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-62, 0, 124, 14, 6);
      ctx.fill();
      break;
    }
    case "bridge": {
      ctx.strokeStyle = "rgba(90, 51, 31, 0.86)";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.ellipse(0, 0, 90, 52, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-90, 0);
      ctx.lineTo(-90, -20);
      ctx.moveTo(90, 0);
      ctx.lineTo(90, -20);
      ctx.moveTo(-36, -30);
      ctx.lineTo(36, -30);
      ctx.stroke();
      break;
    }
    case "bamboo": {
      ctx.strokeStyle = "rgba(90, 51, 31, 0.86)";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(-12, 30);
      ctx.lineTo(-4, -110);
      ctx.moveTo(8, 30);
      ctx.lineTo(16, -120);
      ctx.moveTo(28, 30);
      ctx.lineTo(34, -96);
      ctx.stroke();
      ctx.lineWidth = 4;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-4, -30 - i * 18);
        ctx.lineTo(-38, -52 - i * 24);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(12, -36 - i * 18);
        ctx.lineTo(40, -56 - i * 18);
        ctx.stroke();
      }
      break;
    }
  }
};

/**
 * `imageCache`：key 为 `getSceneDecorImageUrl(type)`，与幕上、场景页共用；未命中或图未加载时回退矢量。
 */
export const drawScene2d = (
  ctx: CanvasRenderingContext2D,
  items: SceneItem[],
  imageCache?: ReadonlyMap<string, HTMLImageElement>,
  baseWidth = SCENE_DECOR_BASE_WIDTH,
) => {
  items
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)
    .forEach((item) => {
      ctx.save();
      ctx.translate(item.transform.x, item.transform.y);
      ctx.rotate(item.transform.rotation);
      const url = getSceneDecorImageUrl(item.type);
      const img = imageCache?.get(url);
      if (img?.complete && img.naturalWidth > 0) {
        const s = item.transform.scale;
        const w = baseWidth * s;
        const h = (w / img.naturalWidth) * img.naturalHeight;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else {
        ctx.scale(item.transform.scale, item.transform.scale);
        drawSceneItemVector(ctx, item.type);
      }
      ctx.restore();
    });
};
