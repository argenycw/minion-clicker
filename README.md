# Minion Games

This site hosts kaomoji minion games. The current stable game is Minion Clicker, a browser RTS/clicker prototype where you earn coins, hire kaomoji minions, command them on a top-down map, and fight procedurally placed enemy keeps.

Adventure mode is an early sandbox roguelike RPG prototype where the player directly controls one customizable minion with separate left-hand and right-hand weapons.

## Features

### Clicker

- Top-down canvas map with pan, zoom, selection, and move/attack commands.
- Clicker economy with workers, combat minions, and technology upgrades.
- Kaomoji minions rendered from JSON definitions.
- Melee and ranged combat, real projectile collision, death/spawn/castle effects.
- Enemy keeps with randomized defenders by tier/type.
- DLC-style JSON imports for custom minions and technologies.
- Firebase Hosting setup.

### Adventure

- Direct player movement with WASD or arrow keys.
- Cursor-based facing and aiming.
- Left-click and right-click weapon activation with independent cooldowns.
- JSON-defined prototype weapons in `src/games/adventure/weapons.json`.
- Item placeholder slots on keys 1 through 5.
- Shared procedural terrain and a high-HP dummy for combat testing.

## Routes

- `/` redirects to `/clicker` for backward compatibility.
- `/clicker` runs Minion Clicker.
- `/adventure` runs the Adventure prototype.

## Development

```bash
npm install
cp .env.example .env
npm run dev
```

Fill `.env` with your Firebase web app config before running or building. Vite only exposes variables prefixed with `VITE_`.

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deploy

The Firebase project is configured as `minion-clicker`, and Hosting serves the Vite `dist` folder.
Make sure `.env` is present before building for deployment.

```bash
firebase login
npm run deploy
```

Without a global Firebase CLI:

```bash
npm run deploy:ci
```

## Content Data

Built-in content now lives with either shared game systems or the game that owns it:

- `src/shared/data/minions.json`
- `src/shared/data/enemy.json`
- `src/games/clicker-rts/tech.json`

See `docs/minion-json.md` and `docs/content-json.md` for schema notes and DLC import details.
See `docs/adventure.md` for the Adventure design direction and long-term scope.
