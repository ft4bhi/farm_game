# FarmForge

FarmForge is a browser-based programming/automation game. You write small
Python-style programs that drive a FieldBot robot across a farm to plant,
water and harvest carrots. As you complete challenges you unlock new language
features — sensors, loops, then functions — turning manual scripts into fully
autonomous farming.

The whole game, including the scripting language, is built from scratch on the
web platform. There is no `eval`, no `new Function`, and no CDN: the game
parses and interprets your code itself, so it works fully offline and is safe
to run arbitrary player code against the simulation.

```
PLAYER CODE
     ↓
CUSTOM PYTHON-LIKE LANGUAGE (FarmScript)
     ↓
AST
     ↓
INTERPRETER (generator-based, no eval)
     ↓
GAME ACTIONS (plant, water, harvest, move)
     ↓
SIMULATION (world + crops + resources + danger)
     ↓
GAME STATE
     ↓
CANVAS (60fps renderer + HUD + editor)
```

## Overview

- **Stack:** Next.js 15 (App Router, React 19), TypeScript (strict), Canvas 2D,
  Monaco editor, custom lexer/parser/interpreter, Vitest.
- **Goal:** progress through three challenges — *First Crop*, *Small Field*,
  *Automation* — each unlocking a new capability upgrade.
- **Play:** `npm install && npm run dev`, open http://localhost:3000, press
  **Run** with the starter script loaded.
- **Tests:** `npm test` (67 tests across simulation, parser, runtime, runner,
  save system, world and worker).
- **Build:** `npm run build` (type-checks via `tsc --noEmit` equivalent inside
  `next build`; `npm run lint` runs the same type check directly).

## Architecture

The codebase is split into layered, testable modules:

```
src/
├── data/          # Pure data: tiles, crops, resources, commands, challenges,
│                  # upgrades, scripts, world map, balance config
├── game/          # World, Grid, Tile, Worker, GameState + the Game facade
│                  # and GameLoop (rAF driven)
├── engine/        # Simulation + systems: ActionSystem (commands),
│                  # CropSystem (plant/water/harvest/growth), ResourceSystem,
│                  # TickSystem (operation budget)
├── progression/   # ChallengeManager + UnlockSystem (feature gating)
├── scripting/
│   ├── lexer/     # Tokenizer (indentation-aware, Python-like)
│   ├── parser/    # Recursive-descent parser → AST
│   ├── runtime/   # Interpreter (generators), Values, RuntimeContext, Scope
│   ├── commands/  # CommandRegistry (data-driven command table view)
│   ├── ScriptRunner.ts  # Drives the interpreter against the simulation
│   └── testHarness.ts   # Synchronous interpreter+simulation test driver
├── persistence/   # SaveSystem (localStorage, versioned, validated)
├── events/        # EventBus (typed, zero-dependency pub/sub)
├── rendering/     # Canvas renderer: camera, world, crops, worker, effects
└── components/    # React UI: GameShell, console, challenge panel, controls,
                   # resource bar, MonacoField/CodeEditor
```

### Data flow on a player action

1. The UI calls `game.run()`, which snapshots the world and starts the
   `ScriptRunner`.
2. `ScriptRunner` lexes + parses the script into a `Program`, then creates an
   `Interpreter` generator and drives it inside an async loop.
3. The interpreter yields `HostRequest`s for game commands; the runner forwards
   each to `simulation.executeCommand(...)`.
4. `ActionSystem` applies the action in the simulation: soil/crop checks,
   resource costs, growth updates, event emission.
5. The result is sent back into the generator; the program continues.
6. The `GameLoop` (rAF) advances passive growth and renders the world each
   frame; the HUD reacts to emitted events.

### Decoupling rules

- The simulation and scripting layers never touch the DOM or the React tree.
- They communicate exclusively through the typed `EventBus`.
- The interpreter has **no notion of time**: it yields, and the runner decides
  pacing. This is what makes exact, deterministic tests possible.

## Game loop

`GameLoop` drives `frame(dt, now)` on `requestAnimationFrame`. Each frame:

1. `simulation.update(dt)` applies passive crop growth and advances world time.
2. `renderer.render(now)` draws the camera-fitted world, crops, worker and any
   in-flight particle effects.

Separately, the `ScriptRunner` loop runs **in lock-step with the interpreter**:
it yields a `LineStep` for every statement (to highlight the current line) and
a `HostRequest` for every command. Between steps it sleeps according to the
selected execution speed, and it yields back to the browser every
`EXECUTION_LIMITS.throttleEvery` steps so long loops can't freeze the tab.

Safety limits (from `data/config.ts`):

| Setting              | Value    | Meaning                                     |
| -------------------- | -------- | ------------------------------------------- |
| `maxInstructions`    | 200,000  | Interpreter steps per run                   |
| `maxActions`         | 4,000    | Paced game actions (move/plant/water/harvest) |
| `throttleEvery`      | 2,000    | Yield to paint before resuming a tight loop |
| Speed tiers          | 800/400/110 ms | One paced action at slow/normal/fast     |
| `PASSIVE_GROWTH_TICK_SECONDS` | 0.5     | Passive growth time quantum per second      |

## Simulation

`Simulation` is the single source of truth for game state:

```ts
new Simulation(bus)
sim.update(dtSeconds)            // passive growth + ticks
sim.executeCommand(name, args)   // one command → ActionResult
sim.capture()                    // fully serializable GameState
sim.restore(state)               // load / reset
sim.captureWorld() / restoreWorld() // run-start snapshot for RESET
```

The world is a 16×12 tile grid surrounded by a tree border with a small
irrigation pond and rocks:

```
T,,,,,,,,,,,,,,T     , = Grass (walkable)
T,,,,,,,,,,,,,,T     # = Soil  (walkable, plantable)
T,,,,,,,,,,,,,,T
T,,,,,,,,,,,,,,T
T,,,,########,,T
T,,,########,T,T
T,,,########,R,T     R = Rock (blocked)
T,,,########,R,T
T,,,########,,,T
T,,,,,,,,,,,,,T
T,,,,,,R,,,,,,,T
TTTTTTTTTTTTTTTT     T = Tree (blocked border)
```

The FieldBot starts at `(4, 10)` facing North; one `move(North)` places it on
the first soil tile.

### Systems

- **ActionSystem** — central command dispatch. Actions mutate the world and
  return `ActionResult { ok, returnValue, reward? , message? }`; errors throw
  `GameActionError` (walking into a tree, planting on grass, harvesting
  early, …).
- **CropSystem** — planting (requires soil, a free tile and a seed resource),
  watering (adds `waterBoost` progress), harvesting (only MATURE crops, grants
  rewards), and passive growth (`growTime` seconds of passive growth ≈ mature
  progress; `dtSeconds / growTime` per update).
- **ResourceSystem** — minted resources (`carrot`, `coin`, `seed_carrot`),
  starting inventory 0/0/24.
- **TickSystem** — tracks used instructions/actions so the runner can enforce
  its budgets.

## Rendering

The renderer composites several layers each frame:

- `Camera` maps world→screen coordinates and fits the world to the canvas.
- `WorldRenderer` draws tiles from `TILE_DEFINITIONS` (color + detailColor +
  draw-order layer).
- `CropRenderer` draws crops with stage-aware shapes and growth interpolation
  (`getGrowthStage` / `getStageProgress`).
- `WorkerRenderer` draws the FieldBot and its facing direction.
- `EffectsRenderer` plays plant/harvest particles triggered by bus events.

The UI never touches the canvas: it only reads `game.hudSnapshot()` and listens
to events.

## Custom programming language (FarmScript)

FarmScript is a small Python-like language with indentation-based blocks.

```python
# Line comments
move(North)                 # a command call statement
plant(Carrot)

for i in range(5):
    if can_harvest():
        harvest()
    else:
        water()
    move(East)
```

Words like `if`, `elif`, `else`, `for`, `in`, `while`, `def`, `return`,
`and`, `or`, `not`, `True`, `False` and `None` are keywords. Everything else is
an identifier. Constants are also available as identifiers:
`North South East West`, `Grass Soil Water Rock Tree`, `Carrot`.

### Values

| Runtime value | Notes                                              |
| ------------- | -------------------------------------------------- |
| number        | integers and decimals                              |
| string        | double or single quoted (`"hi"`, `'hi'`)            |
| boolean       | `True` / `False`                                   |
| `None`        | like Python's None                                 |
| constant      | directions, tiles and crops (opaque symbols)       |
| range         | produced by `range(start, stop[, step])`, iterable |

Truthiness: `0`, `""`, and `None` are falsy; everything else is truthy.

### Operators

- Comparison: `== != < > <= >=`
- Arithmetic: `+ - * /`
- Boolean: `and or not`
- Assignment: `= += -= *= /=`

### Statements

- **Call:** `move(North)` — commands are described in the next section.
- **If/elif/else:** `if cond:` / `elif cond:` / `else:` with indented bodies.
- **For:** `for i in range(6):` iterates the range, binding `i`.
- **While:** `while cond:` repeats while the condition is truthy.
- **Functions:** `def name(a, b):` … `return value`. Function calls create a
  child scope that can read the global scope; recursion is supported.
- **Assignment:** `x = 1`, `total += harvest_reward` etc.

## Lexer

`scripting/lexer/Lexer.ts` tokenizes source into tokens covering numbers,
strings, identifiers, keywords, punctuation and operators, plus three
structural tokens that make the indentation grammar explicit:

- `NEWLINE` is emitted at the end of each logical line.
- `INDENT` / `DEDENT` are emitted when a line's indentation grows/shrinks, so
  the parser can treat a block as a kind of punctuation.

This mirrors Python's approach while keeping the parser simple: blocks are
"eating" a DEDENT, and `else`/`elif` are reached after a DEDENT-then-keyword.

Errors that arise at this stage are thrown as `ScriptSyntaxError` with the
1-based line number and column.

## Parser

`scripting/parser/Parser.ts` is a hand-written recursive-descent parser
producing typed AST nodes defined in `AST.ts`. Structure:

- `parseProgram` → list of statements until `EOF`.
- `parseStatement` dispatches on the leading token and records whether the
  statement opened a block (`if/for/while/def`), so the outer loop knows the
  block's trailing newline + DEDENT already were consumed.
- Expression precedence climbing:
  `or` → `and` → `not` → comparison → additive → multiplicative → primary
  (literals, names, calls, `(…)`, unary `-`).
- Grammar acceptance required (and now covered by 14 parser tests) includes:
  `else`/`elif` chains, one-line `if/else`, blocks followed by EOF, and the
  DEDENT handling after `def` bodies.

The AST is a discriminated union keyed on `kind`, so the interpreter can match
each node type exhaustively.

## Interpreter

`scripting/runtime/Interpreter.ts` is a tree-walking, **generator-based**
interpreter:

- It is never blocked: every statement yields a `LineStep`; every command call
  yields a `HostRequest { name, args, line }`.
- The **driver** (`ScriptRunner`) decides pacing, and sends the command result
  back into the generator via `generator.next(value)`. This is the mechanism
  that enables step-by-step animation, pause/resume, stopping, and
  deterministic tests — all without evaluating any risky JavaScript.
- Errors surface as `RuntimeError` (e.g. calling an unknown command, wrong
  arity, undefined name, hitting the instruction budget).
- `RuntimeContext` holds the global `Scope`, user-defined functions and the
  constant table (directions, tiles, crops built from `data/tiles.ts`,
  `data/crops.ts` and `data/commands.ts`).
- Values and helpers live in `Values.ts` (`langEquals`, `langToString`,
  `isTruthy`, `makeRange`).

### Feature gating

`ScriptRunner` consults the unlock system before dispatching each command. If
the required feature is not unlocked yet, the run stops with a message naming
the upgrade (e.g. “requires Field Sensors”). Features map to upgrades in
`progression/UnlockSystem.ts` + `data/upgrades.ts`.

## Game API (commands)

Commands are declared in `data/commands.ts` and shipped to the simulation via
`engine/ActionSystem.ts`. Each has a name, kind (`action` or `sensor`), arity
and the feature needed to use it.

| Command             | Kind    | Feature | Accepts / returns                                      |
| ------------------- | ------- | ------- | ------------------------------------------------------ |
| `move(dir)`         | action  | move    | `North/South/East/West`                                 |
| `plant(crop)`       | action  | plant   | `Carrot` (consumes `seed_carrot`)                      |
| `water()`           | action  | water   | adds crop progress on the tile below                   |
| `harvest()`         | action  | harvest | rewards `carrot + 1`, `coin + 1` when mature           |
| `can_harvest()`     | sensor  | sensor  | `True` if tile below has a mature crop                 |
| `get_ground_type()` | sensor  | sensor  | `Grass/Soil/Water/Rock/Tree`                           |
| `get_entity_type()` | sensor  | sensor  | crop constant or `None`                                |
| `get_position_x()`  | sensor  | sensor  | column of the FieldBot                                |
| `get_position_y()`  | sensor  | sensor  | row of the FieldBot                                   |
| `get_world_width()` | sensor  | sensor  | world width in tiles                                  |
| `get_world_height()`| sensor  | sensor  | world height in tiles                                 |

## How to add a command

1. **Declare it** in `data/commands.ts` (name, kind, arity, feature, description,
   arg hints). This automatically feeds autocomplete and the command table.
2. **Implement it** in `engine/ActionSystem.ts` (actions that mutate the world
   and emit events) — sensors return a value via `ActionResult.returnValue`.
   Use the standard pattern: validate → mutate → emit bus events → return.
3. **Vet it** in the runner: the command needs the right feature granted by an
   upgrade (see below), otherwise `ScriptRunner` will gate it.
4. **Test it** by extending `src/engine/farming.test.ts` and, if it should be
   callable from scripts, `src/scripting/runtime.test.ts`.

## How to add a crop

Everything is data-driven from `data/crops.ts`:

```ts
{
  id: "carrot",
  constant: "Carrot",        // how scripts refer to it: plant(Carrot)
  name: "Carrot",
  stages: { seed: 0.1, sprout: 0.35, growing: 0.7, mature: 1.0 },
  growTime: 30,              // seconds of passive growth to mature
  waterBoost: 0.25,          // progress added per water()
  seedResourceId: "seed_carrot",
  harvestReward: { carrot: 1, coin: 1 },
  description: "...",
}
```

Optionally add a seed/salable resource in `data/resources.ts`. Growth logic in
`game/Crop.ts` and `engine/CropSystem.ts` is generic, so new crops (with stage
thresholds and colors driven by `CROP_DEFINITIONS`) need no engine changes.

## How to add a challenge

Append a `ChallengeDefinition` to `data/challenges.ts`:

```ts
{
  id: "my_challenge",
  title: "...",
  goal: "...",
  condition: { type: "harvest_total", amount: 5 },
  rewards: { coin: 10 },
  sampleScript: "# shown in the challenge panel",
  order: 3,
}
```

Conditions supported today: `harvest_total` (lifetime harvests) and
`harvest_loop_run` (harvests within a single program run). Extend
`progression/ChallengeManager.ts` with a new condition handler if needed.
Completed challenges are persisted in the save.

## How to add an upgrade

Add an `UpgradeDefinition` to `data/upgrades.ts`:

```ts
{
  id: "my_upgrade",
  title: "...",
  description: "...",
  features: ["my_feature"],               // gates commands in the runner
  trigger: { type: "challenge", challengeId: "my_challenge" },
  order: 4,
}
```

`UnlockSystem` evaluates triggers (challenge completion or resource totals)
each game tick and emits `upgrade.unlocked` when a new one fires. If a feature
name is referenced by commands, add the human label in `CommandRegistry`.

## Save system

`persistence/SaveSystem.ts` persists the entire game — world tiles, crops,
worker, resources, progression, settings, and the player's script — to
`localStorage` under the key `farmforge.save.v1`.

- **Versioning:** every payload carries `version` and `savedAt`; the loader
  rejects unknown versions with a `SaveError`.
- **Validation:** the payload is shape-checked before it is trusted; corrupted
  data is cleared and reported rather than crashing the app.
- **Autosave:** the `Game` facade schedules a debounced save after any
  resource change, challenge completion or upgrade unlock, and also whenever
  the script changes.
- **Reset states:** a run snapshot is restored by **RESET**; **Reset All**
  (`game.resetAllProgress()`) clears the save and rebuilds a fresh farm.
- **Storage abstraction:** `StorageLike` makes the system fully testable
  without a browser (see `SaveSystem.test.ts`).

## Testing

`npm test` (Vitest, node environment) runs the whole suite with **no browser**
— simulation, scripting and persistence are all environment-agnostic:

| File                                   | What it covers                                      |
| -------------------------------------- | --------------------------------------------------- |
| `game/World.test.ts`                   | map integrity (16-wide rows), start tile, bounds    |
| `game/Worker.test.ts`                  | move validation, border/rock blocking, invalid dirs |
| `engine/farming.test.ts`               | plant/water/harvest, resource costs, sensors, growth|
| `scripting/lexer` + `parser.test.ts`   | token stream + full grammar (incl. one-liner if)    |
| `scripting/runtime.test.ts`            | language semantics end-to-end through the harness   |
| `scripting/ScriptRunner.test.ts`       | async runner: feature gating, errors, completion    |
| `persistence/SaveSystem.test.ts`       | save/load/clear and corrupted-data recovery         |

`scripting/testHarness.ts` provides `runScript(source, simulation, { maxSteps })`
and helpers (`runOk`, `expectSyntaxError`, `makeSimulation`) that drive the
interpreter synchronously against a real `Simulation` — this is what makes the
language testable in ms rather than against the browser.

## Future Django integration

FarmForge's engine is deliberately persistence- and transport-agnostic:

- `Simulation.capture()` already returns a `GameState` — a plain
  JSON-serializable object used by `SaveSystem`.
- Nothing in `game/`, `engine/`, `scripting/` or `progression/` touches the
  browser; only `persistence`/`components` do.
- A Django backend would simply replace the storage layer: proxy
  `SavePayload` to a REST/CSRF endpoint and swap `StorageLike` for the API
  client. The scripting layer can be reused verbatim (it is web-framework
  free), enabling server-side replay, leaderboards or an embedded challenge
  runner without reimplementing the language.