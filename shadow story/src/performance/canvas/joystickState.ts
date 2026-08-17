import { clamp } from "./mathUtils";

export interface DiskJoystickMutable {
  kind: "disk";
  x: number;
  y: number;
  active: boolean;
  pointerId: number | null;
}

export interface RingJoystickMutable {
  kind: "ring";
  x: number;
  y: number;
  accumulatedAngle: number;
  lastRawAngle: number;
  active: boolean;
  pointerId: number | null;
  isRing: true;
  startAtBottom: boolean;
  limitRad: number;
}

export const createDiskJoystick = (): DiskJoystickMutable => ({
  kind: "disk",
  x: 0,
  y: 0,
  active: false,
  pointerId: null,
});

export const createRingJoystick = (startAtBottom: boolean): RingJoystickMutable => ({
  kind: "ring",
  x: 0,
  y: startAtBottom ? 1 : -1,
  accumulatedAngle: 0,
  lastRawAngle: 0,
  active: false,
  pointerId: null,
  isRing: true,
  startAtBottom,
  limitRad: startAtBottom ? Math.PI * 0.85 : Math.PI * 0.98,
});

export const diskPointerDown = (
  s: DiskJoystickMutable,
  clientX: number,
  clientY: number,
  rect: DOMRect,
  pointerId: number,
): boolean => {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return false;
  s.active = true;
  s.pointerId = pointerId;
  diskUpdatePosition(s, clientX, clientY, rect);
  return true;
};

export const diskUpdatePosition = (s: DiskJoystickMutable, clientX: number, clientY: number, rect: DOMRect) => {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  let dx = clientX - centerX;
  let dy = clientY - centerY;
  const maxRadius = rect.width / 2;
  const distance = Math.hypot(dx, dy);
  if (distance > maxRadius) {
    dx = (dx * maxRadius) / distance;
    dy = (dy * maxRadius) / distance;
  }
  s.x = dx / maxRadius;
  s.y = dy / maxRadius;
};

export const ringPointerDown = (
  s: RingJoystickMutable,
  clientX: number,
  clientY: number,
  rect: DOMRect,
  pointerId: number,
): boolean => {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  const dist = Math.hypot(dx, dy);
  if (dist < (rect.width / 2) * 0.45) return false;
  s.active = true;
  s.pointerId = pointerId;
  s.lastRawAngle = s.startAtBottom ? Math.atan2(dx, dy) : Math.atan2(dx, -dy);
  ringUpdatePosition(s, clientX, clientY, rect);
  return true;
};

export const ringUpdatePosition = (
  s: RingJoystickMutable,
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { atLimit: boolean } => {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  const raw = s.startAtBottom ? Math.atan2(dx, dy) : Math.atan2(dx, -dy);
  const PI = Math.PI;
  const TWO_PI = 2 * PI;
  const diff = ((raw - s.lastRawAngle + 3 * PI) % TWO_PI) - PI;
  s.accumulatedAngle += diff;
  s.lastRawAngle = raw;

  let atLimit = false;
  if (s.accumulatedAngle >= s.limitRad) {
    s.accumulatedAngle = s.limitRad;
    atLimit = true;
  } else if (s.accumulatedAngle <= -s.limitRad) {
    s.accumulatedAngle = -s.limitRad;
    atLimit = true;
  }

  s.x = Math.sin(s.accumulatedAngle);
  s.y = s.startAtBottom ? Math.cos(s.accumulatedAngle) : -Math.cos(s.accumulatedAngle);
  return { atLimit };
};

export const pointerUp = (s: DiskJoystickMutable | RingJoystickMutable, pointerId: number) => {
  if (!s.active || s.pointerId !== pointerId) return;
  s.active = false;
  s.pointerId = null;
};

export const getAngleDeg = (s: RingJoystickMutable) => s.accumulatedAngle * (180 / Math.PI);

export const knobOffsetPx = (
  s: DiskJoystickMutable | RingJoystickMutable,
  rect: DOMRect,
  knobSize: number,
) => {
  const maxRadius = rect.width / 2 - knobSize / 2;
  return { x: s.x * maxRadius, y: s.y * maxRadius };
};

/** Knob is absolutely centered on the control (`left:50%; top:50%`). */
export const applyKnobStyle = (
  knobEl: HTMLElement | null,
  s: DiskJoystickMutable | RingJoystickMutable,
  controlDiameterCssPx: number,
  knobDiameterCssPx: number,
) => {
  if (!knobEl) return;
  const maxRadius = controlDiameterCssPx / 2 - knobDiameterCssPx / 2;
  const ox = s.x * maxRadius;
  const oy = s.y * maxRadius;
  knobEl.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
};
