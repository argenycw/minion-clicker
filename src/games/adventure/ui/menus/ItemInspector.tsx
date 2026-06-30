import { getTrait } from '../../content';
import { getEffectiveWeapon, type AdventureState, type HandSlot } from '../../state';
import { getOutfit } from '../../outfits';
import { getSkill } from '../../skills';
import { getAdventureItem, ITEM_RANK_COLORS } from '../../loot';
import type { InventoryItemKind, InventorySelection } from './useAdventureMenus';
import { AttributeRow } from './MenuPrimitives';
import { StonePicker } from './StonePicker';
import { getTraitEffectSummary, formatStatBonus } from './inventoryPresentation';
import { StoneIcon } from './StoneIcon';
import { ItemIcon } from './ItemIcon';
import { DisposeButton, InspectorHeader } from './InspectorPrimitives';

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="stat-pill">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

export function ItemInspector({
  state,
  selection,
  onEquip,
  onUnequip,
  onApplyTrait,
  onRemoveTrait,
  onUse,
  onEquipItem,
  onEquipSkill,
  onEquipOutfit,
  onDispose,
  traitPickerWeaponNo,
  onOpenTraitPicker,
  onCloseTraitPicker,
}: {
  state: AdventureState;
  selection: InventorySelection;
  onEquip: (hand: HandSlot, weaponInstanceId: string) => void;
  onUnequip: (hand: HandSlot) => void;
  onApplyTrait: (traitId: string, weaponInstanceId: string) => void;
  onRemoveTrait: (weaponInstanceId: string, index: number) => void;
  onUse: (itemNo: number) => void;
  onEquipItem: (itemNo: number, slot: number) => void;
  onEquipSkill: (skillId: string, slot: number) => void;
  onEquipOutfit: (outfitId: string) => void;
  onDispose: (kind: InventoryItemKind, itemNo: number) => void;
  traitPickerWeaponNo: number | undefined;
  onOpenTraitPicker: (weaponItemNo: number) => void;
  onCloseTraitPicker: () => void;
}) {

  if (selection.kind === 'skill') {
    const skill = getSkill(selection.skillId);
    return (
      <section className="item-inspector skill-item-inspector">
        <div className="inspector-header">
          <span style={{ color: skill.color }}>{skill.icon}</span>
          <div><h3>{skill.name}</h3><p>Active skill</p></div>
        </div>
        <div className="inspector-scroll">
          <p>{skill.description}</p>
          {skill.active && <div className="skill-detail-card">
            <AttributeRow icon="⏱" label="Cooldown" value={`${skill.active.cooldownMs / 1000}s`} />
          </div>}
        </div>
        <div className="skill-slot-actions">
          <span>Assign to shared hotbar</span>
          <div>{[1, 2, 3, 4, 5].map((slot) => {
            const entry = state.hotbarSlots[slot - 1];
            const equipped = entry?.kind === 'skill' && entry.skillId === skill.id;
            return <button className={equipped ? 'equipped' : undefined} key={slot} type="button" onClick={() => onEquipSkill(skill.id, slot)}>{slot}</button>;
          })}</div>
        </div>
      </section>
    );
  }

  if (selection.kind === 'outfit') {
    const outfit = getOutfit(selection.outfitId);
    const equipped = state.character.outfitId === outfit.id;
    return (
      <section className="item-inspector outfit-inspector">
        <div className="inspector-header">
          <span style={{ color: outfit.color }}>{outfit.glyph ?? '·'}</span>
          <div><h3>{outfit.name}</h3><p>Outfit</p></div>
        </div>
        <div className="inspector-scroll">
          <div className="character-preview compact">
            {outfit.glyph && (
              <span
                className="character-preview-outfit"
                style={{ color: outfit.color, transform: `translate(calc(-50% + ${outfit.offsetX ?? 0}px), calc(-50% + ${outfit.offsetY ?? 0}px))` }}
              >
                {outfit.glyph}
              </span>
            )}
            <strong style={{ background: state.character.color, width: state.character.pillWidth }}>{state.character.body}</strong>
          </div>
          <p>{outfit.description}</p>
          <div className="attribute-list">
            {outfit.maxHpBonus && <AttributeRow icon="♥" label="Max HP" value={`+${outfit.maxHpBonus}`} />}
            {outfit.speedBonus && <AttributeRow icon="👟" label="Speed" value={`+${outfit.speedBonus}`} />}
            {outfit.damageBonus && <AttributeRow icon="⚔️" label="Damage" value={`+${outfit.damageBonus}`} />}
            {!outfit.maxHpBonus && !outfit.speedBonus && !outfit.damageBonus && <p>No stat bonus.</p>}
          </div>
        </div>
        <div className="inspector-actions">
          <button className={equipped ? 'equipped' : undefined} type="button" onClick={() => onEquipOutfit(outfit.id)}>{equipped ? 'Equipped' : 'Equip Outfit'}</button>
        </div>
      </section>
    );
  }

  if (selection.kind === 'weapon') {
    const weapon = state.inventory.weapons.find((item) => item.itemNo === selection.itemNo);
    if (!weapon) return null;
    const effective = getEffectiveWeapon(state, weapon.id);
    return (
      <section className="item-inspector">
        <InspectorHeader icon={effective.projectile?.glyph ?? effective.handGlyph} color={ITEM_RANK_COLORS[effective.rank]} name={weapon.name} itemNo={weapon.itemNo} />
        <div className="inspector-scroll">
          <div className="trait-slots">
            {Array.from({ length: 5 }, (_, index) => {
              const traitId = weapon.traitIds[index];
              const trait = traitId ? getTrait(traitId) : undefined;
              return (
                <button
                  className={trait ? 'stone-socket filled' : 'stone-socket'}
                  key={index}
                  type="button"
                  onClick={() => (trait ? onRemoveTrait(weapon.id, index) : onOpenTraitPicker(weapon.itemNo))}
                  title={trait?.description ?? 'Open trait slot'}
                >
                  {trait && <StoneIcon trait={trait} size="socket" />}
                  {trait && (
                    <span className="socket-tooltip">
                      <strong>{trait.name}</strong>
                      <small>{getTraitEffectSummary(trait, effective)}</small>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p>{effective.description}</p>
          <div className="attribute-list">
            <AttributeRow icon="⚔️" label="Damage" value={effective.baseDamage} bonus={effective.damage - effective.baseDamage} />
            <AttributeRow
              icon="⏱️"
              label="Rate"
              value={`${effective.baseAttackSpeed}/s`}
              bonus={formatStatBonus(effective.attackSpeed - effective.baseAttackSpeed)}
            />
            <AttributeRow icon="↔️" label="Range" value={effective.baseRange} bonus={effective.range - effective.baseRange} />
            <AttributeRow icon="💥" label="Radius" value={effective.baseRadius} bonus={effective.radius - effective.baseRadius} />
          </div>
        </div>
        {traitPickerWeaponNo === weapon.itemNo && (
          <StonePicker
            state={state}
            weapon={weapon}
            onApplyTrait={(traitId) => {
              onApplyTrait(traitId, weapon.id);
              onCloseTraitPicker();
            }}
            onClose={onCloseTraitPicker}
          />
        )}
        <div className="inspector-actions">
          {weapon.id === state.character.leftWeaponInstanceId ? (
            <button type="button" onClick={() => onUnequip('left')}>Unequip L</button>
          ) : (
            <button type="button" onClick={() => onEquip('left', weapon.id)}>Equip L</button>
          )}
          {weapon.id === state.character.rightWeaponInstanceId ? (
            <button type="button" onClick={() => onUnequip('right')}>Unequip R</button>
          ) : (
            <button type="button" onClick={() => onEquip('right', weapon.id)}>Equip R</button>
          )}
          <DisposeButton disabled={weapon.id === state.character.leftWeaponInstanceId || weapon.id === state.character.rightWeaponInstanceId} onDispose={() => onDispose('weapon', weapon.itemNo)} />
        </div>
      </section>
    );
  }

  if (selection.kind === 'trait') {
    const stack = state.inventory.traits.find((item) => item.itemNo === selection.itemNo);
    if (!stack) return null;
    const trait = getTrait(stack.traitId);
    return (
      <section className="item-inspector">
        <InspectorHeader icon={<StoneIcon trait={trait} size="header" />} color={ITEM_RANK_COLORS[trait.rank]} name={trait.name} itemNo={stack.itemNo} />
        <div className="inspector-scroll">
          <div className="trait-slots single">
            <span className="stone-socket filled"><StoneIcon trait={trait} size="socket" /></span>
          </div>
          <p>{trait.description}</p>
          <div className="inspector-meta">{getTraitEffectSummary(trait)}</div>
        </div>
        <div className="inspector-actions">
          <DisposeButton onDispose={() => onDispose('trait', stack.itemNo)} />
        </div>
      </section>
    );
  }

  if (selection.kind === 'material') {
    const material = state.inventory.materials.find((item) => item.itemNo === selection.itemNo);
    if (!material) return null;
    const definition = getAdventureItem(material.itemId);
    return (
      <section className="item-inspector">
        <InspectorHeader icon={<ItemIcon icon={material.icon} sprite={material.iconSprite} />} color={ITEM_RANK_COLORS[material.rank]} name={material.name} itemNo={material.itemNo} />
        <div className="inspector-scroll">
          <p>{definition.description} {material.name} is a {material.category.replace('-', ' ')} crafting material. Stack: x{material.count}</p>
          <div className="weapon-stat-grid">
            <StatPill label="Count" value={material.count} />
          </div>
        </div>
        <div className="inspector-actions">
          <DisposeButton onDispose={() => onDispose('material', material.itemNo)} />
        </div>
      </section>
    );
  }

  const potion = state.inventory.potions.find((item) => item.itemNo === selection.itemNo);
  if (!potion) return null;
  return (
    <section className="item-inspector">
      <InspectorHeader icon={potion.icon} color={ITEM_RANK_COLORS[potion.rank]} name={potion.name} itemNo={potion.itemNo} />
      <div className="inspector-scroll">
        <p>Restores {potion.heal} HP. Cooldown: {potion.cooldownMs / 1000}s. Stack: x{potion.count}</p>
        <div className="weapon-stat-grid">
          <StatPill label="Heal" value={potion.heal} />
          <StatPill label="Count" value={potion.count} />
        </div>
      </div>
      <div className="potion-actions">
        <div className="potion-primary-actions">
          <button type="button" onClick={() => onUse(potion.itemNo)}>Use</button>
          <DisposeButton onDispose={() => onDispose('potion', potion.itemNo)} />
        </div>
        <div className="potion-equip-actions">
          {[1, 2, 3, 4, 5].map((slot) => {
            const entry = state.hotbarSlots[slot - 1];
            return <button
              key={slot}
              type="button"
              className={entry?.kind === 'potion' && entry.itemNo === potion.itemNo ? 'equipped' : undefined}
              onClick={() => onEquipItem(potion.itemNo, slot)}
            >
              Equip {slot}
            </button>;
          })}
        </div>
      </div>
    </section>
  );
}
