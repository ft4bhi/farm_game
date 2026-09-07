# ROLE

Act as a senior full-stack engineer, game-engine engineer, programming-language engineer, UI/UX designer, and technical architect.

You are building an ORIGINAL browser-based programming/automation game.

Working title:

# FarmForge

The game is inspired by the broad idea of controlling a farm through code, but it must NOT be a clone of any existing game.

Do not copy:
- names
- characters
- artwork
- UI
- maps
- dialogue
- exact progression
- source code
- exact game balance
- proprietary assets
- copyrighted documentation
- distinctive branding

We may use similar high-level gameplay concepts such as:
- programming a worker
- farming automation
- grid-based worlds
- functions such as movement/harvesting
- conditions
- loops
- variables
- sensors
- optimization

However, the implementation, visual identity, progression, game systems, terminology, world design, and content must be original.

---

# PRIMARY GOAL

Build a genuinely playable MVP.

This is NOT a mockup.

A new player must be able to:

1. Open the game.
2. See an original farm world.
3. See an autonomous farming robot.
4. Write Python-like code.
5. Execute the code.
6. Watch the robot execute the program.
7. Plant crops.
8. Water crops.
9. Wait for crops to grow.
10. Harvest crops.
11. Gain resources.
12. Complete a small challenge.
13. Unlock new programming capabilities.
14. Write loops.
15. Reuse functions.
16. Save progress.
17. Reload the page and continue.

The MVP must feel like a small real game, not a technical demo.

---

# CORE GAME CONCEPT

The player owns an experimental automated farm.

The player does not manually farm.

Instead, the player programs a small robot called the:

# FieldBot

The FieldBot understands a custom Python-like programming language.

The player's goal is to gradually transform a small manually programmed farm into an efficient automated farm.

The central gameplay loop is:

```text
WRITE CODE
     ↓
RUN PROGRAM
     ↓
ROBOT EXECUTES
     ↓
FARM CHANGES
     ↓
RESOURCES GENERATED
     ↓
UNLOCK NEW CAPABILITIES
     ↓
WRITE BETTER CODE
     ↓
AUTOMATE MORE
```

The long-term game should reward:

- programming ability
- algorithmic thinking
- optimization
- experimentation
- automation design

---

# TECHNOLOGY DECISION

Use:

- Next.js
- TypeScript
- HTML
- CSS
- Canvas 2D
- Monaco Editor
- Vitest for unit testing

Use the current stable versions compatible with the environment.

Use Next.js primarily for:

- application shell
- routing
- UI
- settings
- future authentication
- future API integration

Use Canvas for:

- farm
- robot
- crops
- world objects
- animations

Do NOT use DOM elements for every tile.

Do NOT use C++.

Do NOT introduce a game engine unless there is a compelling technical reason.

Do NOT use Django in the initial MVP.

---

# FUTURE BACKEND ARCHITECTURE

The MVP must be designed so that Django can be introduced later without rewriting the game engine.

Future architecture:

```text
                 Browser
                    │
          ┌─────────┴─────────┐
          │                   │
      Next.js              Game Engine
          │                   │
          │             TypeScript
          │                   │
          └─────────┬─────────┘
                    │
                 REST API
                    │
                 Django
                    │
               PostgreSQL
```

Django will eventually handle:

- authentication
- cloud saves
- player profiles
- achievements
- leaderboards
- challenge data
- script sharing
- analytics
- community features

But none of those should be required for the MVP.

The game itself must work offline/client-side except for normal application loading.

---

# MOST IMPORTANT ARCHITECTURAL RULE

Separate:

```text
UI
 ↓
INPUT
 ↓
SCRIPT LANGUAGE
 ↓
SCRIPT RUNTIME
 ↓
GAME ACTIONS
 ↓
SIMULATION
 ↓
GAME STATE
 ↓
RENDERER
```

Never allow:

```text
UI → directly modify Canvas/game state
```

Never allow:

```text
Interpreter → directly manipulate Canvas
```

Never put game rules inside rendering code.

The simulation must be testable without a browser or Canvas.

---

# PROJECT STRUCTURE

Use a modular structure similar to:

```text
src/
│
├── app/
│   ├── page.tsx
│   ├── game/
│   └── layout.tsx
│
├── components/
│   ├── GameShell.tsx
│   ├── CodeEditor.tsx
│   ├── GameCanvas.tsx
│   ├── ResourceBar.tsx
│   ├── Console.tsx
│   ├── ChallengePanel.tsx
│   └── ControlBar.tsx
│
├── game/
│   ├── Game.ts
│   ├── GameLoop.ts
│   ├── GameState.ts
│   ├── World.ts
│   ├── Grid.ts
│   ├── Tile.ts
│   ├── Worker.ts
│   ├── Crop.ts
│   └── Entity.ts
│
├── engine/
│   ├── Simulation.ts
│   ├── ActionSystem.ts
│   ├── TickSystem.ts
│   ├── ResourceSystem.ts
│   ├── CropSystem.ts
│   └── ChallengeSystem.ts
│
├── scripting/
│   ├── lexer/
│   │   ├── Lexer.ts
│   │   └── Token.ts
│   │
│   ├── parser/
│   │   ├── Parser.ts
│   │   └── AST.ts
│   │
│   ├── runtime/
│   │   ├── Interpreter.ts
│   │   ├── RuntimeContext.ts
│   │   └── RuntimeError.ts
│   │
│   ├── commands/
│   │   ├── CommandRegistry.ts
│   │   ├── move.ts
│   │   ├── plant.ts
│   │   ├── water.ts
│   │   ├── harvest.ts
│   │   └── sensors.ts
│   │
│   └── ScriptRunner.ts
│
├── rendering/
│   ├── Renderer.ts
│   ├── WorldRenderer.ts
│   ├── WorkerRenderer.ts
│   ├── CropRenderer.ts
│   └── EffectsRenderer.ts
│
├── progression/
│   ├── UpgradeSystem.ts
│   ├── ChallengeSystem.ts
│   └── UnlockSystem.ts
│
├── data/
│   ├── crops.ts
│   ├── upgrades.ts
│   ├── challenges.ts
│   ├── world.ts
│   └── commands.ts
│
├── persistence/
│   └── SaveSystem.ts
│
└── utils/
```

You may modify this structure if necessary, but preserve the architectural separation.

---

# GAME STATE

Create a serializable central GameState.

Conceptually:

```typescript
interface GameState {
    world: WorldState;
    worker: WorkerState;
    resources: ResourceState;
    progression: ProgressionState;
    execution: ExecutionState;
}
```

GameState must contain game state, not rendering state.

Do not store:

- Canvas objects
- DOM references
- animation handles
- React components

inside GameState.

---

# WORLD

Create an original grid-based farm.

Initial MVP size:

```text
16 × 12
```

The architecture must support larger worlds.

Never scatter:

```text
16
12
32
```

through the code.

Use:

```typescript
World(width, height)
```

and configuration data.

---

# TILE TYPES

MVP:

```text
GRASS
SOIL
WATER
ROCK
TREE
```

A crop occupies a SOIL tile.

Use data-driven tile definitions.

---

# WORLD DESIGN

Create an original starter map.

It should contain:

- central farm
- surrounding grass
- a small water source
- several decorative rocks
- a few trees
- blocked boundary
- a clear starting position

Do not reproduce the layout of another game.

The map should look intentionally designed.

---

# GRAPHICS

Use simple original graphics created with Canvas primitives.

No copyrighted assets.

Visual style:

```text
clean
friendly
slightly futuristic
technical
agricultural
```

Use:

- rectangles
- circles
- polygons
- simple textures
- subtle animation

Do not attempt photorealistic graphics.

The MVP should look polished despite simple graphics.

---

# FIELD BOT

Create an original robot design.

The FieldBot should have:

- compact body
- wheels
- small display
- antenna
- farming attachment

It should clearly communicate direction and movement.

Movement should be animated smoothly.

The robot occupies one grid cell logically.

---

# GAME SIMULATION

Separate simulation from rendering.

Simulation should expose methods such as:

```typescript
update(deltaTime)
executeAction(action)
getState()
```

The renderer receives state.

The renderer never determines game rules.

---

# TIME / TICK SYSTEM

Introduce a deterministic operation/tick concept.

Every action consumes a number of ticks.

Example initial balance:

```text
sensor query       1 tick
variable operation 1 tick
condition          1 tick
move               5 ticks
plant              8 ticks
water              5 ticks
harvest            8 ticks
```

These values are tunable.

Do not hardcode them throughout the code.

Create an action-cost configuration.

The player should eventually care about efficient programs.

However, do not make optimization brutally difficult in the MVP.

---

# PROGRAMMING LANGUAGE

This is one of the most important parts of the game.

Do NOT create a command language like:

```text
MOVE EAST
PLANT CARROT
```

as the primary final interface.

The game should use a Python-like programming language.

Example:

```python
move(East)
plant(Carrot)
water()
```

Later:

```python
if can_harvest():
    harvest()

move(North)
```

And:

```python
for i in range(5):
    move(East)
```

And:

```python
def harvest_row():
    for i in range(5):
        if can_harvest():
            harvest()
        move(East)
```

The language should look and feel like programming.

---

# IMPORTANT: DO NOT EMBED REAL PYTHON

Do not execute arbitrary Python in the browser.

Do not use:

```text
eval()
```

Do not execute user source code directly.

Do not depend on a Python server just to run scripts.

Create a controlled custom interpreter.

The interpreter only supports the game's defined language.

This is both safer and easier to control.

---

# LANGUAGE MVP

Support the following syntax.

## Values

Support:

```text
numbers
booleans
strings
directions
crop types
```

---

# VARIABLES

Example:

```python
count = 10
direction = East
```

Support:

```python
count = count + 1
```

---

# FUNCTION CALLS

Example:

```python
move(East)
plant(Carrot)
water()
harvest()
```

---

# CONDITIONS

Support:

```python
if can_harvest():
    harvest()
```

And:

```python
if get_ground_type() == Soil:
    plant(Carrot)
```

---

# LOOPS

Support:

```python
for i in range(5):
    move(East)
```

Also support:

```python
while condition:
    ...
```

Do not initially allow an uncontrolled infinite loop to freeze the browser.

Implement:

- instruction budget
- execution cancellation
- safe loop limits
- yielding between actions

For example:

```python
while True:
    harvest()
```

must be safely executable because automation is a core game mechanic.

The interpreter must yield control back to the game loop between actions.

---

# FUNCTIONS

Support:

```python
def harvest_row():
    for i in range(5):
        if can_harvest():
            harvest()

        move(East)
```

Functions may contain:

- statements
- conditions
- loops
- function calls

Keep function support simple in the MVP.

---

# BUILT-IN GAME API

The game language should expose a controlled API.

MVP:

```python
move(direction)

plant(crop)

water()

harvest()

can_harvest()

get_ground_type()

get_entity_type()

get_position_x()

get_position_y()

get_world_width()

get_world_height()
```

Constants:

```python
North
South
East
West

Grass
Soil
Water
Rock
Tree

Carrot
```

---

# MOVEMENT

Example:

```python
move(North)
```

Moves exactly one tile.

If blocked:

```text
RuntimeError:
Cannot move North.
The destination tile is blocked.
```

Do not silently teleport.

Do not allow movement outside the world.

---

# FARMING

## plant()

Example:

```python
plant(Carrot)
```

Rules:

- must stand on suitable soil
- tile must not already contain a crop
- player must have the required seed
- consumes action ticks

---

# water()

Example:

```python
water()
```

Rules:

- must be standing on a crop tile
- advances crop growth
- consumes action ticks

---

# harvest()

Example:

```python
harvest()
```

Rules:

- crop must exist
- crop must be mature
- reward player
- remove crop
- return tile to soil

---

# CROPS

MVP should only have:

```text
CARROT
```

Do not implement ten crops.

But make crops data-driven.

Example:

```typescript
interface CropDefinition {
    id: string;
    name: string;
    growthTicks: number;
    harvestReward: number;
    seedCost: number;
}
```

Adding a crop later should require adding data rather than rewriting the crop engine.

---

# CROP GROWTH

Carrot states:

```text
SEED
SPROUT
GROWING
MATURE
```

Watering advances growth.

Time may also advance growth depending on the chosen game design.

Use a deterministic system.

Render different visual stages.

---

# RESOURCE SYSTEM

MVP:

```text
Carrot
Coins
Seeds
```

Use a generic resource registry.

Example:

```typescript
resources.add("carrot", 1)
resources.remove("seed_carrot", 1)
```

The system must support additional resources later.

---

# ECONOMY

Keep MVP economy extremely simple.

Harvest carrot:

```text
+1 carrot
+1 coin
```

Seeds can initially be unlimited or inexpensive.

Do not build a complicated market.

The economy exists primarily to support progression.

---

# PROGRESSION

Create a small technology progression.

Initial state:

```text
Movement
Basic Farming
```

After completing the first challenge:

```text
Sensors
```

After earning enough resources:

```text
Loops
```

Then:

```text
Functions
```

Do not implement a huge technology tree.

Create the architecture for one.

---

# CHALLENGES

Create 3 MVP challenges.

## Challenge 1 — First Crop

Goal:

```text
Plant and harvest 1 carrot.
```

Reward:

```text
10 coins
```

## Challenge 2 — Small Field

Goal:

```text
Harvest 5 carrots.
```

Reward:

```text
25 coins
```

## Challenge 3 — Automation

Goal:

```text
Use a loop to harvest multiple crops.
```

Reward:

```text
Unlock reusable functions.
```

Challenges should be data-driven.

---

# CODE QUALITY CHALLENGE

The third challenge should encourage the player to write actual code.

Example:

```python
for i in range(5):
    if can_harvest():
        harvest()

    move(East)
```

Do not require a specific exact string.

Detect the gameplay result / capability used.

---

# PROGRAM EXECUTION

The program should NOT execute all at once.

Example:

```python
move(East)
harvest()
move(East)
```

The player should see:

```text
Robot moves
       ↓
pause
       ↓
Robot harvests
       ↓
pause
       ↓
Robot moves
```

The player must be able to understand what their program is doing.

---

# EXECUTION CONTROLS

Provide:

```text
RUN
PAUSE
STOP
STEP
RESET
```

### RUN

Execute normally.

### PAUSE

Pause execution.

### STOP

Terminate execution safely.

### STEP

Execute one meaningful action.

### RESET

Reset the robot/execution state to the beginning of the current run.

Do not reset permanent progression.

---

# EXECUTION SPEED

Provide:

```text
Slow
Normal
Fast
```

Example:

```text
Slow   800ms/action
Normal 400ms/action
Fast   100ms/action
```

Make these configurable.

---

# CODE EDITOR

Use Monaco Editor.

Features:

- syntax highlighting
- Python-like formatting
- line numbers
- autocomplete
- error markers
- keyboard shortcuts
- readable monospace font
- dark editor theme

Autocomplete should eventually understand:

```text
move
plant
water
harvest
can_harvest
get_ground_type
North
South
East
West
Carrot
```

For MVP, implement basic completion if practical.

Do not spend excessive time making a perfect IDE.

---

# ERROR REPORTING

Errors must point to the relevant line.

Example:

```text
Line 4

Unknown function:
harvest_crop()

Did you mean:
harvest()
```

Another example:

```text
Line 7

Cannot plant Carrot here.

The FieldBot must be standing on Soil.
```

Another:

```text
Line 3

Unknown direction:
Up

Valid directions:
North
South
East
West
```

Never allow invalid player code to crash the application.

---

# CONSOLE

Create an execution console.

Example:

```text
SYSTEM
Program started.

[Line 1]
Moving East

[Line 2]
Planting Carrot

[Line 3]
Watering

[Line 4]
Harvest complete

Program finished.
```

Errors:

```text
ERROR — Line 6
Cannot harvest.
Crop is not mature.
```

Allow the console to be cleared.

---

# CODE / GAME VISUAL CONNECTION

When a line executes:

- highlight the current line in Monaco
- visually animate the robot
- update the console
- update resource counters
- update crop visuals

This is important.

The player should be able to understand:

```text
CODE
 ↓
ACTION
 ↓
WORLD CHANGE
```

---

# GAME UI

Desktop layout:

```text
┌─────────────────────────────────────────────────────────┐
│ FarmForge             🥕 12   🌱 8   💰 25   ⚙          │
├──────────────────────────────────┬──────────────────────┤
│                                  │                      │
│                                  │       main.py        │
│                                  │                      │
│              FARM                │  1 move(East)        │
│                                  │  2 plant(Carrot)     │
│              🤖                  │  3 water()           │
│                                  │  4 move(West)        │
│       🌱   🌱   🌱              │                      │
│                                  │                      │
│                                  │  ▶ RUN               │
│                                  │  ⏸ PAUSE             │
│                                  │  ⏭ STEP              │
│                                  │                      │
├──────────────────────────────────┴──────────────────────┤
│ CONSOLE                                                  │
│ Program started...                                       │
└──────────────────────────────────────────────────────────┘
```

The farm must remain the visual focus.

---

# MOBILE / TABLET

Desktop is the primary experience.

On smaller screens:

```text
HUD
 ↓
GAME
 ↓
EDITOR
 ↓
CONTROLS
 ↓
CONSOLE
```

The application must remain usable.

Do not simply shrink desktop UI.

---

# CANVAS

Canvas should:

- resize with container
- maintain world aspect ratio
- support zoom architecture
- render only visible world content
- use world coordinates

Create:

```typescript
Camera
```

with:

```text
position
zoom
viewport
```

Even if MVP only needs a fixed camera.

---

# RENDERING

Rendering pipeline:

```text
clear
 ↓
background
 ↓
tiles
 ↓
objects
 ↓
crops
 ↓
robot
 ↓
effects
```

Do not mix simulation with rendering.

---

# ANIMATION

Implement:

### Robot movement

Smooth tile-to-tile interpolation.

### Crop growth

Simple transition between stages.

### Harvest

Small visual feedback.

### Watering

Small water effect.

Keep animation lightweight.

Respect reduced-motion preferences where practical.

---

# GAME LOOP

Use:

```typescript
requestAnimationFrame
```

Conceptually:

```text
requestAnimationFrame
        ↓
calculate delta
        ↓
simulation.update()
        ↓
renderer.render()
```

React should NOT drive every simulation frame.

Do not call React state updates 60 times per second for the entire game.

React handles UI.

Canvas handles game rendering.

---

# STATE MANAGEMENT

Do not make the entire game dependent on React state.

Use a game engine state container.

React subscribes to important changes such as:

```text
resources
challenge progress
execution state
console messages
```

Canvas reads the simulation state.

---

# EVENT SYSTEM

Implement a lightweight event bus.

Events:

```text
worker.moved
crop.planted
crop.watered
crop.harvested
resource.changed
program.started
program.paused
program.stopped
program.finished
program.error
challenge.progress
challenge.completed
upgrade.unlocked
```

Systems should communicate through events where appropriate.

Avoid creating a huge event framework.

---

# SAVE SYSTEM

MVP must work without a backend.

Use browser persistence.

Save:

```text
resources
farm state
progression
completed challenges
unlocked commands
current script
```

Create:

```typescript
SaveSystem.save()
SaveSystem.load()
SaveSystem.reset()
```

Handle corrupted save data gracefully.

---

# SECURITY

The scripting system is untrusted user input.

Never use:

```javascript
eval()
new Function()
```

to execute player code.

Never execute arbitrary JavaScript generated from player code.

The custom interpreter must control every available operation.

---

# PERFORMANCE

The MVP world is small, but architecture should support larger maps.

Avoid:

- unnecessary React renders
- DOM tile rendering
- unbounded loops
- huge synchronous interpreter operations
- memory leaks
- timers that continue after stopping
- animation frames that continue after leaving the game

Stopping/resetting the game must clean up:

- timers
- animation frames
- interpreter execution
- subscriptions

---

# TESTING

Use Vitest.

Test the game engine independently from the UI.

Minimum tests:

## World

- create world
- valid coordinates
- invalid coordinates
- blocked tile

## Worker

- move north
- move south
- move east
- move west
- blocked movement
- boundary movement

## Farming

- plant on soil
- reject planting on grass
- water crop
- crop growth
- reject immature harvest
- harvest mature crop
- reward resources

## Interpreter

- parse function call
- parse variable
- parse if
- parse for
- parse while
- parse function
- reject invalid syntax

## Runtime

- execute move
- execute plant
- execute water
- execute harvest
- execute loop
- execute function

## Save

- save state
- load state
- corrupted save handling
- reset

---

# DEVELOPMENT STRATEGY

Do NOT build the entire application in one giant implementation.

Work in vertical slices.

After each phase:

1. Run the application.
2. Test the feature.
3. Fix errors.
4. Keep the game playable.

---

# PHASE 1 — FOUNDATION

Create:

- Next.js project
- TypeScript
- basic UI
- Canvas
- game loop
- basic world
- robot

Deliverable:

A visible farm with a robot.

---

# PHASE 2 — SIMULATION

Implement:

- GameState
- Grid
- Worker
- movement
- collisions
- action system

Deliverable:

The robot can move through the world through internal game actions.

---

# PHASE 3 — SCRIPTING FOUNDATION

Implement:

- tokenizer
- parser
- AST
- interpreter
- ScriptRunner

Initially support:

```python
move(East)
```

Deliverable:

Player writes:

```python
move(East)
move(East)
```

and the robot executes it.

---

# PHASE 4 — FARMING

Implement:

```python
plant(Carrot)
water()
harvest()
```

Add crop growth.

Deliverable:

Player can program the complete farming loop.

---

# PHASE 5 — SENSORS

Implement:

```python
can_harvest()
get_ground_type()
get_position_x()
get_position_y()
```

Deliverable:

The robot can make decisions based on the world.

---

# PHASE 6 — CONTROL FLOW

Implement:

```python
if
for
while
range
```

Deliverable:

Player can automate a field.

---

# PHASE 7 — FUNCTIONS

Implement:

```python
def
return
```

Only the minimum required functionality.

Deliverable:

Player can write reusable farming algorithms.

---

# PHASE 8 — PROGRESSION

Implement:

- resources
- challenges
- unlocks
- basic economy

Deliverable:

The player has a reason to progress.

---

# PHASE 9 — SAVE

Implement:

- automatic saving
- loading
- reset

Deliverable:

Progress survives browser refresh.

---

# PHASE 10 — POLISH

Add:

- animations
- sound architecture placeholder
- better visual feedback
- editor integration
- error markers
- current-line highlighting
- responsive layout
- loading states
- empty states

---

# MVP STOP CONDITION

STOP adding features when the following loop works:

```python
for i in range(5):
    if can_harvest():
        harvest()

    move(East)
```

and the player can:

```text
write code
 ↓
run code
 ↓
watch robot
 ↓
farm
 ↓
earn resources
 ↓
complete challenge
 ↓
unlock programming capability
 ↓
write better automation
```

That is the MVP.

Do NOT add:

- multiplayer
- authentication
- cloud saves
- backend
- procedural generation
- dozens of crops
- combat
- crafting trees
- 3D
- multiplayer networking
- complex AI
- social features

until the MVP is genuinely fun and stable.

---

# FUTURE ARCHITECTURE

Design extension points for:

```text
multiple robots
machines
factories
transport systems
storage
energy
advanced crops
biomes
research tree
automation chains
leaderboards
cloud saves
accounts
script sharing
community challenges
```

But do not implement these now.

---

# IMPORTANT SOFTWARE ENGINEERING REQUIREMENTS

Use:

- strict TypeScript
- explicit types
- small classes/modules
- dependency boundaries
- data-driven definitions
- unit tests for game rules

Avoid:

- giant Game.ts
- giant React component
- global mutable variables
- circular imports
- duplicated game rules
- hardcoded crop behavior
- hardcoded upgrade behavior
- hardcoded challenge behavior
- Canvas logic inside React components

---

# DEFINITION OF DONE

The MVP is done only when:

[ ] npm install works

[ ] npm run dev works

[ ] npm run build works

[ ] farm renders

[ ] robot renders

[ ] robot moves

[ ] code editor works

[ ] player can write code

[ ] custom interpreter works

[ ] move() works

[ ] plant() works

[ ] water() works

[ ] harvest() works

[ ] crops grow

[ ] sensors work

[ ] if works

[ ] for works

[ ] while works safely

[ ] functions work

[ ] resources work

[ ] challenges work

[ ] progression works

[ ] RUN works

[ ] PAUSE works

[ ] STOP works

[ ] STEP works

[ ] RESET works

[ ] execution speed works

[ ] errors show line numbers

[ ] current code line is highlighted

[ ] console works

[ ] save works

[ ] load works

[ ] invalid programs do not crash the game

[ ] responsive layout works

[ ] tests pass

[ ] production build passes

---

# README

Create a README explaining:

1. Project overview
2. Architecture
3. Game loop
4. Simulation
5. Rendering
6. Custom programming language
7. Lexer
8. Parser
9. AST
10. Interpreter
11. Game API
12. How to add a command
13. How to add a crop
14. How to add a challenge
15. How to add an upgrade
16. Save system
17. Testing
18. Future Django integration

---

# FINAL INSTRUCTION

Do not just create a visually impressive interface.

Build the underlying game.

The most important engineering component is the relationship:

```text
PLAYER CODE
     ↓
CUSTOM PYTHON-LIKE LANGUAGE
     ↓
AST
     ↓
INTERPRETER
     ↓
GAME ACTIONS
     ↓
SIMULATION
     ↓
GAME STATE
     ↓
CANVAS
```

The most important product component is:

```text
PROGRAMMING
     +
AUTOMATION
     +
VISIBLE CONSEQUENCES
     +
PROGRESSION
```

Make the MVP small, polished, playable, and architecturally extensible.

Before declaring completion, actually run and test the game rather than assuming the implementation works.