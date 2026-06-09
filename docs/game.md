# Minion Clicker

Minion Clicker is a top-down clicker-RTS prototype.

The player earns coins by clicking the treasury button, then spends those coins on kaomoji minions. Combat minions can be selected and ordered around the map to fight castle defenders and attack keeps. Worker minions generate passive income and can have small work animations when they produce money.

The main interaction model is RTS-like:

- Left click a base, castle, or unit to inspect/select it.
- Left click empty space to clear selection.
- Left drag to box-select player minions.
- Right click ground to move selected player minions.
- Right click an enemy unit or castle to attack.
- Middle drag or right drag to pan.
- WASD or arrow keys to pan.
- Mouse wheel to zoom.
- Click the large coin button to earn money.
- Click minion cards in the shop to buy them.

Enemy castles are placed procedurally when a new run starts. Placement avoids the player base and keeps enough distance between castles so objectives do not overlap. Castles now progress from lighter outposts with cheap defenders to stronger keeps protected by more expensive squads.

The visual identity is built around kaomoji bodies inside a drawn pill border. Hands, weapons, hearts, and casting symbols can be drawn outside that border so minions feel animated without needing sprite sheets. Each minion can also define its own pill fill color in JSON, while the border color communicates friendly or enemy allegiance.
