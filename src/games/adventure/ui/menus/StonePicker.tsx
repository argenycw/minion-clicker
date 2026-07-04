import { getTrait } from '../../content';
import type { AdventureState } from '../../state';
import { canApplyTraitToWeapon } from '../../inventory/system';
import type { WeaponKind } from '../../weapons/types';
import { StoneIcon } from './StoneIcon';
import { getTraitEffectSummary } from './inventoryPresentation';

export function StonePicker({
  state,
  weapon,
  onApplyTrait,
  onClose,
}: {
  state: AdventureState;
  weapon: { name: string; traitIds: Array<string | undefined>; kind: WeaponKind };
  onApplyTrait: (traitId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="stone-picker">
      <div className="stone-picker-heading">
        <strong>Augmentation</strong>
        <button type="button" onClick={onClose} aria-label="Close stone picker">×</button>
      </div>
      <div className="stone-picker-grid">
        {state.inventory.traits.map((stack) => {
          const trait = getTrait(stack.traitId);
          const compatible = canApplyTraitToWeapon(trait, weapon.kind);
          return (
            <button key={stack.itemNo} type="button" disabled={!compatible} title={compatible ? undefined : `${trait.name} cannot be socketed into ${weapon.kind} weapons.`} onClick={() => onApplyTrait(trait.id)}>
              <StoneIcon trait={trait} size="picker" />
              <strong>{trait.name}</strong>
              <small>{getTraitEffectSummary(trait)}</small>
              <small>x{stack.count}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
