import { createProp } from '../world/props';
import type { TownDefinition, TownId } from './types';

export const townDefinitions: TownDefinition[] = [
  {
    id: 'town-01',
    name: 'Town',
    width: 1320,
    height: 900,
    spawn: { x: 0, y: 300 },
    exit: { x: 0, y: 370, radius: 82 },
    npcs: [
      {
        id: 'npc-01',
        name: 'Mallow Merchant',
        kind: 'merchant',
        x: -250,
        y: -80,
        radius: 38,
        body: '( $ _ $ )',
        color: '#f3d5a6',
        pillWidth: 68,
        facing: 'right',
        shopId: 'shop-01',
      },
      {
        id: 'npc-02',
        name: 'Anvil Minion',
        kind: 'blacksmith',
        x: 245,
        y: -70,
        radius: 36,
        body: '( o _ < )',
        color: '#d4d8df',
        pillWidth: 62,
        facing: 'left',
      },
      {
        id: 'npc-03',
        name: 'Bench Minion',
        kind: 'villager',
        x: 70,
        y: -245,
        radius: 36,
        body: '( - _ - )',
        color: '#e8dcf3',
        pillWidth: 62,
        facing: 'right',
      },
    ],
    objects: [
      createProp('crate-01', { id: 'town-prop-01', x: -380, y: 70 }),
      createProp('barrel-01', { id: 'town-prop-02', x: -325, y: 82 }),
      createProp('crate-02', { id: 'town-prop-03', x: -280, y: 125 }),
      createProp('barrel-02', { id: 'town-prop-04', x: 340, y: 105 }),
      createProp('crate-01', { id: 'town-prop-05', x: 395, y: 140 }),
      createProp('barrel-01', { id: 'town-prop-06', x: 190, y: -235 }),
    ],
  },
];

export function getTownDefinition(id: TownId) {
  const town = townDefinitions.find((candidate) => candidate.id === id);
  if (!town) throw new Error(`Unknown town: ${id}`);
  return town;
}
