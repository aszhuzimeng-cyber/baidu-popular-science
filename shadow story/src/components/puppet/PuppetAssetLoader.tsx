import { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import type { PuppetPartId } from "../../types/puppet";
import type { PuppetRodSkinId } from "../../types/puppetSkin";

type CharacterId = string;
type CharacterSkinPatch = {
  parts: Partial<Record<PuppetPartId, string>>;
  rods: Partial<Record<PuppetRodSkinId, string>>;
  fullReferenceUrl: string;
};

const PUBLIC_ROLE_ASSETS: Record<CharacterId, CharacterSkinPatch> = {
  "role-1": {
    fullReferenceUrl: "/assets/images/characters/role-1-full.png",
    parts: {
      head: "/assets/images/characters/role-1-head.png",
      torso: "/assets/images/characters/role-1-torso.png",
      pelvis: "/assets/images/characters/role-1-pelvis.png",
      leftUpperArm: "/assets/images/characters/role-1-back-upper-arm.png",
      leftForearm: "/assets/images/characters/role-1-back-forearm.png",
      rightUpperArm: "/assets/images/characters/role-1-front-upper-arm.png",
      rightForearm: "/assets/images/characters/role-1-front-forearm.png",
      leftLeg: "/assets/images/characters/role-1-left-leg.png",
      rightLeg: "/assets/images/characters/role-1-right-leg.png",
    },
    rods: {},
  },
  "role-2": {
    fullReferenceUrl: "/assets/images/characters/role-2-full.png",
    parts: {
      head: "/assets/images/characters/role-2-head.png",
      torso: "/assets/images/characters/role-2-torso.png",
      pelvis: "/assets/images/characters/role-2-pelvis.png",
      leftUpperArm: "/assets/images/characters/role-2-back-upper-arm.png",
      leftForearm: "/assets/images/characters/role-2-back-forearm.png",
      rightUpperArm: "/assets/images/characters/role-2-front-upper-arm.png",
      rightForearm: "/assets/images/characters/role-2-front-forearm.png",
      leftLeg: "/assets/images/characters/role-2-left-leg.png",
      rightLeg: "/assets/images/characters/role-2-right-leg.png",
    },
    rods: {},
  },
  "role-3": {
    fullReferenceUrl: "/assets/images/characters/role-3-full.png",
    parts: {
      head: "/assets/images/characters/role-3-head.png",
      torso: "/assets/images/characters/role-3-torso.png",
      pelvis: "/assets/images/characters/role-3-pelvis.png",
      leftUpperArm: "/assets/images/characters/role-3-back-upper-arm.png",
      leftForearm: "/assets/images/characters/role-3-back-forearm.png",
      rightUpperArm: "/assets/images/characters/role-3-front-upper-arm.png",
      rightForearm: "/assets/images/characters/role-3-front-forearm.png",
      leftLeg: "/assets/images/characters/role-3-left-leg.png",
      rightLeg: "/assets/images/characters/role-3-right-leg.png",
    },
    rods: {},
  },
  "role-4": {
    fullReferenceUrl: "/assets/images/characters/role-4-full.png",
    parts: {
      head: "/assets/images/characters/role-4-head.png",
      torso: "/assets/images/characters/role-4-torso.png",
      pelvis: "/assets/images/characters/role-4-pelvis.png",
      leftUpperArm: "/assets/images/characters/role-4-back-upper-arm.png",
      leftForearm: "/assets/images/characters/role-4-back-forearm.png",
      rightUpperArm: "/assets/images/characters/role-4-front-upper-arm.png",
      rightForearm: "/assets/images/characters/role-4-front-forearm.png",
      leftLeg: "/assets/images/characters/role-4-left-leg.png",
      rightLeg: "/assets/images/characters/role-4-right-leg.png",
    },
    rods: {},
  },
};

export function PuppetAssetLoader() {
  useEffect(() => {
    const { setPuppetPartImageUrl, setPuppetRodImageUrl, setPuppetReferenceImageUrl } = useAppStore.getState();

    Object.entries(PUBLIC_ROLE_ASSETS).forEach(([characterId, skin]) => {
      setPuppetReferenceImageUrl(characterId, skin.fullReferenceUrl);
      Object.entries(skin.parts).forEach(([partId, url]) => {
        setPuppetPartImageUrl(characterId, partId as PuppetPartId, url ?? null);
      });
      Object.entries(skin.rods).forEach(([rodId, url]) => {
        setPuppetRodImageUrl(characterId, rodId as PuppetRodSkinId, url ?? null);
      });
    });
  }, []);

  return null;
}
