export const themeConfig = {
  frame: {
    wood: "#5b2f1f",
    woodDark: "#34170f",
    parchment: "#ead5b5",
    paper: "#f4e7cf",
    border: "#a26a3c",
    accent: "#c38a4c",
    danger: "#9f342c",
  },
  puppet: {
    primary: "#8d2b24",
    accent: "#e1be7d",
    outline: "#2f1812",
    joint: "#eac98f",
  },
  scene: {
    ink: "#563223",
    muted: "#8f694f",
  },
} as const;

export const logicalStage = {
  width: 1280,
  height: 720,
};

/**
 * 幕上表演在 `drawPuppet2d` 中的额外视缩放（与内部 1.2 基准相乘）。
 * 略大于 1 使人偶在幕布中更饱满、头饰与三杆易完整入画。
 */
export const performancePuppetViewScale = 1.06;

/**
 * 幕上根位水平微调（逻辑 px，与 `logicalStage` 同坐标系），正数向右。
 * 人偶以髋部为锚，全身贴图视觉重心常偏左，略右移可更接近幕布水平居中。
 */
export const performancePuppetBaseOffsetX = 80;
