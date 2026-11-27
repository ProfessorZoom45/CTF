# Carry The Flame — Browser-First Beta

This is the source repository for the Carry The Flame browser game.

- Game Hub with Guided Play, CPU opponents, local hot-seat, solo sandbox, and private Friend Rooms
- Card collection, Deck Workshop, and six-lesson Forge
- Searchable Rules Codex and interactive board previews
- Installable browser app and offline support for local play

# CTF — Carry The Flame

A fully original tactical card game by Perfect Timing Gaming / Makairis Holding Group.

## Quick Start

1. Clone `https://github.com/ProfessorZoom45/CTF.git`.
2. Run `node server.mjs` from the checkout with Node.js 22 or newer.
3. Open [the local Game Hub](http://127.0.0.1:8028/). The server binds to loopback. To select a different port, set `CTF_PORT` before starting it.

Run `node tools/audit-browser.cjs`, `node tools/test-browser-rules.cjs --simulate`, `node tools/test-zf1-tutorial.cjs`, and `node tools/test-forge.cjs` from the checkout. With the local server running, run `node tools/test-site-http.cjs http://127.0.0.1:8028` and `node tools/test-online.mjs http://127.0.0.1:8028` to verify the static assets and development relay.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Homepage — game overview, win conditions, card types |
| `rules.html` | Complete rulebook — all 22 locked rules, board layout, phases |
| `cards.html` | Card database browser — search, filter, sort 1,610 cards |
| `deckbuilder.html` | Deck builder — build, save, load 40–60 card decks |
| `play.html` | Guided Play, CPU, local hot-seat and private Friend Rooms |
| `first-five-forge.html` | Six creation lessons, private drafts and JSON backup |
| `glossary.html` | CTF-native terminology reference |
| `submit.html` | Custom card submission — 5-card sets with stat pool system |

Start with a guided starter duel, then create cards in the Forge. Finishing a
draft opens the Deck Workshop or a private guided duel using the draft cards
and their supported effect presets. The lessons and teaching deck use the 26
cards in `assets/data/ZF1.ptcg`. Regenerate the data with
`node tools/build-zf1-tutorial-data.mjs` and check the two guided modes with
`node tools/test-zf1-tutorial.cjs` and `node tools/test-forge-practice.cjs`.

## Friend Rooms

Open the [GitHub Pages release](https://professorzoom45.github.io/CTF/) or [Carry The Flame Online](https://carry-the-flame-online.dr-zoom.chatgpt.site/). Choose a legal deck, create a room, and share the invitation link or code. Players on both sites use the same referee. Refresh in the same browser tab to recover your seat. After a duel, both players can confirm a rematch and use the same deck or choose another legal one. The referee validates actions and returns a separate view for each seat.

GitHub Pages publishes the repository root from `main`. The non-GitHub Site hosts the referee at `/api/private-multiplayer/`, stores room state in D1, and runs the Forge review inbox. The GitHub Play page configures the hosted referee through the `ctf-friend-room-api` meta value. The hosted Site source documents its Worker build and database migrations in `CTF-ONLINE.md`.

For local development, run `node server.mjs` and use the local Game Hub in two independent browser sessions. Loopback play uses the local referee. Check its protocol with `node tools/test-private-rooms.mjs http://127.0.0.1:8028`.

Friend Rooms support single duels and same-room rematches. Best-of-three, the full timer and disconnect-forfeit policy, and automated Forge approval emails are separate release work.

## Card Database

- **1,610 unique cards** across **41 sets** (40 playable + tokens)
- **5 official starter decks** loaded from source deck lists: Anime Masters, Angel, BOOM, Burn, Reese's Trigun
- All card descriptions use CTF-native terminology (Catalyst, Palm Trick, Concealed Trick, Chi, Void, Pressure, Counter Pressure)

## Tech Stack

- Static HTML/CSS/JS — no framework, no build tools
- `assets/js/data.js` — card database + starter decks (CTF_CARDS, CTF_SETS, CTF_META, CTF_STARTER_DECKS)
- `assets/js/engine.js` — game state machine, combat resolver, WebRTC networking
- PeerJS for WebRTC signaling (play.html)

## Card-submission delivery

`submit.html` opens the Forge submission page. Both public editions send finalized
five-card packages to the same hosted review inbox. The inbox records the package
and a confirmation job before returning a receipt. Start local development with
`node server.mjs` to use a local file-based inbox.

Administrators sign in at [Forge Review](https://carry-the-flame-online.dr-zoom.chatgpt.site/forge-review).
Approved cards can appear in the Card Gallery immediately or at a scheduled UTC
time. Review information and creator addresses stay private. Deck eligibility
requires engine certification.

The [Oracle service setup](oracle/card-submission-email/README.md) covers the
Outlook authorization and background worker for confirmation and decision
emails from `CTF.OTCG@outlook.com`.

## Board Layout

See `assets/img/ctf-board-layout.png` for the official board diagram.

Each player's side:
- **Back Row**: Deck → 5 Trick Zones (outermost 2 = Libra) → Fusion Deck
- **Front Row**: The Void → 5 Catalyst Zones → Field Trick / The Box (stacked)
- **Center**: 1 RFG zone per player

## Publisher

Makairis Holding Group — Perfect Timing Gaming  
Carry The Flame © 2026  
Contact: changethewrld@outlook.com
