import type { PuppetPartId } from "./puppet";

/**
 * 幕上三杆与拼接完成时预览的杆一致：颈杆、后手杆、前手杆（与 drawPuppet2d 中后臂/前臂杆对应）。
 */
export type PuppetRodSkinId = "neck" | "rearHand" | "frontHand";

/**
 * 当前角色皮影外观：拼接散落件 + 幕上表演共用同一套 URL，之后上传/替换一处即可两处同步。
 */
export interface PuppetSkinBundle {
  partImages: Partial<Record<PuppetPartId, string>>;
  rodImages: Partial<Record<PuppetRodSkinId, string>>;
  /** 完整皮影参考图（装配调试底图，可与散件来自同一套素材） */
  fullReferenceUrl?: string;
}

export const emptyPuppetSkinBundle = (): PuppetSkinBundle => ({
  partImages: {},
  rodImages: {},
  fullReferenceUrl: undefined,
});
