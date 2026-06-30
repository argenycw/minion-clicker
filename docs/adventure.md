# Adventure Mode

Adventure mode is planned as a sandbox roguelike RPG built around one player-controlled kaomoji minion.

## Core Fantasy

The player creates a minion like an MMORPG character:

- Choose body color.
- Choose face/body kaomoji.
- Choose left hand and right hand.
- Equip a weapon in each hand.
- Eventually grow through weapon swaps, weapon upgrades, skills, items, and crafting.

Unlike Clicker mode, minions are not hired as AI-controlled RTS units. In Adventure mode, the player directly controls one minion in a semi-open world full of enemies.

## Combat Direction

The player has two active weapon slots:

- Left mouse button activates the left-hand weapon.
- Right mouse button activates the right-hand weapon.
- Each weapon has its own cooldown based on attack speed.
- WASD and arrow keys move the minion.
- Cursor location controls facing direction.
- Number keys 1 through 5 are reserved for item usage.

Weapon display supports an optional `activeGlyph`, shown briefly after an attack for both melee and ranged weapons. A weapon hand glyph can contain `{p}` to insert its configured projectile glyph inline using the projectile's weapon color, for example `-{p}`.

The first prototype should focus on feel: movement, facing, two weapon actions, visible cooldowns, and a high-HP dummy enemy for testing.

## Long-Term Systems

Adventure mode is expected to become larger than Clicker mode:

- Procedural semi-open world exploration.
- Enemy families by region/distance.
- Weapon drops and swaps.
- Weapon upgrades.
- Skill tree unlocks.
- Item use and crafting.
- Stronger enemies farther from the starting area.
- Character export into Clicker mode.

## Procedural World Objects

Adventure world generation uses two levels of content:

- World objects are individual props such as trees, bushes, rocks, barrels, walls, and rubble.
- Areas are placed regions with a kind and size. Each area generates its own floor, boundary, entrances, and interior details.

Objects can be decorative, blocking, destructible, or a combination of those behaviors. Blocking objects participate in player collision. Destructible objects store HP in adventure state and can be damaged by melee attacks and projectiles; at zero HP they disappear and stop blocking movement.

The initial area type is `ruin`. Ruins generate as fragmented maze-like wall networks with open boundaries, gaps, dead ends, decorative rubble, and destructible barrels. Connectivity is intentionally not guaranteed. Their interior layout is deterministic for a given area id, so the same generated world is stable between resets.

World objects use a common visual language: shallow colors indicate background decoration, deep colors indicate collision, and a dark silhouette-following outline indicates that the object has HP and can be destroyed.

World content is modular under `src/games/adventure/world`: `props.ts` defines reusable prop behavior and collision shapes, while generators under `areas/` compose those props into regions such as ruins. Area generators do not redefine prop collision or destructibility rules.

Terrain art is rendered by the shared `src/shared/terrainRenderer.ts` module so Clicker and Adventure use the same layered prop style. Destructible props record their latest hit time and briefly shake when damaged.

The shared renderer also supplies ambient falling leaves and deterministic visual variants such as broadleaf, autumn, and pine trees, flowering plants, rock forms, dead wood, crates, barrels, pillars, and segmented ruins. Adventure adds interaction particles: flowers release petals when walked through, foliage releases leaves when attacked, stone props release chips, and wooden props release splinters.

Adventure terrain props may opt into spritesheet rendering through a `sprite` reference on their prop definition. Spritesheet grid and hitbox conventions are documented in `docs/spritesheets.md`.

Destructible prop definitions can tune reaction density with `hitPieces: [min, max]` and `destroyPieces: [min, max]`. Ordinary hits use the smaller randomized range, while the killing hit uses the larger destruction range. Flower and flowerbed traversal is edge-triggered: petals fire once on entry and can fire again only after the player leaves and re-enters.

The export goal is important: Adventure characters should eventually be serializable into a form compatible with Clicker's minion schema. That means Adventure character data should preserve kaomoji appearance, hands, weapon identity, combat stats, and visual styling cleanly enough to normalize into a Clicker minion later.

## Augmentation Color Language

Augmentation Stones use a colored circular stone plus an inner sign so they read like game items instead of plain text symbols.

- Red: attack and direct physical damage.
- Blue: defense, guard, resistance, and survival effects.
- Yellow: utility, reach, speed, handling, and quality-of-life effects.
- Violet: magic, projectile shaping, duplication, and unusual combat rules.
- Orange: impact, area, knockback, and force effects.

## Architecture Notes

Adventure should share low-level content and presentation concepts with Clicker, especially kaomoji definitions, terrain generation, map settings, and eventually shared combat primitives.

Adventure should not reuse Clicker's high-level reducer or economy model. Clicker has coins, workers, castles, technology purchases, selection, and RTS commands. Adventure needs direct player control, equipment, inventory, items, drops, and character progression.

The Character panel uses three columns: persistent character customization on the left, inventory slots in the middle, and selected-item details on the right. Character customization includes an unlocked active-skill grid directly below the preview, followed by kaomoji, color, width, and outfit controls. Assigned active skills show their shared hotbar number and can be selected to display their details and assignment controls in the shared details column. Character and inventory content use matching five-column grids with three visible rows; categories scroll vertically after fifteen entries. Selecting an outfit displays its information in the shared details column. Outfits are data-driven definitions with body-relative visual offsets and optional HP, movement-speed, or damage bonuses. Empty weapon hands resolve to the `melee-00` bare-fist definition, so unequipping remains a valid combat choice instead of disabling that hand.

Adventure UI uses a warm parchment-light theme across the HUD, hotbar, inventory, character editor, and details surfaces. Grid categories are enclosed in their own bordered boxes, and the three main panel columns use wider gutters for visual separation.

The combat target panel follows the latest combat interaction. Hitting an enemy or destructible prop selects it; an enemy that damages the player also selects itself. The panel displays live HP for every target and attack, speed, rate, range, and aggro statistics for enemy units.

The procedural world is organized around biome definitions under `src/games/adventure/world/biomes`. A biome owns its ground palette, ambient effect, prop density, weighted prop pool, and weighted enemy pool. The initial registry contains green plains and sunbaked yellow plains; new biomes can be added without changing the world renderer or wilderness and enemy generators.

Biome geography is generated as a low-frequency continuous field. A biome therefore covers a broad region made from many gameplay grid cells, while each generation tile stores a blend value for rendering and a dominant biome id for content selection. Ground colors interpolate across a wide transition band so neighboring regions fade into one another without checkerboard placement or hard rectangular borders.

The Adventure map is streamed as deterministic `1920 × 1920` world chunks. The player has no world-edge clamp; crossing a chunk boundary shifts a loaded `3 × 3` window around the current chunk. Terrain, props, enemies, and procedural ruins are pure results of the map seed and signed chunk coordinates, so revisiting a coordinate regenerates the same base content. Biome noise samples absolute world coordinates, which keeps terrain continuous across chunk borders and supports negative coordinates.

Unloaded chunks retain compact runtime changes rather than their complete generated contents. Prop HP, enemy HP, and uncollected drops are recorded by chunk and reapplied when that chunk is loaded again. Authored areas such as `area-01` and `area-02` participate in the same stream, while procedural entities use deterministic type-plus-number IDs derived from their owning chunk and local numeric index.

## Dungeon Locations

Adventure chunks can contain non-destructible dungeon locations. The first implemented location is `location-01`, an Echoing Cave near the starting area, and streamed chunks can also generate deterministic Cave locations. Approaching a location displays an `E` interaction prompt. Entering freezes the current overworld arrays and player position; leaving through the dungeon exit restores that exact overworld state while keeping inventory, coins, HP, and other character progression earned inside.

Dungeon types are data-driven definitions under `src/games/adventure/dungeons`. `dungeon-01` defines the Cave room-count range, room dimensions, enemy candidates, enemies per room, chest chance, chest rolls, weighted item pool, coin rewards, and floor palette. Castle, Tower, and Mountain dungeons can use the same definition and transition system with new stable IDs and generators or visual themes.

The Cave generator builds a connected graph of rectangular rooms on a coarse grid. Every room after the entrance chooses an existing room as its parent, and a wide rectangular corridor joins the two centers. This guarantees that every generated room is reachable while allowing branches and irregular layouts. The entrance room contains the exit, later rooms contain enemies, and the first connected room always teaches the chest interaction with a guaranteed chest.

Chests use vector rendering so open and closed states remain consistent across platforms. Pressing `E` near a closed chest opens it once and scatters several deterministic loot rolls around the chest, outside the player's collision radius. Each roll creates at most one consolidated coin drop and one rarity-colored item drop, making the rewards readable before normal proximity collection begins.

Adventure enemy definitions live under `src/games/adventure/enemies`. They currently adapt the shared minion catalog into adventure-specific HP, movement, attack, appearance, and aggro values. Placement is deterministic, keeps the spawn area clear, and gives each enemy a home point to return to after the player leaves its aggro radius.

`App.tsx` is limited to React UI and runtime wiring. Camera input, state reduction, world generation, enemy generation, and canvas scene rendering are separate modules so each procedural system can evolve independently.

## Skills

All Adventure content follows the stable ID convention in `docs/id-conventions.md`: IDs contain only an entity type and numeric index. Names and effects must never be encoded into IDs.

Adventure skills are defined as a data-driven tree in `src/games/adventure/skills.ts`. Every node declares its type, icon, color, skill-point cost, a `previousId` parent link, and either passive modifiers or an active effect. Layout coordinates are generated from those relationships, so branches can grow without manually maintaining rows or columns. The expanded demo tree contains health, movement, damage, and hybrid passive branches plus Heal, Blink, and temporary Haste active skills.

Unlocking a passive applies its character modifiers immediately. Active skills must be assigned to the shared numbered hotbar: slots 1 through 5 can each contain either a consumable item or an active skill. Activating a skill uses the same number-key input as an item and displays its long cooldown directly over that slot.

The Skills tab renders nodes and prerequisite connections from the definition instead of hard-coding the diagram. Passive nodes are circular and active nodes are square. Locked nodes preserve a grey version of their original icon with a small lock overlay, while assigned active nodes show their hotbar number. A short click selects a node; holding it unlocks the node, while an invalid hold produces a red rejection pulse. The tree viewport supports pointer dragging to pan and mouse-wheel zooming for Path of Exile-style large graphs. The details column explains the selected node and handles active-skill hotbar assignment. Character and Skills share the same panel width to avoid layout movement while switching tabs.

`passive-00` is the permanently unlocked, effect-free root and directly connects every first-layer branch. It has no display name or description. Nodes with satisfied prerequisites show no lock and use a soft halo. Holding an available node fills it with the same light color used by its unlocked state while the incoming branch fills orange at the same rate; completion briefly bursts the halo before settling.

Passive nodes are circles and active skills are squares. Hexagons are reserved for rare `keystone` passives: build-defining effects with powerful benefits and serious tradeoffs. The demo Keystone, Unburdened Momentum, doubles movement speed while halving weapon damage.
