# Minion Clicker

Minion Clicker is a browser RTS/clicker prototype. You earn coins by pressing the treasury button, hire kaomoji minions, command them on a top-down map, and fight procedurally placed enemy keeps.

## Features

- Top-down canvas map with pan, zoom, selection, and move/attack commands.
- Clicker economy with workers, combat minions, and technology upgrades.
- Kaomoji minions rendered from JSON definitions.
- Melee and ranged combat, real projectile collision, death/spawn/castle effects.
- Enemy keeps with randomized defenders by tier/type.
- DLC-style JSON imports for custom minions and technologies.
- Firebase Hosting setup.

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

Built-in content lives in `src/data`:

- `minions.json`
- `enemy.json`
- `tech.json`

See `docs/minion-json.md` and `docs/content-json.md` for schema notes and DLC import details.
