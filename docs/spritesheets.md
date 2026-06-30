# Spritesheet Conventions

Spritesheet IDs follow the repository stable ID rule. The file name may describe the theme, but the authored ID must be type-plus-number such as `sheet-01`.

## Grid Rules

- `plain.png` is registered as `sheet-01`.
- `sheet-01` is 1024 by 1024 pixels.
- It is evenly divided into 16 columns and 16 rows.
- Each grid cell is 64 by 64 pixels.
- There is no padding between cells.
- Code uses zero-based cell coordinates: the top-left cell is `x: 0, y: 0`.

## Object Mapping

Map objects to one or more cells, not cells to objects. For example, a single-cell prop uses:

```ts
'rock-04': {
  kind: 'rock-04',
  family: 'rock',
  sprite: { sheetId: 'sheet-01', x: 3, y: 6 },
}
```

`kind` is the stable authored prop ID. Use numbered IDs such as `tree-01`, `tree-02`, `rock-01`, and `flower-01`. Shared behavior is attached through `family`, so all tree variants can still share wood/leaf particles, collision defaults, and vector fallback behavior.

A multi-cell prop declares its span:

```ts
sprite: { sheetId: 'sheet-01', x: 0, y: 8, cellsWide: 2 }
```

Tall objects use `cellsHigh`. For example, a tree that starts at column 0, row 4 and continues through row 5 is:

```ts
sprite: { sheetId: 'sheet-01', x: 0, y: 4, cellsHigh: 2 }
```

Large map locations use the same span fields:

```ts
// Cave entrance, 2x2 cells.
sprite: { sheetId: 'sheet-01', x: 0, y: 12, cellsWide: 2, cellsHigh: 2 }

// Town map icon, 3x2 cells.
sprite: { sheetId: 'sheet-01', x: 0, y: 14, cellsWide: 3, cellsHigh: 2 }

// Town house/building, 3x2 cells.
sprite: { sheetId: 'sheet-01', x: 3, y: 14, cellsWide: 3, cellsHigh: 2 }
```

`cellsWide` and `cellsHigh` describe the source rectangle in the spritesheet. The renderer preserves that sliced aspect ratio automatically.

## Visual Scale

Sprite visuals should be sized with a single uniform scale, not separate rendered width and height values.

- The source visual size is `cellsWide * 64` by `cellsHigh * 64`.
- `sprite.drawScale` scales both axes equally and preserves the source aspect ratio.
- Runtime prop scale from `scaleRange` is folded into the sprite's `drawScale` when the prop is created.
- `sprite.offsetX` and `sprite.offsetY` move the rendered sprite without changing collision.

For example, a `3x1` wall slice renders as a wide wall because its source is three cells wide. Tune its final apparent size with `drawScale`; do not stretch it by assigning a custom rendered width and height.

## Hitboxes

Sprite cells are visual source data. They do not control hitboxes.

World object collision remains defined by each prop's `collision` field and gameplay `width` / `height` in `src/games/adventure/world/props.ts`. Those values are gameplay footprint data, not sprite render dimensions.

Scale variation and random horizontal flipping are also authored on prop definitions:

```ts
scaleRange: [0.78, 1.45],
randomFlipX: true,
```

Prop placement does not apply random rotation. Keep authored sprites upright; use `randomFlipX: true` only for props that still read correctly when mirrored.

Shadows are also authored on prop definitions with `castsShadow`. Ground decals and low flat objects such as `pile`, `prop-sm`, `prop-md`, `flowerbed`, and `rubble` default to `castsShadow: false`; taller blocking objects such as trees, rocks, crates, barrels, and ruins keep shadows by default.

## Render Order

Prop draw order is controlled by `renderPriority` first, then by world `y`.

- Lower `renderPriority` draws earlier and appears behind other props.
- Higher `renderPriority` draws later and appears above lower-priority props.
- Props with the same priority use normal top-down Y sorting, where lower-on-screen objects draw on top.

Default low/background priorities:

```ts
pile: -100
flowerbed: -80
rubble: -70
prop-sm: -60
prop-md: -50
normal props: 0
```

Use this for flat ground visuals that should not cover trees, rocks, walls, crates, barrels, or the player-facing depth illusion.

## Terrain Ownership

Prefer one PNG spritesheet per biome or terrain family. `sheet-01` currently represents the green plains / town visual set and is loaded from:

```text
public/assets/sprites/plain.png
```

Current biome sheet registry:

| Sheet ID | File | Region |
| --- | --- | --- |
| `sheet-01` | `public/assets/sprites/plain.png` | Green plains and town baseline |
| `sheet-02` | `public/assets/sprites/soil.png` | Soil badlands |
| `sheet-03` | `public/assets/sprites/desert.png` | Golden desert |
| `sheet-04` | `public/assets/sprites/swamp.png` | Murkfen swamp |
| `sheet-05` | `public/assets/sprites/forest.png` | Deep forest |
| `sheet-06` | `public/assets/sprites/volcano.png` | Cinder volcano |
| `sheet-07` | `public/assets/sprites/snowland.png` | Snowland |

## Biome Placement

Biome placement is intentionally two-pass:

1. Generate the main world terrain from the original procedural ground pass. This keeps the familiar grass / dry-road style as the default map foundation.
2. Stamp special biomes as large deterministic regions over that foundation. Desert, swamp, forest, volcano, and snowland should appear as broad consecutive areas rather than tile-by-tile noise. The current planner creates two large destination regions for each special biome across the full extended overworld.

This structure keeps biome-specific props, minions, and future dungeon placement meaningful: systems can query one `biomeId` and expect nearby tiles to usually belong to the same region.

## Generated Biome Sheet Prompts

The built-in image generation tool was used to create the first biome sheet pass. Each prompt followed this structure:

```text
Use case: stylized-concept
Asset type: 1024x1024 game spritesheet for a top-down/isometric 2D RPG biome
Primary request: Create a <biome> biome props spritesheet, 1024x1024, arranged on an invisible 16 columns x 16 rows grid. Each grid cell is 64x64 pixels. Use no padding grid lines and no text.
Input images: plain.png is a style reference only: match its colorful hand-painted pixel-art/painted RPG prop style, black/brown outline accents, three-quarter top-down perspective, isolated props on a clean white background.
Composition/framing: Fill the sheet with separated sprite objects. Most props fit one 64x64 cell; trees/walls/caves/buildings may span 1x2, 2x1, 2x2, or 3x2 cell areas.
Constraints: no characters, no enemies, no UI, no labels, no watermark, no transparent checkerboard, no grid lines. Ensure sprites are upright and not randomly rotated.
```

Biome-specific subject and palette notes:

- Soil badlands: cracked dirt, clay rocks, dry shrubs, burrows, termite mounds, bones, fences, crates, eroded stone ruins, cave, frontier huts. Palette: warm earth browns, clay orange, dusty tan, olive dry grass, muted gray stones.
- Golden desert: sand patches, cacti, agave, dead trees, tumbleweed, palms, bones, clay jars, sandstone ruins, cave, oasis camp, sandstone town. Palette: golden sand, ochre, sandstone cream, burnt orange, muted teal cactus.
- Murkfen swamp: mossy mud, green pools, lily pads, reeds, mushrooms, gnarled trees, rotten logs, frog ponds, mossy ruins, root cave, stilt huts. Palette: murky greens, moss, dark olive, muddy brown, teal water, muted purple mushrooms.
- Deep forest: mossy grass, ferns, flowers, mushrooms, berry bushes, pines, broadleaf trees, ancient oak, logs, mossy rocks, ruin walls, camp, cottages. Palette: deep emerald, pine green, moss, bark brown, cool gray stone.
- Cinder volcano: ash, cracked lava crust, lava pools, basalt/obsidian rocks, sulfur crystals, ember shrubs, burned trees, vents, basalt ruins, lava cave, blackstone buildings. Palette: charcoal black, basalt gray, glowing orange lava, ember red, sulfur yellow.
- Snowland: snow patches, ice tiles, frozen cobbles, snow mounds, ice rocks, blue crystals, snow pines, frozen trees, icicles, snowy crates, frozen ruins, cave, igloo, cabins. Palette: snow white, ice blue, pale cyan, cool slate, evergreen, warm cabin brown.
