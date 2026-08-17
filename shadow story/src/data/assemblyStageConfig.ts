export const ASSEMBLY_STAGE_OFFSET_Y_RATIO = 0.04;

export const ASSEMBLY_STAGE_OFFSET_Y_RATIO_BY_CHARACTER: Partial<Record<string, number>> = {
  "role-1": 0.015,
  "role-3": 0.053,
  "role-4": 0.015,
};

export const ASSEMBLY_STAGE_CONTENT_SCALE = 0.96;
export const ASSEMBLY_STAGE_DESIGN_WIDTH = 1280;
export const ASSEMBLY_STAGE_DESIGN_HEIGHT = 720;
export const ASSEMBLY_WORK_STAGE_DESIGN_WIDTH = 520;
export const ASSEMBLY_WORK_STAGE_DESIGN_HEIGHT = 645;

export const ASSEMBLY_STAGE_CONTENT_SCALE_BY_CHARACTER: Partial<Record<string, number>> = {
  "role-3": 1,
};

export const getAssemblyStageOffsetYRatio = (characterId: string) =>
  ASSEMBLY_STAGE_OFFSET_Y_RATIO_BY_CHARACTER[characterId] ?? ASSEMBLY_STAGE_OFFSET_Y_RATIO;

export const getAssemblyStageBaseContentScale = (characterId: string) =>
  ASSEMBLY_STAGE_CONTENT_SCALE_BY_CHARACTER[characterId] ?? ASSEMBLY_STAGE_CONTENT_SCALE;

export const getAssemblyStageViewportScale = (width: number, height: number) => {
  const safeWidth = width > 4 ? width : ASSEMBLY_STAGE_DESIGN_WIDTH;
  const safeHeight = height > 4 ? height : ASSEMBLY_STAGE_DESIGN_HEIGHT;
  return Math.max(
    0.1,
    Math.min(safeWidth / ASSEMBLY_STAGE_DESIGN_WIDTH, safeHeight / ASSEMBLY_STAGE_DESIGN_HEIGHT),
  );
};

export const getAssemblyWorkStageViewportScale = (
  appWidth: number,
  appHeight: number,
  stageWidth: number,
  stageHeight: number,
) => {
  const appScale = getAssemblyStageViewportScale(appWidth, appHeight);
  const safeStageWidth = stageWidth > 4 ? stageWidth : ASSEMBLY_WORK_STAGE_DESIGN_WIDTH;
  const safeStageHeight = stageHeight > 4 ? stageHeight : ASSEMBLY_WORK_STAGE_DESIGN_HEIGHT;
  return Math.max(
    0.1,
    Math.min(
      appScale,
      safeStageWidth / ASSEMBLY_WORK_STAGE_DESIGN_WIDTH,
      safeStageHeight / ASSEMBLY_WORK_STAGE_DESIGN_HEIGHT,
    ),
  );
};

export const getAssemblyStageVisualScale = (characterId: string, width?: number, height?: number) =>
  getAssemblyStageBaseContentScale(characterId) *
  (width !== undefined && height !== undefined ? getAssemblyStageViewportScale(width, height) : 1);

export const getAssemblyWorkStageVisualScale = (
  characterId: string,
  appWidth: number,
  appHeight: number,
  stageWidth: number,
  stageHeight: number,
) =>
  getAssemblyStageBaseContentScale(characterId) *
  getAssemblyWorkStageViewportScale(appWidth, appHeight, stageWidth, stageHeight);
