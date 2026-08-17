import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "../store/useAppStore";

export const useSceneTransform = () => {
  const {
    selectedSceneItemId,
    sceneItems,
    updateSceneItem,
    selectSceneItem,
    removeSceneItem,
  } = useAppStore(useShallow((state) => ({
    selectedSceneItemId: state.selectedSceneItemId,
    sceneItems: state.sceneItems,
    updateSceneItem: state.updateSceneItem,
    selectSceneItem: state.selectSceneItem,
    removeSceneItem: state.removeSceneItem,
  })));

  const selectedItem = useMemo(
    () => sceneItems.find((item) => item.id === selectedSceneItemId) ?? null,
    [sceneItems, selectedSceneItemId],
  );

  return {
    selectedItem,
    selectSceneItem,
    updateSceneItem,
    removeSceneItem,
  };
};
