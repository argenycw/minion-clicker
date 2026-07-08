import type { WorldDrop } from '../state';
import { rollLootTable, type LootTable } from '../loot';
import { makeDeterministicRandom } from './random';

export function makeWorldDrops(startId: number, x: number, y: number, table: LootTable | undefined, now: number, random = makeDeterministicRandom(startId)): WorldDrop[] {
  const rolled = rollLootTable(table, random);
  const drops = makeCoinDrops(startId, x - 15, y + 5, rolled.coins, now);
  for (const itemId of rolled.itemIds) {
    const index = drops.length;
    drops.push({
      id: `drop-${String(startId + index).padStart(2, '0')}`,
      kind: 'item',
      x: x + 15 + (index % 3 - 1) * 18,
      y: y - 5 + Math.floor(index / 3) * 18,
      born: now + index * 35,
      itemId,
    });
  }
  return drops;
}

export function makeChestRollDrops(startId: number, x: number, y: number, table: LootTable, now: number, random: () => number): WorldDrop[] {
  const rolled = rollLootTable(table, random);
  const drops: WorldDrop[] = [];
  if (rolled.coins > 0) drops.push({ id: `drop-${String(startId).padStart(2, '0')}`, kind: 'coin', x: x - 14, y: y + 6, born: now, amount: rolled.coins });
  for (const itemId of rolled.itemIds) {
    const index = drops.length;
    drops.push({
      id: `drop-${String(startId + index).padStart(2, '0')}`,
      kind: 'item',
      x: x + 14 + (index % 3 - 1) * 18,
      y: y - 6 + Math.floor(index / 3) * 18,
      born: now + 45 + index * 35,
      itemId,
    });
  }
  return drops;
}

export function makeCoinDrops(startId: number, x: number, y: number, amount: number, now: number): WorldDrop[] {
  const values = decomposeCoinValues(amount);
  const columns = Math.min(5, values.length);
  return values.map((value, index) => {
    const row = Math.floor(index / columns);
    const rowCount = Math.min(columns, values.length - row * columns);
    const column = index % columns;
    return {
      id: `drop-${String(startId + index).padStart(2, '0')}`,
      kind: 'coin',
      x: x + (column - (rowCount - 1) / 2) * 22,
      y: y + row * 20 + (index % 2 === 0 ? -3 : 3),
      born: now + index * 35,
      amount: value,
    };
  });
}

function decomposeCoinValues(amount: number) {
  let remaining = Math.max(0, Math.floor(amount));
  const values: number[] = [];
  while (remaining >= 10) {
    values.push(10);
    remaining -= 10;
  }
  while (remaining >= 5) {
    values.push(5);
    remaining -= 5;
  }
  while (remaining > 0) {
    values.push(1);
    remaining -= 1;
  }
  return values;
}
