# Adventure Combat Behaviors

Adventure combat behaviors are the modular replacement for augmentation-specific
branches in the main adventure loop.

## Runtime Flow

1. A weapon release, projectile step, projectile hit, or melee hit creates a
   typed combat event.
2. The combat pipeline orders subscribers by priority, behavior ID, and owner
   ID.
3. Subscribers return patches.
4. The owning combat runtime resolver applies patches and returns updated
   combat state slices to `state.ts`.

Behavior modules do not directly mutate global state. They return patches such
as `modifyAttack`, `damageTarget`, `spawnAttack`, `spawnPendingAttack`, or
`spawnVisualEffect`.

`state.ts` is the Adventure coordinator. It should call combat entry points such
as `tickCombatRuntime`, `resolveMeleeAttack`, or `makeProjectiles`, but it
should not contain augmentation-specific branches or projectile/melee/circle
resolution internals.

## Behavior Payloads

Runtime attacks carry serializable behavior instances instead of
augmentation-specific fields:

```ts
type CombatBehaviorInstance = {
  behaviorId: CombatBehaviorId;
  ownerId: string;
  params: Record<string, number | string | boolean | undefined>;
};
```

Use this pattern when adding a new augmentation or skill effect:

1. Add authored/config data as a behavior instance.
2. Let the behavior module interpret its own params.
3. Keep runtime attack shapes neutral: damage, knockback, shape, source,
   targets, timing, and `behaviors`.
4. Keep mutable per-attack counters explicit on the runtime entity only when
   they are true runtime state, such as remaining ricochets on a projectile.

Do not add fields such as `aftershockCount`, `shockwaveRadius`, or
`meleeExtraHits` to generic attack runtime types. Those belong in behavior
params and behavior modules.

Current legacy weapon aggregation still exposes convenience fields on
`EffectiveWeapon`. `combat/behaviorInstances.ts` is the compatibility bridge
that converts those fields into behavior instances. Future imported weapons,
skills, and augmentation stones should provide behavior instances directly.

## Built-In Behaviors

| ID | Kind | Affinity | Module |
| --- | --- | --- | --- |
| `behavior-001` | Scatter | Projectile | `combat/behaviors/scatter.ts` |
| `behavior-002` | Penetrate | Projectile | `combat/behaviors/projectileContinuation.ts` |
| `behavior-003` | Follow | Projectile | `combat/behaviors/follow.ts` |
| `behavior-004` | Ricochet | Projectile | `combat/behaviors/projectileContinuation.ts` |
| `behavior-005` | Multi-hit | Melee | `combat/behaviors/multihit.ts` |
| `behavior-006` | Shockwave | Melee | `combat/behaviors/shockwave.ts` |
| `behavior-007` | Aftershock | Melee | `combat/behaviors/aftershock.ts` |
| `behavior-008` | Life Drain | Any | sustain runtime |
| `behavior-009` | Shield | Any | sustain runtime |
| `behavior-010` | Inflict Status | Any | damage runtime |

IDs are stable authored IDs. Do not rename them to match display names, tiers,
or tuning changes.

## Imported Content Boundary

Imported content should reference registered behavior IDs with params. Custom
script behavior is a long-term goal, but it is intentionally rejected by the
current validator with a `custom-script-deferred` diagnostic.

Use `validateImportedBehaviorReferences` before accepting imported behavior
data. It checks:

- registered behavior IDs;
- weapon affinity compatibility;
- parameter object shape;
- unknown parameter names;
- known status effect IDs.

## Adding A Built-In Augmentation

1. Add a stable behavior ID to `combat/behaviorRegistry.ts`.
2. Add a behavior module under `combat/behaviors/`.
3. Return patches from event hooks instead of mutating state.
4. Add compatibility inference in `content.ts` if legacy trait fields need to
   map to the behavior.
5. Keep UI summaries and authored trait data separate from the stable behavior
   ID.
