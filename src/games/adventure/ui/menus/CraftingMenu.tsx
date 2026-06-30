import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getAdventureItem, ITEM_RANK_BACKGROUNDS, ITEM_RANK_COLORS } from '../../loot';
import {
  calculateCraftingQuality,
  getCraftableItems,
  getCraftingOutputItemId,
  getDefaultIngredientSelections,
  getMaterialCandidatesForRequirement,
  getMaterialCount,
  getMissingMaterials,
  rankScore,
} from '../../crafting/system';
import type { CraftingIngredientSelection } from '../../crafting/types';
import type { AdventureState } from '../../state';
import { ItemIcon } from './ItemIcon';

export function CraftingMenu({
  state,
  selectedItemId,
  onSelectItem,
  onCraft,
  onClose,
}: {
  state: AdventureState;
  selectedItemId: string | undefined;
  onSelectItem: (itemId: string) => void;
  onCraft: (itemId: string, selections?: CraftingIngredientSelection[]) => void;
  onClose: () => void;
}) {
  const recipes = getCraftableItems(state.inventory);
  const selected = recipes.find((item) => item.itemId === selectedItemId) ?? recipes[0];
  const selectedDefinition = selected ? getAdventureItem(selected.itemId) : undefined;
  const [ingredientSelections, setIngredientSelections] = useState<CraftingIngredientSelection[]>([]);
  const selectedRecipe = useMemo(() => selected?.recipe ?? [], [selected]);

  useEffect(() => {
    setIngredientSelections(getDefaultIngredientSelections(state.inventory, selectedRecipe));
  }, [state.inventory, selectedRecipe]);

  const selectedMissing = selected ? getMissingMaterials(state.inventory, selectedRecipe, ingredientSelections) : [];
  const selectedCraftable = selected !== undefined && selectedMissing.length === 0;
  const selectedQuality = selected ? calculateCraftingQuality(state.inventory, selectedRecipe, ingredientSelections) : 0;
  const outputItemId = selected ? getCraftingOutputItemId(selected.itemId, selectedQuality) : undefined;
  const outputDefinition = outputItemId ? getAdventureItem(outputItemId) : selectedDefinition;

  const updateIngredientSelection = (requirementId: string, itemNo: number) => {
    setIngredientSelections((current) => [
      ...current.filter((selection) => selection.requirementId !== requirementId),
      { requirementId, itemNo },
    ]);
  };

  return (
    <aside className="inventory-panel crafting-panel" aria-label="Crafting menu">
      <div className="inventory-heading">
        <div>
          <h2>Crafting</h2>
          <p>{state.inventory.materials.length} material stacks</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close crafting"><X size={18} /></button>
      </div>

      <div className="crafting-layout">
        <section className="crafting-recipe-list">
          <h3>Recipe</h3>
          <div className="crafting-scroll">
            {recipes.map((recipe) => {
              const item = getAdventureItem(recipe.itemId);
              return (
                <button
                  key={recipe.itemId}
                  className={recipe.itemId === selected?.itemId ? 'selected' : undefined}
                  type="button"
                  onClick={() => onSelectItem(recipe.itemId)}
                >
                  <span style={{ background: ITEM_RANK_BACKGROUNDS[item.rank], color: ITEM_RANK_COLORS[item.rank] }}>
                    <ItemIcon icon={item.icon} sprite={item.iconSprite} />
                  </span>
                  <strong>{item.name}</strong>
                  <small>{recipe.craftable ? 'Ready' : `${recipe.missing.length} missing`}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="crafting-detail-panel">
          {selected && selectedDefinition && outputDefinition ? (
            <>
              <div className="crafting-result">
                <span style={{ background: ITEM_RANK_BACKGROUNDS[outputDefinition.rank], color: ITEM_RANK_COLORS[outputDefinition.rank] }}>
                  <ItemIcon icon={outputDefinition.icon} sprite={outputDefinition.iconSprite} />
                </span>
                <div>
                  <h3>{outputDefinition.name}</h3>
                  <p>{outputDefinition.description}</p>
                  <small>Quality {selectedQuality.toFixed(2)}</small>
                </div>
              </div>
              <div className="crafting-requirements">
                {selected.recipe.map((entry) => {
                  if (entry.kind === 'item') {
                    const material = getAdventureItem(entry.materialId);
                    const owned = getMaterialCount(state.inventory, entry.materialId);
                    const enough = owned >= entry.count;
                    return (
                      <div className={enough ? 'ready' : 'missing'} key={entry.id}>
                        <span style={{ background: ITEM_RANK_BACKGROUNDS[material.rank] }}>
                          <ItemIcon icon={material.icon} sprite={material.iconSprite} />
                        </span>
                        <strong>{material.name}</strong>
                        <em>{owned}/{entry.count}</em>
                      </div>
                    );
                  }
                  const selectedStack = ingredientSelections.find((selection) => selection.requirementId === entry.id);
                  const candidates = getMaterialCandidatesForRequirement(state.inventory, entry);
                  const assigned = selectedStack ? state.inventory.materials.find((material) => material.itemNo === selectedStack.itemNo) : undefined;
                  const enough = assigned !== undefined && assigned.count >= entry.count;
                  return (
                    <div className={enough ? 'ready' : 'missing'} key={entry.id}>
                      <span style={{ background: assigned ? ITEM_RANK_BACKGROUNDS[assigned.rank] : undefined }}>
                        {assigned ? <ItemIcon icon={assigned.icon} sprite={assigned.iconSprite} /> : '?'}
                      </span>
                      <strong>{entry.category.replace('-', ' ')}</strong>
                      <select
                        value={assigned?.itemNo ?? ''}
                        onChange={(event) => updateIngredientSelection(entry.id, Number(event.target.value))}
                      >
                        <option value="">Select material</option>
                        {candidates.map((candidate) => (
                          <option key={candidate.itemNo} value={candidate.itemNo}>
                            {candidate.name} [{candidate.rank}] x{candidate.count}
                          </option>
                        ))}
                      </select>
                      <em>{assigned ? `${assigned.count}/${entry.count}` : `0/${entry.count}`}{entry.minRank ? ` · ${entry.minRank}+` : ''}</em>
                    </div>
                  );
                })}
              </div>
              <button className="crafting-action" type="button" disabled={!selectedCraftable} onClick={() => onCraft(selected.itemId, ingredientSelections)}>
                Craft
              </button>
            </>
          ) : (
            <p>No recipes available.</p>
          )}
        </section>

        <section className="crafting-material-bag">
          <h3>Materials</h3>
          <div className="crafting-material-grid">
            {state.inventory.materials.map((material) => (
              <div key={material.itemNo} title={material.name}>
                <span style={{ background: ITEM_RANK_BACKGROUNDS[material.rank] }}>
                  <ItemIcon icon={material.icon} sprite={material.iconSprite} />
                </span>
                <strong>{material.name}</strong>
                <em>{material.category.replace('-', ' ')} · Q{rankScore(material.rank)} · x{material.count}</em>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
