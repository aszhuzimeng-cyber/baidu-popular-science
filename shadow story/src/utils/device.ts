export const isPortraitOrientation = () => {
  if (typeof window === "undefined") return false;
  return window.innerHeight > window.innerWidth;
};

export const isMobileDevice = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const longSide = Math.max(window.innerWidth, window.innerHeight);
  const phoneByUserAgent =
    /iPhone|iPod|Windows Phone|Mobile/i.test(ua) ||
    (/Android/i.test(ua) && shortSide <= 600);
  const hasTouch = window.matchMedia?.("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const smallTouchScreen =
    hasTouch &&
    shortSide <= 620 &&
    longSide <= 1400;

  return phoneByUserAgent || smallTouchScreen;
};
