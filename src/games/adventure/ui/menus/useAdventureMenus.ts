import { useState } from 'react';
import { skillTreeDefinition } from '../../skills';

export type AdventureMenuId = 'character' | 'skills' | 'multiplayer' | 'settings';

export type InventoryItemKind = 'weapon' | 'trait' | 'potion';

export type InventorySelection =
  | { kind: 'weapon'; itemNo: number }
  | { kind: 'trait'; itemNo: number }
  | { kind: 'potion'; itemNo: number }
  | { kind: 'outfit'; outfitId: string }
  | { kind: 'skill'; skillId: string };

export function useAdventureMenus() {
  const [active, setActive] = useState<AdventureMenuId>();
  const [selectedSkillId, setSelectedSkillId] = useState(skillTreeDefinition[0].id);
  const [selectedItem, setSelectedItem] = useState<InventorySelection | undefined>({ kind: 'weapon', itemNo: 2 });
  const [traitPickerWeaponNo, setTraitPickerWeaponNo] = useState<number>();

  return {
    active,
    isOpen: active !== undefined,
    open: setActive,
    toggle: (menu: AdventureMenuId) => setActive((current) => current === menu ? undefined : menu),
    close: () => setActive(undefined),
    selectedSkillId,
    selectSkill: setSelectedSkillId,
    selectedItem,
    selectItem: setSelectedItem,
    traitPickerWeaponNo,
    openTraitPicker: setTraitPickerWeaponNo,
    closeTraitPicker: () => setTraitPickerWeaponNo(undefined),
  };
}

export type AdventureMenusController = ReturnType<typeof useAdventureMenus>;
