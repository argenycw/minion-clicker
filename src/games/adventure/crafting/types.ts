import type { ItemRank } from '../loot';

export type CraftingMaterialCategory =
  | 'junk'
  | 'food'
  | 'mineral'
  | 'wood'
  | 'stone'
  | 'gem'
  | 'leather'
  | 'cloth'
  | 'magical-product';

export type CraftingRecipeItemRequirement = {
  kind: 'item';
  id: string;
  materialId: string;
  count: number;
  qualityWeight?: number;
};

export type CraftingRecipeCategoryRequirement = {
  kind: 'category';
  id: string;
  category: CraftingMaterialCategory;
  count: number;
  minRank?: ItemRank;
  qualityWeight?: number;
};

export type CraftingRecipeEntry = CraftingRecipeItemRequirement | CraftingRecipeCategoryRequirement;

export type CraftingIngredientSelection = {
  requirementId: string;
  itemNo: number;
};

export type CraftingRecipeOutcome = {
  itemId: string;
  minQuality: number;
};

export type CraftableItemSummary = {
  itemId: string;
  name: string;
  rank: ItemRank;
  recipe: CraftingRecipeEntry[];
  craftable: boolean;
  missing: CraftingRecipeEntry[];
  quality: number;
  outputItemId: string;
};
