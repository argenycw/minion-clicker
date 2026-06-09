# Content JSON

Built-in content lives in `src/data`:

- `minions.json`: combat and worker minions.
- `tech.json`: technology cards.
- `enemy.json`: enemy castle definitions and their guard layouts.

These files are imported by Vite and bundled with the app. Use this path for official game content that ships with a build.

Use `public` only when deployed content must be swapped without rebuilding the app. That would require an async runtime load step before the first game state is created.

## DLC Imports

Players can import DLC JSON from the shop:

- Combat and Worker tabs import minion JSON.
- Tech tab imports technology JSON.

Each import accepts either a single object or an array. The game validates the file before saving it. If parsing or validation fails, the import is cancelled and an error popup is shown.

DLC content is saved in `localStorage` and marked with a `DLC` badge in the shop.

Castle DLC is not exposed in the UI yet because changing enemy content safely needs a run-reset and map regeneration flow.

## Enemy Defenders

Built-in enemy castle IDs use difficulty slots such as `easy-01`, `medium-01`, and `hard-03`.

Castle defenders can reference an exact minion:

```json
{ "unitId": "weak-melee-01", "dx": 90, "dy": 55 }
```

Or they can request a randomized guard by tier and combat type:

```json
{ "tier": "medium", "type": "ranged", "dx": 140, "dy": -80 }
```

The random choice is resolved once when a new run starts. Respawns reuse that chosen unit for the same guard slot.
