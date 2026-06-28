import { getTrait } from '../../content';
import { getEffectiveWeapon, type AdventureState, type HandSlot } from '../../state';
import { ITEM_RANK_BACKGROUNDS } from '../../loot';
import type { InventoryItemKind, InventorySelection } from './useAdventureMenus';
import { SkillTreePanel } from './SkillsMenuContent';
import { CharacterEditor } from './CharacterEditor';
import { InventoryGroup, InventorySlot } from './InventoryGrid';
import { ItemInspector } from './ItemInspector';
import { StoneIcon } from './StoneIcon';

export function InventoryMenuContent({
  state,
  view,
  selectedSkillId,
  onSelectSkill,
  onUnlockSkill,
  onEquipSkill,
  selectedItem,
  onSelectItem,
  onEquip,
  onUnequip,
  onApplyTrait,
  onRemoveTrait,
  onUse,
  onEquipItem,
  onCustomize,
  onEquipOutfit,
  onDispose,
  traitPickerWeaponNo,
  onOpenTraitPicker,
  onCloseTraitPicker,
}: {
  state: AdventureState;
  view: 'inventory' | 'skills';
  selectedSkillId: string;
  onSelectSkill: (skillId: string) => void;
  onUnlockSkill: (skillId: string) => void;
  onEquipSkill: (skillId: string, slot: number) => void;
  selectedItem: InventorySelection | undefined;
  onSelectItem: (selection: InventorySelection | undefined) => void;
  onEquip: (hand: HandSlot, weaponInstanceId: string) => void;
  onUnequip: (hand: HandSlot) => void;
  onApplyTrait: (traitId: string, weaponInstanceId: string) => void;
  onRemoveTrait: (weaponInstanceId: string, index: number) => void;
  onUse: (itemNo: number) => void;
  onEquipItem: (itemNo: number, slot: number) => void;
  onCustomize: (changes: { body?: string; color?: string; pillWidth?: number }) => void;
  onEquipOutfit: (outfitId: string) => void;
  onDispose: (kind: InventoryItemKind, itemNo: number) => void;
  traitPickerWeaponNo: number | undefined;
  onOpenTraitPicker: (weaponItemNo: number) => void;
  onCloseTraitPicker: () => void;
}) {
  return view === 'skills' ? (
        <SkillTreePanel
          state={state}
          selectedSkillId={selectedSkillId}
          onSelectSkill={onSelectSkill}
          onUnlockSkill={onUnlockSkill}
          onEquipSkill={onEquipSkill}
        />
      ) : <div className="inventory-body">
        <CharacterEditor
          state={state}
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
          onCustomize={onCustomize}
        />

        <div className="inventory-bag">
          <InventoryGroup title="Items">
            {state.inventory.potions.map((item) => (
              <InventorySlot
                key={item.itemNo}
                selected={selectedItem?.kind === 'potion' && selectedItem.itemNo === item.itemNo}
                itemNo={item.itemNo}
                icon={item.icon}
                name={item.name}
                rarityBackground={ITEM_RANK_BACKGROUNDS[item.rank]}
                countLabel={`x${item.count}`}
                onClick={() => onSelectItem({ kind: 'potion', itemNo: item.itemNo })}
              />
            ))}
          </InventoryGroup>

          <InventoryGroup title="Equipment">
            {state.inventory.weapons.map((weapon) => {
              const effective = getEffectiveWeapon(state, weapon.id);
              return (
                <InventorySlot
                  key={weapon.id}
                  selected={selectedItem?.kind === 'weapon' && selectedItem.itemNo === weapon.itemNo}
                  itemNo={weapon.itemNo}
                  icon={effective.projectile?.glyph ?? effective.handGlyph}
                  color={effective.color}
                  name={weapon.name}
                  rarityBackground={ITEM_RANK_BACKGROUNDS[effective.rank]}
                  equippedLeft={weapon.id === state.character.leftWeaponInstanceId}
                  equippedRight={weapon.id === state.character.rightWeaponInstanceId}
                  onClick={() => onSelectItem({ kind: 'weapon', itemNo: weapon.itemNo })}
                />
              );
            })}
          </InventoryGroup>

          <InventoryGroup title="Augmentations">
            {state.inventory.traits.map((stack) => {
              const trait = getTrait(stack.traitId);
              return (
                <InventorySlot
                  key={stack.itemNo}
                  selected={selectedItem?.kind === 'trait' && selectedItem.itemNo === stack.itemNo}
                  itemNo={stack.itemNo}
                  icon={<StoneIcon trait={trait} size="slot" />}
                  name={trait.name}
                  rarityBackground={ITEM_RANK_BACKGROUNDS[trait.rank]}
                  countLabel={`x${stack.count}`}
                  onClick={() => onSelectItem({ kind: 'trait', itemNo: stack.itemNo })}
                />
              );
            })}
          </InventoryGroup>
        </div>

        {selectedItem && (
          <ItemInspector
            state={state}
            selection={selectedItem}
            onEquip={onEquip}
            onUnequip={onUnequip}
            onApplyTrait={onApplyTrait}
            onRemoveTrait={onRemoveTrait}
            onUse={onUse}
            onEquipItem={onEquipItem}
            onEquipSkill={onEquipSkill}
            onEquipOutfit={onEquipOutfit}
            onDispose={onDispose}
            traitPickerWeaponNo={traitPickerWeaponNo}
            onOpenTraitPicker={onOpenTraitPicker}
            onCloseTraitPicker={onCloseTraitPicker}
          />
        )}
      </div>;
}
