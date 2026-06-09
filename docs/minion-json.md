# Minion JSON

Minions are defined in `src/data/minions.json`. Custom minions can use the same shape and be imported in dev mode from the browser console.

## Types

There are three minion types:

- `melee`: walks into short range and attacks.
- `ranged`: attacks from distance and requires a projectile definition.
- `worker`: generates coins and requires a work animation.

Built-in minion IDs are stable slots rather than character names:

- `weak-melee-01`
- `weak-range-01`
- `medium-melee-01`
- `medium-range-01`
- `strong-worker-01`

Use the displayed `name` for flavor. Use `id` for stable references.

`tier` is optional for DLC and can be `weak`, `medium`, or `strong`. If omitted, the game infers a tier from price. Built-in enemy castles use tier/type requests to randomize defenders across runs.

## Shape

```json
{
  "id": "custom-heart-knight",
  "type": "melee",
  "tier": "weak",
  "name": "Heart Knight",
  "description": "Example custom melee minion.",
  "appearance": {
    "base": {
      "body": "`∀´",
      "leftHand": "♥",
      "rightHand": "/"
    },
    "attack": {
      "body": "`皿´",
      "leftHand": "♥",
      "rightHand": "╯"
    },
    "death": {
      "body": "X_X"
    }
  },
  "visual": {
    "background": "#f5d6b8",
    "pillWidth": 92
  },
  "attributes": {
    "hp": 80,
    "attack": 18,
    "defense": 4,
    "price": 120,
    "range": 44,
    "speed": 82,
    "attackSpeed": 0.7
  }
}
```

## Appearance

`appearance.base` is required for every minion.

- `body`: text drawn inside the pill.
- `leftHand`: optional text drawn outside the left side of the pill.
- `rightHand`: optional text drawn outside the right side of the pill.

`appearance.attack` is optional for melee and ranged minions. If omitted, the base face is reused while attacking.

`appearance.death` is optional and controls the face used by the flying death animation. If omitted, the game uses `X_X`.

`visual.background` is optional and controls the fill color inside the minion pill. The border is still drawn by team, so friendly minions use a blue border and enemy minions use a red border. Stronger built-in minions generally use deeper, more eye-catching fills.

`visual.pillWidth` is optional and controls the fixed width of the drawn pill in pixels. If omitted, the game uses `GAME_SETTINGS.ui.defaultMinionPillWidth`. The face is centered inside the pill and kept on one line; very long faces may visually overflow rather than resizing the pill or wrapping.

`appearance.projectile` is required for `ranged` minions:

```json
"projectile": {
  "glyph": "♥",
  "color": "#e83f79",
  "speed": 430,
  "radius": 22,
  "impact": {
    "glyph": "💥",
    "color": "#d94f5f"
  }
}
```

The projectile is rendered as its own moving object, not as part of the kaomoji. Ranged damage is applied only when the projectile collides with a valid target, so a fast unit can dodge a slow projectile. A different enemy unit can also block the shot if it crosses the projectile path first.

- `glyph`: visible projectile text.
- `color`: projectile fill/glow color.
- `speed`: optional flight speed in map units per second. Defaults to `GAME_SETTINGS.combat.defaultProjectileSpeed`.
- `radius`: optional collision radius. Defaults to `GAME_SETTINGS.combat.defaultProjectileRadius`.
- `impact`: optional hit effect. If omitted, the projectile still deals damage and shows the damage number, but no explosion/burst glyph is drawn.

`appearance.work` is required for `worker` minions:

```json
"work": {
  "body": "´ ▽ `",
  "leftHand": "🔨",
  "rightHand": "🪙"
}
```

## Attributes

Required:

- `hp`: max health.
- `attack`: attack power.
- `price`: base shop cost.
- `range`: attack range or worker interaction range.
- `speed`: movement speed.

Optional:

- `defense`: damage reduction, defaults to `0`.
- `attackSpeed`: attacks per second, defaults to `0.5`.
- `coinsPerSecond`: worker income.

## Dev Import

Debug helpers are only available in Vite dev mode. Open the browser console and use:

```js
window.minionDebug.minionSchema()
window.minionDebug.importMinions(window.minionDebug.minionSchema())
window.minionDebug.clearCustomMinions()
```

Coin helpers:

```js
window.minionDebug.setCoins(9999)
window.minionDebug.addCoins(500)
window.minionDebug.state()
```

Imported minions are saved to `localStorage` and the app reloads so they appear in the shop.
