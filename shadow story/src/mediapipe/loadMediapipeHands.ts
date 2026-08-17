import type { Hands, LandmarkConnectionArray } from "@mediapipe/hands";
import type { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

const HANDS_VERSION = "0.4.1675469240";
const DRAWING_UTILS_VERSION = "0.3.1675466124";

export interface MediapipeHandsRuntime {
  Hands: typeof Hands;
  HAND_CONNECTIONS: LandmarkConnectionArray;
  drawConnectors: typeof drawConnectors;
  drawLandmarks: typeof drawLandmarks;
}

declare global {
  interface Window {
    Hands?: typeof Hands;
    HAND_CONNECTIONS?: LandmarkConnectionArray;
    drawConnectors?: typeof drawConnectors;
    drawLandmarks?: typeof drawLandmarks;
  }
}

let loadPromise: Promise<MediapipeHandsRuntime> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export function loadMediapipeHands(): Promise<MediapipeHandsRuntime> {
  if (!loadPromise) {
    loadPromise = (async () => {
      await loadScript(`https://cdn.jsdelivr.net/npm/@mediapipe/hands@${HANDS_VERSION}/hands.js`);
      await loadScript(
        `https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@${DRAWING_UTILS_VERSION}/drawing_utils.js`,
      );

      const { Hands: HandsCtor, HAND_CONNECTIONS, drawConnectors: drawConnectorsFn, drawLandmarks: drawLandmarksFn } =
        window;

      if (typeof HandsCtor !== "function" || !HAND_CONNECTIONS || !drawConnectorsFn || !drawLandmarksFn) {
        throw new Error("MediaPipe Hands runtime failed to initialize");
      }

      return {
        Hands: HandsCtor,
        HAND_CONNECTIONS,
        drawConnectors: drawConnectorsFn,
        drawLandmarks: drawLandmarksFn,
      };
    })();
  }

  return loadPromise;
}
