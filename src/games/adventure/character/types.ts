export type AdventureCharacter = {
  body: string;
  color: string;
  pillWidth: number;
  leftWeaponInstanceId?: string;
  rightWeaponInstanceId?: string;
  outfitId: string;
};

export type OutfitDefinition = {
  id: string;
  name: string;
  glyph?: string;
  description: string;
  color: string;
  offsetX?: number;
  offsetY?: number;
  maxHpBonus?: number;
  speedBonus?: number;
  damageBonus?: number;
};
