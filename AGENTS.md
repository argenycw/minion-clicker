# Repository Rules

## Stable Content IDs

All new authored entities must use a stable type-plus-number ID. Never derive an ID from a display name, gameplay meaning, tier, biome, branch, or other semantic content.

- Use `passive-01`, `active-01`, `minion-01`, `outfit-01`, `biome-01`, and similar identifiers.
- Keep names, descriptions, tiers, families, effects, and kinds in separate fields. Those fields may change without changing the ID.
- References such as `previousId`, `unitId`, `traitId`, and `outfitId` must point to these stable IDs.
- Do not recycle an existing numeric ID for different content after release.
- Runtime-generated IDs should also use type and numeric indices, such as `enemy-07` or `wild-42`.
- Semantic discriminator values such as `kind: 'tree'`, `effect.kind: 'heal'`, or `tier: 'weak'` are not entity IDs and should remain descriptive.

See `docs/id-conventions.md` for examples and migration notes.

## Modular Game Architecture

Use a Unity-inspired, feature-oriented structure. Gameplay domains live directly under their owning game folder, parallel to features such as `dungeons` and `enemies`; do not add a generic `systems/` root merely to hold every domain.

For a substantial domain, prefer a structure such as:

```text
adventure/
  skills/
    types.ts
    definitions.ts
    system.ts
  inventory/
    types.ts
    definitions.ts
    system.ts
```

- Keep domain types in regular `.ts` modules and use `import type`. Do not use `.d.ts` files for ordinary internal game types; reserve declaration files for ambient globals and external-library declarations.
- Keep authored content in a dedicated, data-only `definitions.ts` module. Gameplay behavior must not be embedded in definitions, and systems must consume definitions through a stable typed interface independent of their storage format.
- Put read-only state queries and state-changing domain operations together in `system.ts`. Separate them with `// Selectors` and `// Operations` section comments; use a separate `selectors.ts` only when required by navigation or dependency boundaries.
- Prefer pure functions that receive state and explicit inputs and return state or derived values. Domain systems must not depend on React components, DOM events, PeerJS connections, or menu visibility.
- UI components should own temporary presentation state such as selected tabs, inspectors, and form values. They should trigger gameplay through typed callbacks or serializable commands instead of implementing domain rules inline.
- Keep authoritative runtime state and cross-domain orchestration outside menu components. Features such as multiplayer continue running when their menu is closed.
- Keep small domains cohesive; add files and abstractions only when they create a clear ownership or navigation boundary.
- A full ECS is not the default architecture. Introduce ECS-style indirection only if entity scale or composition requirements clearly justify it.

## Implementation Replies

After implementing features, the assistant's final reply should include:

- A high-level summary of what changed from the player's or designer's point of view.
- A code-level explanation of the main files, functions, or systems changed and how the feature works internally.
