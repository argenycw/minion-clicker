# Adventure Dungeon Generation Plan

## Goal

Move dungeon generation from one mostly linear generator into a modular pipeline where the core controls flow and feature modules own room shape, graph rules, encounters, dressing, and render geometry.

The target feel borrows proven 2D dungeon patterns:

- The Binding of Isaac: readable room graph, main path plus optional branches, clear special-room roles.
- Enter the Gungeon: authored room templates with sockets, enemy/prop zones, and encounter identity.
- Zelda-style dungeons: door/socket constraints, room silhouettes, and intentional traversal beats.
- Hades: encounter modules that own combat pacing and reward intent.

## Design Principles

- `generateDungeon` should become an orchestrator, not the owner of every rule.
- Modules should receive explicit generation context and return typed output.
- Authored content should live in definitions/templates; procedural systems should consume it through stable interfaces.
- Runtime systems should use final generated geometry, encounters, and entities without knowing which module created them.
- Every new dungeon content item should use stable type-plus-number IDs, such as `room-template-01`, `encounter-01`, or `theme-01`.

## Target Pipeline

```text
generateDungeon
  -> makeDungeonGenerationContext
  -> buildDungeonGraph
  -> assignRoomRoles
  -> selectRoomTemplates
  -> placeRooms
  -> connectDoorSockets
  -> buildFloorGeometry
  -> populateEncounters
  -> dressRooms
  -> placeObjectives
  -> emitDungeonInstance
```

The core generator calls each step and validates the result. Each step is owned by a focused module.

## Proposed File Structure

```text
adventure/
  dungeons/
    definitions.ts
    types.ts
    generate.ts
    graph.ts
    placement.ts
    geometry.ts
    objectives.ts
    rooms/
      types.ts
      templates.ts
      system.ts
    encounters/
      types.ts
      definitions.ts
      system.ts
    dressing/
      types.ts
      definitions.ts
      system.ts
    themes/
      types.ts
      definitions.ts
      system.ts
```

`generate.ts` should import the modules and coordinate. It should not contain room-template-specific, encounter-specific, or prop-layout-specific logic.

## Core Types

Add these concepts gradually:

- `DungeonGenerationContext`: seed, dungeon definition, depth, rank, random helpers, IDs, tuning values.
- `DungeonGraph`: logical nodes and edges before geometry exists.
- `DungeonRoomRole`: `start`, `combat`, `treasure`, `shop`, `event`, `clutter`, `elite`, `boss`, `exit`.
- `RoomTemplate`: authored geometry, doorway sockets, spawn zones, prop zones, enemy zones, objective anchors.
- `DoorSocket`: side, offset range, width, tag constraints.
- `PlacedRoom`: selected template plus world transform and resolved sockets.
- `DungeonFloorGeometry`: final walkable rects/polygons and exposed edge segments for rendering/collision.
- `EncounterDefinition`: enemy groups, waves, reward intent, difficulty weight, room role compatibility.
- `DressingDefinition`: prop pools, blocker rules, decorative-only rules, clear-zone constraints.

## Stage 1: Split Current Generator Without Behavior Change

Objective: create module boundaries while preserving current output as much as possible.

Tasks:

- Move connected-cell graph logic from `generate.ts` into `graph.ts`.
- Move room shape selection and walkable footprint logic into `rooms/system.ts`.
- Move corridor creation into `placement.ts`.
- Move prop/object generation into `dressing/system.ts`.
- Move boss/chest/stairs/exit placement into `objectives.ts`.
- Keep current `DungeonInstance` shape unchanged.

Expected result: same playtest behavior, smaller `generate.ts`, clearer ownership.

## Stage 2: Room Graph With Roles

Objective: generate dungeon pacing before geometry.

Tasks:

- Add `DungeonGraphNode` with stable runtime IDs, depth index, role, and branch tags.
- Build a main path from start to stairs or boss.
- Add optional branches for treasure, clutter, event, or elite rooms.
- Use depth and rank to tune branch count and special-room chances.
- Keep boss floor as a specialized graph with a single boss room plus reward/exit anchors.

Core responsibility:

- Decide graph length and validate connectivity.

Module responsibility:

- Role assignment rules live in `graph.ts` and/or theme definitions.

## Stage 3: Room Template System

Objective: replace rectangle-first rooms with authored, modular templates.

Tasks:

- Add `RoomTemplateDefinition` records in `rooms/templates.ts`.
- Each template includes:
  - stable ID
  - supported roles
  - footprint polygon
  - walkable polygons or rect decomposition
  - doorway sockets
  - spawn zones
  - enemy zones
  - prop zones
  - objective anchors
  - weight/tags
- Port current rectangle, L-shape, clutter, and boss room into templates.
- Select templates by role, theme, depth, and available doorway needs.

Core responsibility:

- Ask for a template that satisfies role and connection requirements.

Module responsibility:

- Template definitions and compatibility scoring live in `rooms/`.

## Stage 4: Socket-Based Placement And Corridors

Objective: connect rooms through doorway sockets instead of center-to-center corridors.

Tasks:

- Place rooms from graph traversal using sockets on matching sides.
- Generate corridors between chosen sockets.
- Reserve doorway openings in render geometry.
- Reject placements that overlap existing rooms unless explicitly allowed.
- Add fallback placement attempts for cramped graphs.

Expected visual gain:

- Corridors meet rooms at clean openings.
- L-shape rooms can choose doorway sockets that make visual sense.
- Border cleanup becomes data-driven instead of inferred per frame.

## Stage 5: Floor Geometry And Render Edges

Objective: generate render-ready floor/wall data once, not every frame.

Tasks:

- Add generated `floorPolygons`, `walkableAreas`, and `edgeSegments` to `DungeonInstance`.
- Move exposed-edge computation into `geometry.ts`.
- Renderer draws:
  - void background
  - floor polygons
  - corridor polygons
  - edge segments
  - props/entities/objectives
- Keep collision using `walkableAreas` until polygon collision is worth implementing.

Core responsibility:

- Store final geometry in runtime state.

Module responsibility:

- `geometry.ts` owns union/edge construction and simplification.

## Stage 6: Encounter Modules

Objective: make room combat extensible without adding branches to the generator.

Tasks:

- Add `EncounterDefinition` data.
- Encounter definitions specify compatible roles/templates, enemy pools, counts, waves, and reward intent.
- `encounters/system.ts` selects and instantiates encounters.
- Existing enemy scaling remains in progression systems, but encounter selection decides composition.

Examples:

- `encounter-01`: simple melee room.
- `encounter-02`: ranged crossfire.
- `encounter-03`: clutter room with low enemy count.
- `encounter-04`: elite guard.
- `encounter-05`: boss arena.

## Stage 7: Dressing Modules

Objective: make props, blockers, decorations, and room readability modular.

Tasks:

- Add dressing definitions by theme and room role.
- Prop placement uses zones from room templates.
- Blocker props must respect clear paths between doorway sockets and objectives.
- Decorative props may use looser rules.
- Dungeons can later support theme-specific prop packs without generator changes.

## Stage 8: Theme Definitions

Objective: make future dungeon themes content-driven.

Tasks:

- Move colors, prop pools, room-template weights, encounter weights, and enemy pools into `themes/`.
- `DungeonDefinition` references a theme ID.
- Theme can override role weights by depth or rank.

Example:

```ts
themeId: 'theme-01'
```

`theme-01` can represent the current cave.

## Stage 9: Validation And Debug Tools

Objective: make procedural changes safe.

Tasks:

- Add generator validation:
  - graph is connected
  - start exists
  - stairs or boss/exit exists
  - all rooms have reachable doorway sockets
  - spawn/objective anchors are inside walkable areas
  - props do not block required paths
- Add a debug overlay or console helper for:
  - room role labels
  - template IDs
  - doorway sockets
  - edge segments
  - encounter IDs

## Migration Order Recommendation

1. Stage 1 first, because it reduces generator size without changing design risk.
2. Stage 2 and Stage 3 together, because roles and templates depend on each other.
3. Stage 4 next, because socket corridors solve the current visual and layout problems.
4. Stage 5 after sockets, because edge generation becomes simpler once openings are explicit.
5. Stage 6 to Stage 8 after the geometry stabilizes.
6. Stage 9 can start small in Stage 2 and grow with every later stage.

## Deferred Decisions

- Whether collision should remain rect-based or move to polygon collision.
- Whether room templates should support rotation/mirroring in the first pass.
- Whether special rooms are visible on minimap before discovery.
- Whether doors can lock until encounters are cleared.
- Whether imported/plugin dungeon content can provide scripts or only data definitions.

## First Patch Proposal

For the next implementation patch, do Stage 1 only:

- Create `graph.ts`, `placement.ts`, `objectives.ts`, and `dressing/system.ts`.
- Move existing logic into those modules with minimal behavior change.
- Keep existing room templates in `rooms.ts` or rename it to `rooms/system.ts`.
- Add this plan's terms to types only where needed.
- Verify by build and quick playtest.

This gives us the modular surface before we start changing generation behavior.
