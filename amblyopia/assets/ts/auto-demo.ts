import type { VisionMode } from './params.js';

export interface AutoDemoDeps {
  setMode: (mode: VisionMode) => void | Promise<void>;
  setTime: (t: number) => void;
  getModeButton: (mode: VisionMode) => HTMLElement | null;
  getTimeSlider: () => HTMLInputElement;
  onActiveChange: (active: boolean) => void;
  onDemoStart?: () => void | Promise<void>;
}

const DEMO_MODES: VisionMode[] = ['normal', 'blur', 'misalignment', 'occlusion'];
const MODE_DWELL_MS = 600;
const NARRATION_TAIL_MS = 380;
const TIME_SWEEP_MS = 5800;
const TERMINAL_DWELL_MS = 5_000;
const CURSOR_MOVE_MS = 950;
const CLICK_MS = 220;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function elementCenter(el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function sliderThumbAt(slider: HTMLInputElement, t: number): { x: number; y: number } {
  const r = slider.getBoundingClientRect();
  return { x: r.left + r.width * t, y: r.top + r.height / 2 };
}

export function createAutoDemo(deps: AutoDemoDeps) {
  let active = false;
  let cursorEl: HTMLDivElement | null = null;
  let generation = 0;

  function ensureCursor(): HTMLDivElement {
    if (cursorEl) return cursorEl;
    cursorEl = document.createElement('div');
    cursorEl.className = 'auto-demo-cursor';
    cursorEl.setAttribute('aria-hidden', 'true');
    cursorEl.innerHTML = '<span class="auto-demo-cursor-hand" aria-hidden="true"></span>';
    document.body.appendChild(cursorEl);
    return cursorEl;
  }

  function hideCursor(): void {
    if (!cursorEl) return;
    cursorEl.classList.remove('visible', 'clicking');
    cursorEl.hidden = true;
  }

  function placeCursor(x: number, y: number): void {
    const el = ensureCursor();
    el.hidden = false;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  function showCursor(): void {
    ensureCursor().classList.add('visible');
  }

  function isCancelled(gen: number): boolean {
    return !active || gen !== generation;
  }

  function wait(ms: number, gen: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = performance.now();
      const step = (now: number) => {
        if (isCancelled(gen)) {
          reject(new Error('cancelled'));
          return;
        }
        if (now - start >= ms) {
          resolve();
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  function animateCursorTo(x: number, y: number, duration: number, gen: number): Promise<void> {
    const el = ensureCursor();
    const startX = parseFloat(el.style.left) || x;
    const startY = parseFloat(el.style.top) || y;
    const start = performance.now();

    return new Promise((resolve, reject) => {
      const step = (now: number) => {
        if (isCancelled(gen)) {
          reject(new Error('cancelled'));
          return;
        }
        const p = Math.min(1, (now - start) / duration);
        const e = easeInOut(p);
        el.style.left = `${startX + (x - startX) * e}px`;
        el.style.top = `${startY + (y - startY) * e}px`;
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  async function clickPulse(gen: number): Promise<void> {
    const el = ensureCursor();
    el.classList.add('clicking');
    try {
      await wait(CLICK_MS, gen);
    } catch {
      el.classList.remove('clicking');
      throw new Error('cancelled');
    }
    el.classList.remove('clicking');
  }

  function sweepTime(gen: number): Promise<void> {
    const slider = deps.getTimeSlider();
    const start = performance.now();
    deps.setTime(0);
    const origin = sliderThumbAt(slider, 0);
    placeCursor(origin.x, origin.y);
    showCursor();

    return new Promise((resolve, reject) => {
      const step = (now: number) => {
        if (isCancelled(gen)) {
          reject(new Error('cancelled'));
          return;
        }
        const p = Math.min(1, (now - start) / TIME_SWEEP_MS);
        const e = easeInOut(p);
        deps.setTime(e);
        const pos = sliderThumbAt(slider, e);
        if (cursorEl) {
          cursorEl.style.left = `${pos.x}px`;
          cursorEl.style.top = `${pos.y}px`;
        }
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  async function playSegment(mode: VisionMode, gen: number): Promise<void> {
    const btn = deps.getModeButton(mode);
    if (!btn) return;

    const center = elementCenter(btn);
    await animateCursorTo(center.x, center.y, CURSOR_MOVE_MS, gen);
    await clickPulse(gen);
    const narration = Promise.resolve(deps.setMode(mode));

    if (mode === 'normal') {
      await narration;
      await wait(NARRATION_TAIL_MS, gen);
      await wait(MODE_DWELL_MS, gen);
      await sweepTime(gen);
    } else {
      await wait(NARRATION_TAIL_MS, gen);
      await wait(MODE_DWELL_MS, gen);
      await Promise.all([narration, sweepTime(gen)]);
    }
    await wait(TERMINAL_DWELL_MS, gen);
  }

  async function runLoop(gen: number): Promise<void> {
    while (!isCancelled(gen)) {
      for (const mode of DEMO_MODES) {
        if (isCancelled(gen)) return;
        try {
          await playSegment(mode, gen);
        } catch {
          return;
        }
      }
    }
  }

  function stop(): void {
    if (!active) return;
    active = false;
    generation += 1;
    hideCursor();
    document.body.classList.remove('auto-demo-playing');
    deps.onActiveChange(false);
  }

  function start(): void {
    if (active) return;
    active = true;
    const gen = ++generation;
    document.body.classList.add('auto-demo-playing');
    deps.onActiveChange(true);
    void beginDemo(gen);
  }

  async function beginDemo(gen: number): Promise<void> {
    try {
      await deps.onDemoStart?.();
    } catch {
      return;
    }
    if (isCancelled(gen)) return;

    const slider = deps.getTimeSlider();
    const firstBtn = deps.getModeButton('normal');
    const origin = firstBtn ? elementCenter(firstBtn) : sliderThumbAt(slider, 0);
    placeCursor(origin.x, origin.y);
    showCursor();

    try {
      await runLoop(gen);
    } catch {
      return;
    }
  }

  return {
    start,
    stop,
    isActive: () => active,
  };
}
