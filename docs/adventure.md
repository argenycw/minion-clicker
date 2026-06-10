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

The export goal is important: Adventure characters should eventually be serializable into a form compatible with Clicker's minion schema. That means Adventure character data should preserve kaomoji appearance, hands, weapon identity, combat stats, and visual styling cleanly enough to normalize into a Clicker minion later.

## Imprint Stone Color Language

Imprint Stones use a colored circular stone plus an inner sign so they read like game items instead of plain text symbols.

- Red: attack and direct physical damage.
- Blue: defense, guard, resistance, and survival effects.
- Yellow: utility, reach, speed, handling, and quality-of-life effects.
- Violet: magic, projectile shaping, duplication, and unusual combat rules.
- Orange: impact, area, knockback, and force effects.

## Architecture Notes

Adventure should share low-level content and presentation concepts with Clicker, especially kaomoji definitions, terrain generation, map settings, and eventually shared combat primitives.

Adventure should not reuse Clicker's high-level reducer or economy model. Clicker has coins, workers, castles, technology purchases, selection, and RTS commands. Adventure needs direct player control, equipment, inventory, items, drops, and character progression.
