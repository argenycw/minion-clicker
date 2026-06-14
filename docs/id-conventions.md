# Stable ID Conventions

Entity IDs are permanent technical references, not summaries of content. Use the entity type followed by a numeric slot:

```text
passive-01
active-03
minion-12
technology-04
outfit-02
biome-01
area-02
```

Do not use semantic IDs such as `first-aid`, `green-plains`, `strong-range-01`, or `spark-charm`. A name, effect, tier, appearance, or role may be redesigned later; its stable ID should not require relinking save data, prerequisites, equipment, biomes, or other references.

Rules:

1. The prefix identifies only the broad entity type.
2. The suffix is a zero-padded numeric index, normally at least two digits.
3. Store semantic information in dedicated fields such as `name`, `kind`, `tier`, `family`, and `description`.
4. Relationship fields such as `previousId`, `unitId`, and `outfitId` use the stable numeric ID.
5. Never reuse a released ID for unrelated content. Add a new index instead.
6. Generated runtime entities follow the same principle where practical, for example `enemy-07` and `wild-42`.

Discriminated-union values and lookup keys are not entity IDs. Values such as `kind: 'tree'`, `kind: 'heal'`, `type: 'melee'`, and `tier: 'weak'` remain semantic because code branches on their meaning.
