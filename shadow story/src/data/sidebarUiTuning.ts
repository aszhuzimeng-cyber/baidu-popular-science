export type SidebarTuneConfig = {
  contentPaddingTopPct: number;
  itemGapPct: number;
  itemHeightPct: number;
  itemWidthPct: number;
  itemRadiusPx: number;
  itemTranslateXPct: number;
  itemTranslateYPct: number;
  imageBoxHeightPct: number;
  imageBoxWidthPct: number;
  imageScaleDefault: number;
  imageScaleRole2?: number;
  imageSizePct?: number;
  itemPaddingPct?: number;
};

export type SidebarTunePreset = {
  version: 1;
  puppet: SidebarTuneConfig;
  scene: SidebarTuneConfig;
};

export const SIDEBAR_TUNE_PRESET: SidebarTunePreset = {
  version: 1,
  puppet: {
    contentPaddingTopPct: 17.2,
    itemGapPct: 1.3,
    itemHeightPct: 22.8,
    itemWidthPct: 95.2,
    itemRadiusPx: 8,
    itemTranslateXPct: -1.5,
    itemTranslateYPct: 3.8,
    imageBoxHeightPct: 82,
    imageBoxWidthPct: 72.2,
    imageScaleDefault: 1.51,
    imageScaleRole2: 1.55,
  },
  scene: {
    contentPaddingTopPct: 17.2,
    itemGapPct: 1.3,
    itemHeightPct: 22.8,
    itemWidthPct: 95.1,
    itemRadiusPx: 8,
    itemPaddingPct: 0,
    itemTranslateXPct: -1.5,
    itemTranslateYPct: 3.8,
    imageBoxHeightPct: 82,
    imageBoxWidthPct: 72.2,
    imageScaleDefault: 0.98,
  },
};
