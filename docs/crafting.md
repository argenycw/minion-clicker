# Adventure Crafting System

Crafting is the shared foundation for cooking, blacksmithing, and enchanting. Environmental props should usually drop ingredients, not finished consumables: plants drop food ingredients, rocks and ruins drop stone/minerals/gems, trees and crates drop wood, and defeated minions or chests drop hunting and magical products.

## Data Model

- Crafting materials are adventure items with stable category IDs such as `food-01`, `stone-01`, and `magical-product-01`.
- Material display data lives beside potion item data in `src/games/adventure/loot.ts`.
- Material IDs never encode gameplay meaning. Names, categories, ranks, and descriptions can change without changing IDs.
- Crafting recipes live on craftable item definitions and may require either exact materials or selectable material categories.
- Materials use a placeholder sprite ref for now: `plain.png` grid cell `x=7, y=10`. Replace each material's `iconSprite` later when the spritesheet is expanded.

Material categories:

- `junk`: always rank D; only useful for selling to merchants.
- `food`: rank C or higher; intended for small recovery/buff use and cooking.
- `wood`, `stone`, `mineral`, `gem`: gathering products from destructible props, with broader rank variety.
- `leather`, `cloth`, `magical-product`: hunting/chest products from defeated minions and dungeon rewards.

Recipe requirements:

```ts
// Exact material requirement.
{ kind: 'item', id: 'mana-dust', materialId: 'magical-product-01', count: 2 }

// Flexible category requirement. The player chooses any matching material stack.
{ kind: 'category', id: 'stone-base', category: 'stone', count: 1, minRank: 'C', qualityWeight: 0.7 }
```

Category requirements contribute to craft quality based on the selected material's rank. Recipes may define `recipeOutcomes` so higher-quality ingredients produce a better result.

## Loot Attachment

Loot tables can roll coins plus one item stack. Item entries may include `amount`, so a rock can drop `2-4` minerals while a rare minion part can drop once.

Recommended prop behavior:

- Plants, bushes, mushrooms: food and occasional magical residue.
- Trees, stumps, crates, barrels: wood.
- Rocks, rubble, ruins: stone, ore, and rare gems.
- Minions and chests: junk, leather, cloth, and magical products.

## Systems

The crafting domain lives under `src/games/adventure/crafting/`.

- `types.ts` owns recipe and material category types.
- `system.ts` exposes selectors such as `getCraftableItems`, `getMaterialCount`, and `canCraftItem`.
- `craftAdventureItem` consumes material stacks and creates the target adventure item. A future crafting menu can call this operation without embedding recipe rules in React.

## UI Direction

The generated crafting UI concept uses a full-screen workshop layout:

- concept image: `docs/crafting-ui-concept.png`
- recipe list on the left,
- selected craft result and flavor in the center,
- required material counts and inventory on the right,
- a large craft action at the bottom.

The current implementation only shows material stacks in the existing inventory Items group. The dedicated crafting menu can be added later using the crafting system selectors.
