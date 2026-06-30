import { adventureItemDefinitions, getAdventureItem } from '../loot';
import type { AdventureInventory } from '../inventory/types';
import type { AdventureState } from '../state';
import type { CraftableItemSummary, CraftingIngredientSelection, CraftingMaterialCategory, CraftingRecipeCategoryRequirement, CraftingRecipeEntry } from './types';

// Selectors

export function getMaterialCount(inventory: Pick<AdventureInventory, 'materials'>, materialId: string) {
  return inventory.materials.find((stack) => stack.itemId === materialId)?.count ?? 0;
}

export function getCraftableItems(inventory: AdventureInventory): CraftableItemSummary[] {
  return adventureItemDefinitions
    .filter((item) => item.recipe?.length)
    .map((item) => {
      const recipe = item.recipe ?? [];
      const selections = getDefaultIngredientSelections(inventory, recipe);
      const missing = getMissingMaterials(inventory, recipe, selections);
      const quality = calculateCraftingQuality(inventory, recipe, selections);
      return {
        itemId: item.id,
        name: item.name,
        rank: item.rank,
        recipe,
        craftable: missing.length === 0,
        missing,
        quality,
        outputItemId: getCraftingOutputItemId(item.id, quality),
      };
    });
}

export function canCraftItem(inventory: AdventureInventory, itemId: string, selections: CraftingIngredientSelection[] = []) {
  const item = getAdventureItem(itemId);
  const recipe = item.recipe ?? [];
  return Boolean(recipe.length) && getMissingMaterials(inventory, recipe, getResolvedSelections(inventory, recipe, selections)).length === 0;
}

export function getMissingMaterials(
  inventory: AdventureInventory,
  recipe: CraftingRecipeEntry[],
  selections: CraftingIngredientSelection[] = [],
) {
  const resolved = getResolvedSelections(inventory, recipe, selections);
  const requiredByItemNo = getRequiredCountsByItemNo(recipe, resolved);
  return recipe.filter((entry) => {
    if (entry.kind === 'item') return getMaterialCount(inventory, entry.materialId) < entry.count;
    const selected = getSelectedMaterialStack(inventory, entry, resolved);
    if (!selected) return true;
    const required = requiredByItemNo.get(selected.itemNo) ?? entry.count;
    return selected.count < required || !doesMaterialMeetRequirement(selected, entry);
  });
}

// Operations

export function craftAdventureItem(state: AdventureState, itemId: string, selections: CraftingIngredientSelection[] = []): AdventureState {
  const item = getAdventureItem(itemId);
  const recipe = item.recipe ?? [];
  const resolved = getResolvedSelections(state.inventory, recipe, selections);
  if (!recipe.length || !canCraftItem(state.inventory, itemId, resolved)) return state;
  const quality = calculateCraftingQuality(state.inventory, recipe, resolved);
  const outputItemId = getCraftingOutputItemId(itemId, quality);
  const output = getAdventureItem(outputItemId);
  const inventory = consumeMaterials(state.inventory, recipe, resolved);
  return {
    ...state,
    inventory: {
      ...inventory,
      potions: output.kind === 'potion' ? addPotionLikeStack(inventory.potions, output.id) : inventory.potions,
      materials: output.kind === 'material' || output.kind === 'rune'
        ? addMaterialLikeStack(inventory.materials, output.id)
        : inventory.materials,
    },
  };
}

export function getDefaultIngredientSelections(inventory: AdventureInventory, recipe: CraftingRecipeEntry[]): CraftingIngredientSelection[] {
  return recipe
    .filter((entry): entry is CraftingRecipeCategoryRequirement => entry.kind === 'category')
    .map((entry) => {
      const candidate = getMaterialCandidatesForRequirement(inventory, entry)[0];
      return candidate ? { requirementId: entry.id, itemNo: candidate.itemNo } : undefined;
    })
    .filter((selection): selection is CraftingIngredientSelection => selection !== undefined);
}

export function getMaterialCandidatesForRequirement(inventory: AdventureInventory, requirement: CraftingRecipeCategoryRequirement) {
  return inventory.materials
    .filter((material) => doesMaterialMeetRequirement(material, requirement))
    .sort((a, b) => rankScore(b.rank) - rankScore(a.rank) || a.name.localeCompare(b.name));
}

export function calculateCraftingQuality(
  inventory: AdventureInventory,
  recipe: CraftingRecipeEntry[],
  selections: CraftingIngredientSelection[] = [],
) {
  const resolved = getResolvedSelections(inventory, recipe, selections);
  let weightedScore = 0;
  let weightTotal = 0;
  for (const entry of recipe) {
    const weight = entry.qualityWeight ?? 1;
    if (weight <= 0) continue;
    const material = entry.kind === 'item'
      ? getAdventureItem(entry.materialId)
      : getSelectedMaterialStack(inventory, entry, resolved);
    if (!material) continue;
    weightedScore += rankScore(material.rank) * weight;
    weightTotal += weight;
  }
  return weightTotal > 0 ? weightedScore / weightTotal : 0;
}

export function getCraftingOutputItemId(itemId: string, quality: number) {
  const item = getAdventureItem(itemId);
  const outcomes = item.recipeOutcomes ?? [{ itemId, minQuality: 0 }];
  return [...outcomes]
    .sort((a, b) => b.minQuality - a.minQuality)
    .find((outcome) => quality >= outcome.minQuality)?.itemId ?? itemId;
}

export function rankScore(rank: ReturnType<typeof getAdventureItem>['rank']) {
  if (rank === 'D') return 1;
  if (rank === 'C') return 2;
  if (rank === 'B') return 3;
  if (rank === 'A') return 4;
  if (rank === 'S') return 5;
  return 6;
}

function consumeMaterials(
  inventory: AdventureInventory,
  recipe: CraftingRecipeEntry[],
  selections: CraftingIngredientSelection[],
): AdventureInventory {
  const requiredByItemId = new Map<string, number>();
  const requiredByItemNo = getRequiredCountsByItemNo(recipe, selections);
  for (const entry of recipe) {
    if (entry.kind !== 'item') continue;
    requiredByItemId.set(entry.materialId, (requiredByItemId.get(entry.materialId) ?? 0) + entry.count);
  }
  return {
    ...inventory,
    materials: inventory.materials
      .map((stack) => {
        const cost = (requiredByItemId.get(stack.itemId) ?? 0) + (requiredByItemNo.get(stack.itemNo) ?? 0);
        return cost > 0 ? { ...stack, count: stack.count - cost } : stack;
      })
      .filter((stack) => stack.count > 0),
  };
}

function getResolvedSelections(
  inventory: AdventureInventory,
  recipe: CraftingRecipeEntry[],
  selections: CraftingIngredientSelection[],
) {
  const defaults = getDefaultIngredientSelections(inventory, recipe);
  return recipe
    .filter((entry): entry is CraftingRecipeCategoryRequirement => entry.kind === 'category')
    .map((entry) => {
      const explicit = selections.find((selection) => selection.requirementId === entry.id);
      const fallback = defaults.find((selection) => selection.requirementId === entry.id);
      return explicit ?? fallback;
    })
    .filter((selection): selection is CraftingIngredientSelection => selection !== undefined);
}

function getRequiredCountsByItemNo(recipe: CraftingRecipeEntry[], selections: CraftingIngredientSelection[]) {
  const required = new Map<number, number>();
  for (const entry of recipe) {
    if (entry.kind !== 'category') continue;
    const selection = selections.find((candidate) => candidate.requirementId === entry.id);
    if (!selection) continue;
    required.set(selection.itemNo, (required.get(selection.itemNo) ?? 0) + entry.count);
  }
  return required;
}

function getSelectedMaterialStack(
  inventory: AdventureInventory,
  requirement: CraftingRecipeCategoryRequirement,
  selections: CraftingIngredientSelection[],
) {
  const selection = selections.find((candidate) => candidate.requirementId === requirement.id);
  const stack = selection ? inventory.materials.find((material) => material.itemNo === selection.itemNo) : undefined;
  return stack && doesMaterialMeetRequirement(stack, requirement) ? stack : undefined;
}

function doesMaterialMeetRequirement(
  material: { category: CraftingMaterialCategory; rank: ReturnType<typeof getAdventureItem>['rank'] },
  requirement: CraftingRecipeCategoryRequirement,
) {
  return material.category === requirement.category
    && (requirement.minRank === undefined || rankScore(material.rank) >= rankScore(requirement.minRank));
}

function addPotionLikeStack(potions: AdventureInventory['potions'], itemId: string) {
  const item = getAdventureItem(itemId);
  const existing = potions.find((stack) => stack.itemId === itemId);
  if (existing) return potions.map((stack) => stack.itemId === itemId ? { ...stack, count: stack.count + 1 } : stack);
  return [...potions, {
    itemNo: Math.max(200, ...potions.map((stack) => stack.itemNo)) + 1,
    itemId,
    name: item.name,
    icon: item.icon,
    iconSprite: item.iconSprite,
    rank: item.rank,
    count: 1,
    heal: item.kind === 'potion' ? item.heal : 0,
    cooldownMs: item.kind === 'potion' ? item.cooldownMs : 0,
  }];
}

function addMaterialLikeStack(materials: AdventureInventory['materials'], itemId: string) {
  const item = getAdventureItem(itemId);
  const existing = materials.find((stack) => stack.itemId === itemId);
  if (existing) return materials.map((stack) => stack.itemId === itemId ? { ...stack, count: stack.count + 1 } : stack);
  return [...materials, {
    itemNo: Math.max(300, ...materials.map((stack) => stack.itemNo)) + 1,
    itemId,
    name: item.name,
    icon: item.icon,
    iconSprite: item.iconSprite,
    rank: item.rank,
    count: 1,
    category: item.kind === 'material' ? item.category : 'mineral',
  }];
}
