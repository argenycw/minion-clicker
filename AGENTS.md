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
