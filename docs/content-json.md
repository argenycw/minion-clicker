# Content JSON

Built-in content now lives with either shared game systems or the game that owns it:

- `src/shared/data/minions.json`: combat and worker minions.
- `src/games/clicker-rts/tech.json`: technology cards.
- `src/shared/data/enemy.json`: enemy castle definitions and their guard layouts.

These files are imported by Vite and bundled with the app. Use this path for official game content that ships with a build.

All authored IDs must follow `docs/id-conventions.md`: use a stable type plus numeric index such as `minion-01`, `castle-03`, or `technology-02`. Do not encode a name, tier, effect, or other editable content into an ID.

Use `public` only when deployed content must be swapped without rebuilding the app. That would require an async runtime load step before the first game state is created.

## DLC Imports

Players can import DLC JSON from the shop:

- Combat and Worker tabs import minion JSON.
- Tech tab imports technology JSON.

Each import accepts either a single object or an array. The game validates the file before saving it. If parsing or validation fails, the import is cancelled and an error popup is shown.

DLC content is saved in `localStorage` and marked with a `DLC` badge in the shop.

Castle DLC is not exposed in the UI yet because changing enemy content safely needs a run-reset and map regeneration flow.

## Enemy Defenders

Built-in enemy castle IDs use stable numeric slots such as `castle-01`, `castle-03`, and `castle-08`.

Castle defenders can reference an exact minion:

```json
{ "unitId": "minion-01", "dx": 90, "dy": 55 }
```

Or they can request a randomized guard by tier and combat type:

```json
{ "tier": "medium", "type": "ranged", "dx": 140, "dy": -80 }
```

The random choice is resolved once when a new run starts. Respawns reuse that chosen unit for the same guard slot.
