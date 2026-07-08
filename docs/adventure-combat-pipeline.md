# Adventure Combat Pipeline Plan

This plan covers the staged refactor for Adventure Mode combat so weapons,
skills, augmentation stones, and later imported content can extend combat
without adding more feature-specific branches to the main adventure loop.

## Goals

- Keep combat behavior modular and feature-oriented under `adventure/combat/`.
- Move augmentation logic out of the main runtime loop and into registered
  behavior modules.
- Give combat clear extension points similar to Unity-style event listeners:
  attacks are created, updated, resolved, modified, and completed through a
  small set of subscriber hooks.
- Make enemies, props, and later player targets use the same hit, damage, and
  knockback path whenever the same attack reaches them.
- Preserve stable authored IDs. Traits, stones, weapons, skills, and behaviors
  should keep type-plus-number IDs separate from names and descriptions.
- Support safe data-driven content first, then leave room for trusted local
  plugin behavior later.

## Non-Goals

- Do not introduce a full ECS unless entity scale or composition demands it.
- Do not move all gameplay into a generic `systems/` root. Combat should live
  inside the Adventure domain.
- Do not allow arbitrary imported JavaScript as the first plugin/content path.
  Imported content should initially reference registered behavior IDs with
  validated parameters.
- Do not revamp every combat feature in a single pass. The migration should be
  small enough that every stage can be tested against existing gameplay.

## Current Pain Points

- Projectile, melee, circle, prop, and enemy handling have grown as separate
  paths, so behavior parity is easy to lose.
- Augmentations such as Penetrate, Ricochet, Follow, Multi-hit, Shockwave, and
  Aftershock add direct conditional logic near core combat resolution.
- Derived attacks need to behave like real attacks, but their inheritance rules
  are currently implicit.
- Future imported weapons, skills, and augmentation stones need a stable
  behavior surface instead of access to the whole game state.

## Target Module Shape

```text
src/
  games/
    adventure/
      combat/
        types.ts
        pipeline.ts
        attacks.ts
        damage.ts
        targets.ts
        runtime.ts
        meleeRuntime.ts
        projectileRuntime.ts
        damageRuntime.ts
        collision.ts
        clans.ts
        drops.ts
        effects.ts
        knockback.ts
        particles.ts
        random.ts
        behaviorRegistry.ts
        behaviors/
          aftershock.ts
          follow.ts
          multihit.ts
          penetrate.ts
          ricochet.ts
          scatter.ts
          shockwave.ts
```

Suggested ownership:

- `types.ts`: shared combat event, attack, target, damage, and patch types.
- `pipeline.ts`: subscriber collection, event dispatch, ordering, and patch
  application.
- `attacks.ts`: attack construction and queue operations.
- `damage.ts`: damage calculation, healing, knockback payload creation, and
  combat text payload creation.
- `targets.ts`: shared enemy, prop, and player target resolution.
- `runtime.ts`: combat engine entry point called by the adventure coordinator.
- `meleeRuntime.ts`: melee-area attacks, growing-circle attacks, and
  melee-derived pending attacks.
- `projectileRuntime.ts`: projectile movement, Follow, wall/prop/enemy/player
  collisions, and Penetrate/Ricochet continuation.
- `damageRuntime.ts`: shared damage application for enemies, props, and the
  player, including drops, combat text, sustain, and status infliction.
- `collision.ts`: shared circle/object, projectile path, dungeon wall, and
  world-bound collision helpers.
- `drops.ts`, `effects.ts`, `knockback.ts`, `particles.ts`, `random.ts`:
  focused runtime helpers used by combat and, where appropriate, the adventure
  coordinator.
- `behaviorRegistry.ts`: maps behavior IDs/kinds to built-in implementations.
- `behaviors/*`: one focused module per built-in augmentation behavior.

This keeps combat as an Adventure domain rather than creating a global systems
folder.

## Runtime Boundary

`state.ts` should coordinate Adventure Mode state, not run the combat engine.
It owns high-level tick order, movement, enemy AI, scene transitions, shop and
inventory operations, hotbar use, and death/respawn orchestration.

`combat/runtime.ts` owns the combat execution phase. It receives the current
combat slices, advances pending melee and growing-circle attacks, advances
projectiles, applies subscriber patches, and returns updated slices to the
coordinator.

Current combat ownership:

- weapon release creates a melee attack or projectile batch through combat
  runtime helpers;
- delayed melee attacks and growing circles are advanced by `runtime.ts` via
  `meleeRuntime.ts`;
- projectile steering, collision, continuation, and wall bounce handling are
  advanced by `projectileRuntime.ts`;
- enemy, prop, and player damage uses `damageRuntime.ts`;
- behavior modules remain small subscribers that emit patches and never mutate
  Adventure state directly.

Runtime attacks and pending attacks carry behavior instances in a `behaviors`
array. The combat engine should not add new top-level attack fields for every
augmentation. For example, Aftershock tuning lives in a `behavior-007` payload,
Shockwave tuning lives in a `behavior-006` payload, and the melee runtime only
asks the matching behavior module/subscriber to interpret those params.

`combat/behaviorInstances.ts` currently converts legacy `EffectiveWeapon`
aggregation fields into this behavior-instance shape. This keeps existing
trait definitions and UI stable while giving future imported weapons, skills,
and stones a direct serializable payload format.

## Core Model

Combat should treat projectile shots, melee areas, and growing circles as
runtime attacks with different shapes:

```ts
type CombatAttack =
  | ProjectileAttack
  | MeleeAreaAttack
  | GrowingCircleAttack;
```

Each attack carries:

- a stable runtime ID;
- source entity reference;
- weapon or skill source metadata;
- affinity, such as `melee`, `ranged`, or later `skill`;
- shape data;
- base damage and knockback data;
- inherited behavior context;
- serializable behavior instances;
- hit tracking, if the attack can hit the same target only once;
- travel, lifetime, or completion data.

Targets should be normalized as references:

```ts
type CombatTargetRef =
  | { kind: 'enemy'; id: string }
  | { kind: 'prop'; id: string }
  | { kind: 'player'; id: string };
```

The resolver should not care whether a target is a minion or a prop once hit
detection has produced a `CombatTargetRef`.

## Subscriber Hooks

The first hook set should stay small:

- `onAttackRelease`: modify or spawn attacks when a source attack is released.
- `onAttackCollision`: resolve dodge, evasion, or collision-time filtering
  before the target is considered hit.
- `onAttackStep`: modify attack movement, steering, or lifetime per tick.
- `onAttackHit`: react to a hit before completion rules are applied.
- `onDamageBeforeApply`: modify damage, knockback, status chance, or healing.
- `onDamageAfterApply`: react after damage is committed.
- `onAttackComplete`: react when an attack ends.

Examples:

- Follow subscribes to `onAttackStep` for projectile steering.
- Penetrate subscribes to `onAttackHit` and adjusts remaining hit capacity.
- Ricochet subscribes to `onAttackHit`, changes projectile velocity, and resets
  travel distance.
- Multi-hit subscribes to `onAttackHit` or `onDamageBeforeApply` to add
  repeated damage checks to the same target.
- Shockwave subscribes to `onAttackRelease` and spawns a
  `GrowingCircleAttack`.
- Aftershock subscribes to `onAttackRelease` and spawns delayed melee attacks
  that are real attacks and can trigger compatible downstream behavior.

## Patch-Based Results

Subscribers should not directly mutate global adventure state. They should
return patches that the combat pipeline applies in a deterministic order.

Initial patch kinds:

- `modifyAttack`
- `modifyDamage`
- `replaceDamage`
- `damageTarget`
- `healTarget`
- `knockbackTarget`
- `spawnAttack`
- `spawnProjectile`
- `spawnVisualEffect`
- `addCombatText`
- `completeAttack`
- `cancelDamage`
- `applyStatus`

This gives behavior modules power over combat while keeping state writes in one
auditable place.

## Deterministic Ordering

Subscriber order must be deterministic for repeatable gameplay and future
multiplayer safety.

Recommended ordering:

1. Source-owned built-in behavior.
2. Weapon behavior.
3. Equipped augmentation stones in socket index order.
4. Temporary buffs and status effects.
5. Global encounter modifiers.

Within the same bucket:

1. behavior priority;
2. stable behavior ID;
3. stable trait or item ID.

Socket index order matters because the player can choose a slot manually and
the UI should not auto-arrange equipped stones.

## Data-Driven Behavior

Current trait data can migrate toward this shape:

```json
{
  "id": "trait-01",
  "name": "Aftershock I",
  "affinity": "melee",
  "behaviors": [
    {
      "kind": "behavior-01",
      "params": {
        "count": 1,
        "damageMultiplier": 0.6,
        "delayMs": 180,
        "gapMultiplier": 1
      }
    }
  ]
}
```

The exact ID prefix can be chosen during migration, but behavior IDs should
remain stable and non-semantic. Display names, descriptions, tiers, affinity,
and parameter values should stay separate from IDs.

The first import path should validate JSON and only allow registered behavior
kinds with schemas. Later, a trusted local plugin layer can expose subscriber
factories, but that should be a separate security and tooling decision.

## Derived Attack Inheritance

Derived attacks need explicit inheritance rules.

Recommended default:

- A derived attack inherits source, team, weapon affinity, owner stats, and
  compatible equipped augmentations.
- A behavior may opt out of inheriting itself to prevent accidental recursion.
- A behavior may opt in to self-recursion only with a hard depth or spawn count
  limit.
- Every spawned attack carries a `generation` or `depth` value.

Examples:

- Aftershock spawns real melee attacks. Those attacks should trigger Shockwave
  and Multi-hit.
- Aftershock should not keep creating more Aftershock attacks unless a later
  design explicitly enables recursive behavior with a limit.
- Shockwave spawns a growing circle attack. The circle should apply normal
  damage and knockback to enemies and props through the shared target path.

## Staged Migration

### Stage 0: Document and Approve

Deliverables:

- Add this plan to `docs/`.
- Review event names, patch model, subscriber ordering, and inheritance policy.

Acceptance:

- No gameplay code changes yet.
- We agree on the direction before implementation begins.

### Stage 1: Extract Combat Types and Patch Shell

Deliverables:

- Add `adventure/combat/types.ts`.
- Add `adventure/combat/pipeline.ts` with event dispatch and no-op patch
  application.
- Keep existing combat behavior in place, but route one low-risk event through
  the pipeline for shape validation.

Acceptance:

- Existing Adventure gameplay works unchanged.
- Build passes.
- Main runtime loop can call a combat pipeline entry point without behavior
  migration.

### Stage 2: Unify Targets, Damage, Knockback, and Combat Text

Deliverables:

- Add shared target resolution for enemies, props, and player targets.
- Move damage, knockback payloads, healing text, and damage text into combat
  helpers.
- Make props and enemies go through the same hit result path after detection.

Acceptance:

- Normal melee, projectile, and circle attacks affect enemies and props
  consistently.
- Damage numbers use the shared combat text path.
- Knockback direction uses the current attack/contact data rather than stale
  source positions.

### Stage 3: Convert Pending Attacks to First-Class Combat Attacks

Deliverables:

- Replace separate pending melee and pending circle queues with a single combat
  attack queue.
- Implement shape-specific stepping for melee areas, projectiles, and growing
  circles.
- Keep current authored trait fields working through adapters.

Acceptance:

- Normal melee attacks still land correctly.
- Shockwave circles grow and hit through the shared target path.
- Aftershock attacks are registered as real melee attacks.

### Stage 4: Move Built-In Augmentations Into Subscribers

Deliverables:

- Move melee augmentations into behavior modules first:
  - Multi-hit
  - Shockwave
  - Aftershock
- Move ranged augmentations next:
  - Scatter
  - Follow
  - Penetrate
  - Ricochet
- Remove augmentation-specific branching from the main adventure loop.

Acceptance:

- Chained melee behavior works: Aftershock can trigger Shockwave and Multi-hit.
- Ricochet still resets maximum travel distance after every deflection.
- Follow continues to steer ricocheted projectiles.
- `state.ts` no longer contains per-augmentation implementation details.

### Stage 5: Migrate Trait Definitions to Behavior Lists

Deliverables:

- Add data-only behavior references to trait definitions.
- Keep compatibility adapters for old fields until all current traits migrate.
- Add validation for affinity and behavior parameters.

Acceptance:

- Existing stones keep stable IDs.
- UI details can display affinity and behavior summaries from structured data.
- Incompatible melee/ranged augmentations remain blocked and greyed out.

### Stage 6: Prepare Imported Content Path

Deliverables:

- Add schemas for imported weapons, skills, augmentation stones, and behavior
  params.
- Add diagnostics for invalid behavior IDs, wrong affinity, bad parameter
  ranges, and blocked imports.
- Add a registry API that exposes only safe registered behavior kinds.

Acceptance:

- Imported JSON can describe content using existing behavior IDs.
- Invalid imported content fails with clear designer-facing errors.
- No arbitrary code execution is required for imported content.

### Stage 7: Tests and Maintenance Docs

Deliverables:

- Add focused tests for subscriber ordering, patch application, target parity,
  derived attack inheritance, and recursion limits.
- Update Adventure docs with the combat event lifecycle.
- Add examples for adding a new built-in augmentation behavior.

Acceptance:

- A future augmentation can be added by creating a behavior module and data
  entry, without editing the main adventure loop.
- Combat behavior remains deterministic under stable input.

## Approved Decisions

- `onAttackHit` runs after hit detection. Dodge, evasion, and similar logic
  should happen earlier through `onAttackCollision`.
- Damage should support numeric modifier patches and direct replacement patches.
  Direct replacement is represented separately as `replaceDamage`.
- Shockwave should trigger from attack release, so the event is named
  `onAttackRelease` rather than `onAttackCreate`.
- Aftershock should not inherit itself by default. It should inherit other
  compatible behavior such as Shockwave and Multi-hit.
- Custom script behavior is part of the long-term design, but it is deferred.
  The current version should begin with registered built-in behavior and
  validated data references.

## Recommended First Implementation Slice

After approval, the safest first coding slice is Stage 1 plus the non-invasive
parts of Stage 2:

1. Add combat types and a patch pipeline shell.
2. Extract shared target and damage helpers.
3. Keep current augmentation behavior intact.
4. Verify that enemies and props use the same damage/knockback/combat text
   path before moving augmentation logic.

This gives us a better foundation without trying to move every combat behavior
at once.

## Implementation Progress

- Stage 1 is started:
  - `adventure/combat/types.ts` owns combat event, patch, target, attack, and
    effect types.
  - `adventure/combat/pipeline.ts` can dispatch ordered subscribers and returns
    collected patches.
  - The main combat flow can call `dispatchCombatEvent`.
- Stage 2 is started:
  - `adventure/combat/targets.ts` owns shared target key helpers.
  - `adventure/combat/damage.ts` owns damage and healing combat text helpers.
  - Enemy, prop, and player damage application now routes through a shared
    runtime helper in `state.ts`, reducing divergent damage, text, loot, and
    prop particle paths.
- Stage 3 is started:
  - `adventure/combat/attacks.ts` can adapt current melee, projectile, and
    growing circle runtime data into first-class combat attack payloads.
  - `onAttackRelease` and `onAttackStep` now receive typed attack payloads.
  - Pending melee and growing circle attacks now share one `pendingAttacks`
    queue with kind-tagged entries.
  - Multiplayer snapshot rebasing now adjusts pending attack timestamps by
    attack kind.
  - Aftershock-derived Shockwaves recompute their damage from the derived
    attack damage. For example, `20 -> 10` shockwave, then `10 -> 5`, then
    `5 -> 3` when using a 50% shockwave ratio.
- Stage 4 is started:
  - Multi-hit, Shockwave, and Aftershock now live in behavior modules under
    `adventure/combat/behaviors/`.
  - The melee resolver dispatches `onAttackRelease` and `onAttackHit`, then
    applies generic behavior patches for extra damage, visual effects, and
    pending attack spawns.
  - Projectile continuation for Penetrate and Ricochet now lives in a behavior
    module and resolves through `onAttackHit` modify-attack patches.
  - Ricochet can now bounce on dungeon wall hits as well as enemy and prop
    hits.
  - Follow steering now lives in a behavior module and resolves through
    `onAttackStep` modify-attack patches.
  - Dungeon wall Ricochet now reflects against the wall normal instead of
    reversing along the incident path.
- Stage 4 is complete for current built-in augmentation behavior:
  - Scatter projectile spawning now lives in a behavior module and resolves
    through `onAttackRelease` modify/spawn attack patches.
  - Follow, Penetrate, Ricochet, Multi-hit, Shockwave, and Aftershock all have
    behavior modules.
- Stage 5 is started:
  - `adventure/combat/behaviorRegistry.ts` defines stable behavior IDs separate
    from display names and implementation kinds.
  - Traits expose a `behaviors` list. Existing legacy trait fields are still
    accepted and are converted into behavior references during validation.
  - Runtime effective weapon aggregation now reads combat augmentation behavior
    references for projectile, melee, sustain, shield, and status behaviors.
  - Ordinary stat modifiers such as damage, range, radius, and attack speed
    remain scalar trait fields for now.
- Stage 6 is complete for the first import boundary:
  - `adventure/combat/importValidation.ts` validates imported behavior
    references.
  - Diagnostics cover invalid behavior IDs, wrong weapon affinity, invalid
    parameter values, unknown status IDs, and deferred custom scripts.
  - Custom script behavior remains intentionally disabled.
- Stage 7 is complete for this migration slice:
  - `docs/adventure-combat-behaviors.md` documents runtime flow, built-in
    behavior IDs, import validation, and how to add a built-in augmentation.
  - `adventure/combat/smokeTests.ts` provides compile-checked smoke coverage
    for subscriber ordering and import validation.
  - `npm run build` is the verification command until a dedicated test runner
    is added.
