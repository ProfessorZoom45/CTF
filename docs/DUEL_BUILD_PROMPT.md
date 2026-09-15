# Build Prompt — *Carry The Flame: Duel of the Catalysts*

A copy-paste prompt/spec for rebuilding the complete browser game from scratch.
It is written against the reference implementation already in this repo:

| File | Purpose |
|---|---|
| `duel.html` | **The deliverable** — one self-contained HTML/JS/CSS file (~760 KB, no network calls, no external assets) |
| `tools/build-duel.js` | Card-pool generator: reads `assets/js/data.js`, infers executable effects, injects the pool into `duel.html` between `<!--POOL_START-->` / `<!--POOL_END-->` |
| `tools/duel-card-pool.json` | Generated pool (provenance artifact, regenerable) |
| `test harnesses` | jsdom drivers: 31 mechanics assertions + UI-flow assertions |

Status of the reference build: **pool 1,613 cards · 864 with executable effects · 5 canon-legal starter decks · 31/31 mechanics tests green.**

---

## THE PROMPT

> Build a mechanically complete, single-file browser game called **Carry The Flame: Duel of the Catalysts** — a tactical card-lane battler that strictly implements **Carry The Flame! Canon v2.2**.
> Deliver exactly one file, `duel.html`, containing all HTML, CSS and JavaScript inline. No external assets, no CDN links, no fonts over the network, no build step. It must open by double-click and run offline at 60 FPS on desktop and mobile.
>
> Take the card database from this repository's own canon source, `assets/js/data.js` (`CTF_CARDS`, `CTF_SETS`, `CTF_META`, `CTF_STARTER_DECKS`), and the locked-rule constants from `assets/js/ctf-config.js` and `rules.html`.

### 1 · Canon rules to enforce (locked — do not improvise)

**Turn architecture.** Strict 7-phase state machine per turn:
`Turn Start → Draw → Ignition → Action → Battle → Resolution → End`.
`Turn Start` and `Ignition` auto-flow; `Draw`, `Action`, `Battle`, `Resolution`, `End` stop for player input.

**Turn 1.** The first player draws 1 card and the Battle Phase is skipped entirely for that turn.

**Empty deck.** Skipping a draw is legal and is **never** a game loss.

**Win resolution.** Three paths are live simultaneously, checked after every state change, with tie-break priority **Chi KO > 7 Kills > 7 Extractions**. A player at 0 Chi *loses* by Chi KO (the opponent wins). Kills and Extractions each need 7. If both players complete the same path at the same instant, it is a draw.

**Tributes & Normal Spawns.** Exactly 1 Normal Spawn **or** Set per turn. Level 1–4 = 0 Tributes; Level 5–6 = 1; Level 7+ = 2. Tributes are sent to the Void. Setting face-down in Counter Pressure consumes the same allowance. Cards whose text says they can only be Special Spawned cannot be Normal Spawned.

**Special Spawns & the Shotgun Rule.** Hard cap of **5 completed Special Spawns per turn**; a 6th attempt is an illegal action — reject it with no cost paid and no spawn. Whenever a Special Spawn, Fusion or Libra procedure succeeds, **the opponent immediately draws 1 card before on-spawn triggers fire**.

**Libra.** Two dedicated slots (the outermost back-row Trick Zones) hold **Normal Catalysts only**. While there they are treated as Tricks, their Levels become Scale values, and they cannot pay Catalyst costs. With both Scales set, Special Spawn any number of Catalysts whose Levels fall **strictly between** the Scales (max 5 per procedure). The whole procedure counts as **exactly 1 Special Spawn → exactly 1 Shotgun draw**.

**Fusion.** Fusion Deck of 0–15 Fusion Catalysts. Send the exact printed materials to the Void to Special Spawn the Fusion Catalyst; counts as 1 Special Spawn + 1 Shotgun draw.

**Great cards.** Any card whose name contains the standalone word **Great**. Max 5 in Main, 5 in Fusion, 10 combined, 1 copy per name. **Great cards can never enter the Box.** If a Great Catalyst loses a battle while in Counter Pressure, it goes to the Void, deals **0 Logic damage**, and awards the attacker **+1 Kill**. A non-Great Catalyst beaten in Counter Pressure is **Captured** into the attacker's Box instead (0 damage).

**Combat.**
- *Pressure vs Pressure*: higher wins; loser → Void, its controller takes Logic damage equal to the difference, winner scores +1 Kill. On a tie both go to the Void and **both** players score +1 Kill.
- *Pressure vs Counter Pressure*: if Pressure > Counter Pressure, the defender is Captured (non-Great) or Voided with +1 Kill to the attacker (Great); 0 Logic damage either way. Otherwise the attack is repelled — nothing is destroyed, no damage.
- *Direct Attack*: legal only when all 5 opposing Catalyst Zones are empty at **declaration AND resolution**; deals the attacker's full Pressure to Chi. Trick and Libra Zones never block it. Direct attacks award no Kill.

**End Phase Rights.** The active player chooses exactly one: **Extract** (move a captured non-Great card from your Box to RFG, +1 Extraction), **Rescue** (return a card from the opponent's Box to its owner's Main Deck, then shuffle), **Destroy Trick** (destroy 1 Trick on either side), or **Pass**. Every non-pass option costs sending 1 controlled Catalyst that was **not** summoned this turn to the Void. Then discard down to the 7-card hand limit.

**Chains.** LIFO resolution with priority passing. Once a **Counter Trick** is added to the chain, **Counter Lock** engages: only another Counter Trick may be chained above it. Concealed Tricks cannot be activated the turn they were Set; Counter Tricks may be played from hand in a response window.

**Field Tricks.** One per player; playing a new one replaces only your own.

### 2 · Card data pipeline

Write `tools/build-duel.js` that:
1. Loads `assets/js/data.js` (plus the deck patches) via `new Function(...)` and returns `CTF_CARDS` / `CTF_STARTER_DECKS`.
2. Emits a compact pool with short keys: `id, n (name), s (set), t (type code 0–5), lvl, pr, cp, al (alignment), k (kinds), gr (great), txt (printed text), fx (scripts)`.
   Type codes: `0 Catalyst · 1 Fusion · 2 Palm Trick · 3 Concealed Trick · 4 Counter Trick · 5 Field Trick`.
3. **Infers executable effects from the printed text.** Each script is `{ t: <trigger>, c: <cost>, once: 1, ops: [[op, ...args]] }`. Triggers: `onSpawn, onActivate, cont (continuous aura), equip, ignition, flip, counter, onDestroy, onDestroyBattle, onBattleDestroy, onBattleDamage, onAttack, onOppAct, flag`.
4. De-duplicates scripts produced by both the whole-text pass and the per-sentence pass.
5. Writes `tools/duel-card-pool.json` and, with `--inject`, inlines the JSON into `duel.html` inside `<script id="ctf-card-pool" type="application/json">` between the POOL markers.

The op vocabulary the engine must implement (counts from the shipped pool):

```
boostPr 207 · ssHand 90 · search 74 · destroyCatalyst 74 · draw 71 · burn 69 ·
specialOnly 62 (flag) · doubleAttack 39 (flag) · chi 37 · negateAttack 33 ·
negateEffect 32 · destroyAny 31 · cannotBeAttacked 25 (flag) · pierce 24 (flag) ·
takeControl 22 · tempBoostPr 19 · ssDeck 18 · ssVoid 17 · directAttack 15 (flag) ·
negateDestroy 11 · destroyTrick 11 · cannotBeDestroyedBattle 9 (flag) · boostCp 8 ·
cannotBeDestroyedEffect 8 (flag) · boostBoth 7 · lockdown 7 · cannotBeNegated 7 (flag) ·
changePos 6 · drawDiscard 6 · tempBoostBoth 6 · boostPrPerVoid 6 · noTribute 4 (flag) ·
reviveSelf 4 · spawnToken 3 · doublePr 3 · redirectAttack 3 · burnSelf 3 · rfgAny 3 ·
voidToHand 3 · boostPrPerOppField 1 · millVoid 1 · reduceAll 1 · bounce 1 ·
noAttackAfterEffect 1 (flag) · discardHand 1 · skipOppDraw 1 · burnPerOppHand 1 · flipUp 1
```

Inference rules that matter (target ~54% of the database resolving automatically; the rest are flavour-text vanilla cards):
- Aura strings (`increase/decrease the Pressure (and Counter Pressure) of all X by N`, `all X gain N Pressure/Counter Pressure`, `increase the attack of every X`) → `cont` auras with a parsed target filter.
- Filter parsing from a noun phrase: quoted names → `name`/`nameAny`; `-Type` words → `kind`/`kindAny`; alignment word → `align`; level/PR bounds; `you control`/`opponent` → `side`.
- `Gain N Chi` → `chi`; `Inflict N damage to your opponent` → `burn`; `Draw N` → `draw`; `Draw N, then discard N` → `drawDiscard`.
- `Destroy N Catalysts/Tricks/cards` → `destroyCatalyst/destroyTrick/destroyAny`.
- `Special Spawn N "<name>" **Tokens** (Kind/Align/N Star/Pressure P/Counter Pressure C)` → `spawnToken` (the literal word *token* is required, otherwise it is a real card and must become `ssHand`/`ssVoid`/`ssDeck` with a **quoted-name** filter).
- `Special Spawn N "<name>" from your hand/Void/deck` → `ssHand`/`ssVoid`/`ssDeck`.
- `Search your deck for N … and add to your hand`, `Add "<name>" from your deck/Void to your hand` → `search`.
- `Negate the attack` → `negateAttack`; `Negate the activation … and destroy it` → `negateDestroy`.
- Static flags: `cannot be Normal Spawned`, `attack twice`, `attack directly`, `cannot be destroyed by battle/effects`, `cannot be negated`, `cannot be used as a Tribute`.
- Trigger detection must accept **both** `this card` and `this Catalyst` phrasings, and support `When … is Spawned`, `When … is destroyed/sent to the Void`, `If … destroyed in battle`, `When … destroys a Catalyst in battle`, `When … inflicts battle damage`, `When your opponent attacks/activates`, `FLIP:`, `Once per turn`, `During your Battle Phase`.

Validate the five official starter decks against the canon deck rules in the generator output; all five ship legal (ANM 43+2, Angel 48+3, BOOM 45+0, Burn 41+0, Reese's Trigun 46+0).

### 3 · Engine architecture (single file, numbered sections)

```
§0  CANON constants        §9  card flags & stat/aura resolution
§1  card pool              §10 target selection (promise-based)
§2  utilities              §11 effect interpreter (runOps)
§3  persistence            §12 chain stack (LIFO + Counter Lock)
§4  Web Audio synth        §13 spawning (normal/special/fusion/libra)
§5  FX (particles/shake)   §14 destruction & triggers
§6  toasts                 §15 battle
§7  decks & validation     §16 win resolution
§8  game state             §17 phase engine
§18 CPU opponent   §19 card rendering   §20 board rendering
§21 input (click/drag/hotkeys/radial)   §22 modals
§23 setup screen   §24 deck lab   §25 layout & init
```

**State model.** `G = { players[2], active, turn, phase, chain, chainLock, responding, pendingAttack, winner, winPath, log, … }`.
Each player: `chi, kills, extractions, deck[], fusion[], hand[], void[], box[], rfg[], catalysts[5], tricks[3], libra[2], fieldTrick, normalSpawnUsed, specialSpawns, isAI, aiLevel, stats`.
Card instance: `{ uid, id, pos:'atk'|'def', face:'up'|'down', turn, atkUsed, postureChanged, prMod, cpMod, tempPr, tempCp, equipped[], flags{} }`.

**Stat resolution** (`effPr`/`effCp`) walks every live aura source (both Field Tricks, face-up Catalysts with `cont` scripts, equipped Palm Tricks), matches the filter against the target, and sums `boostPr/boostCp/boostBoth/doublePr/boostPrPerVoid/boostPrPerOppField` plus persistent and until-end-of-turn modifiers.

**Effect interpreter.** `runOps(p, ops, ctx)` is `async` and iterates ops, aborting on a win. Anything needing a choice calls `pickTargets`/`pickFromList`, which resolve instantly for AI players and open a card-grid modal for humans — so effects must be `await`-able end to end.

**Phase engine.** `runLoop()` repeatedly calls `runPhaseEntry(phase)`, which returns `'auto'` (advance), `'wait'` (stop for input) or `'reset'` (the End Phase already started the next turn). `advancePhase()` increments and re-enters the loop. The End Phase runs `doEndPhase()` (rights → cost → effect → discard to 7) then `startNextTurn()`.

### 4 · CPU opponent

Three tiers — **Recruit** (simple spawns and attacks, rarely responds), **Adept** (full heuristics: tributes, sets traps, Fusion, End Phase rights), **Infernal** (Libra Spawns, aggressive chain responses, Extraction racing, optimal attack targeting).
Give it: `evalOps` (scores any op bundle), `cardValue`, `attackScore`/`bestAttack` (values kills, captures, Extraction progress, and avoids losing units), `chooseTargets`, `chooseResponse` (responds to threat ops; threshold 260 for Infernal, 460 for Adept, never for Recruit), `chooseEndPhaseRight`, `chooseEndPhaseCost`, and a `takeTurn()` driver that walks the manual phases and calls `advancePhase()`.

### 5 · Board & UI

- Per side — **back row**: `Deck · Libra · Trick1 · Trick2 · Trick3 · Libra · Fusion Deck · score rail`; **front row**: `Void · 5 Catalyst Zones · Field Trick · Box · RFG · scale readout`. The opponent's board is rotated 180° (and its inner elements counter-rotated) so both players read their own cards upright.
- Every zone is a drop target with `drop-ok`/`drop-bad` glow, lane numbers, and selection highlights for attacker/target/tributable/cost-eligible.
- Trays are clickable counters that open a sorted, searchable viewer for Deck (face-down), Fusion Deck, Void, Box and RFG.
- **Chain Stack visualizer** in the centre column: LIFO list, per-link owner and counter styling, and a Counter Lock banner.
- Live **Duel Log**, phase track with the skipped-Battle marker, and score rails showing Chi / Kills / Extractions with a Chi bar.
- **Hand drawer** at the bottom: fanned cards, hotkey badges, playable glow, drag-to-zone. On ≤720 px it becomes a bottom drawer with a grip handle.
- **Radial tap menus** on field units (posture, tribute, attack, ignite ability, flip, info).
- **Hotkeys**: `1–5` lane target · `T` tribute mode · `A` posture toggle · `Space` advance phase · `E` End Phase right · `Esc` cancel.
- **Inspector** panel showing Level/type/alignment/kinds, live Pressure & Counter Pressure, printed text, and whether the effect is `AUTO-RESOLVED` or `CANON TEXT — NOT AUTO-RESOLVED`.
- Setup screen with mode cards, deck picker (5 official decks + generated + saved custom), Deck Lab, Rules and Records.

### 6 · Feel, audio, persistence

- **Audio** — Web Audio synthesis only: crisp card flips (band-passed noise burst), heavy spawn slams (pitch-dropping sine + low-passed noise), crackling flame for Chi burn (noise through a sweeping band-pass with a fast LFO crackle), and a distinct four-note chord sting for every Shotgun draw, plus kill/victory/defeat stings.
- **FX** — full-screen canvas particle system: burning trails from attacker to target scaled by damage, radial bursts, expanding rings, ambient embers, floating damage/heal/kill/extraction numbers, and screen shake whose amplitude scales with Logic damage.
- **Persistence** (`localStorage`, key `ctf:duel:catalysts:v1`) — wins/losses per difficulty, fastest 7-Kill speedrun, fastest 7-Extraction speedrun, Extraction mastery count, Chi KO count, a top-25 leaderboard of runs, SFX/shake settings, last deck used and saved custom decks.

### 7 · Testing (do this before declaring done)

There is no browser in the build sandbox, so drive the file with **jsdom** (`npm i jsdom`, `runScripts:'dangerously'`, `pretendToBeVisual:true`) and stub `HTMLCanvasElement.prototype.getContext` with a Proxy of no-ops (jsdom has no canvas; `AudioContext` is simply absent so audio no-ops safely).

Assert at minimum: opening hands of 5; turn-1 draw of exactly 1; Battle Phase skipped on turn 1; tribute tiers 0/1/2; Pressure vs Pressure (Void + Logic damage + Kill, and the tie case); Capture into the Box; the Great DEF exception (Void + Kill + 0 damage + Box unchanged); Direct Attack when all five lanes are empty; the 5-Special-Spawn cap rejecting a 6th; the Shotgun draw; tribute costs going to the Void; one Normal Spawn per turn; Libra Scales + Libra Spawn counting as 1 Special Spawn/1 draw; Fusion materials to the Void; End Phase Extraction; the cost cannot be a Catalyst summoned this turn; 7 Kills ending the duel; Chi KO out-ranking 7 Kills; and two full AI-vs-AI duels that run to a winner without stalling.

### 8 · Traps that will cost you hours (all of these bit the reference build)

1. **`G.winner = 0` is falsy.** Every guard must be `G.winner != null` / `G.winner == null`. With `if (G.winner)` the game keeps playing after player 0 wins.
2. **Chi KO direction:** `chi <= 0` means that player *lost* — invert the winner before calling `endGame`.
3. **Only input-blocking modals may pause the CPU** (`#modal-choice`, `#modal-end`, `#modal-lab`). A leftover win screen or tray viewer otherwise freezes `maybeRunAI` forever.
4. **Pending `setTimeout(showWinScreen)` from a finished duel** will reopen the win modal over a fresh game — snapshot `G` and re-check `G.winner != null` inside the timeout, and clear all modals in `newGame`.
5. **Human target prompts hang headless tests.** Either set the acting player to `isAI` in scenario tests or auto-confirm the modal.
6. **Effect inference:** require the literal word *token* before treating `Special Spawn N "<name>" …` as `spawnToken`, and keep the quotes when building name filters, or real cards get summoned as 1000/1000 tokens.
7. **Trigger regexes must accept `this Catalyst`** as well as `this card`.
8. Add an **AI watchdog** (`__aiStartedAt` older than ~25 s clears a stuck `__aiRunning`) so no deadlock can freeze the duel.
9. Coalesce renders: the engine dirties state many times per action, so expose `scheduleRender()` (rAF-batched) and use it inside engine code, keeping immediate `render()` for input handlers.
10. Keep the CPU turn snappy — target ~1–1.5 s per AI turn by tuning `AI.delay` and the animation sleeps.

### 9 · Definition of done

- `duel.html` opens offline, plays a full duel vs Recruit/Adept/Infernal and hot-seat, and never throws.
- Every canon rule in §1 is verifiable in-game and logged in the Duel Log.
- All 31 mechanics assertions and the UI-flow assertions pass under jsdom.
- `node tools/build-duel.js --inject` regenerates the pool from `assets/js/data.js` with no manual edits.
- The page is linked from the site nav in `index.html` and documented in `README.md`.
