# Carry The Flame — Browser-First Beta

This is the source repository for the Carry The Flame browser game.

- Game Hub with Guided Play, CPU opponents, local hot-seat, and solo sandbox
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
| `play.html` | Guided Play, CPU, local hot-seat and development Friend Rooms |
| `first-five-forge.html` | Six creation lessons, private drafts and JSON backup |
| `glossary.html` | CTF-native terminology reference |
| `submit.html` | Custom card submission — 5-card sets with stat pool system |

Start with a guided starter duel, then create cards in the Forge. Finishing a draft opens the Deck Workshop or a guided replay with the starter deck. The lessons and provisional teaching deck use the 26 cards in `assets/data/ZF1.ptcg`. Regenerate the data with `node tools/build-zf1-tutorial-data.mjs` and check it with `node tools/test-zf1-tutorial.cjs`.

GitHub Pages serves the browser files from `main` at the repository root. The integration branch keeps the old full-snapshot relay on loopback for development. The new local referee at `/api/private-multiplayer/` owns duel state and sends each authenticated seat a separate view. Run `node tools/test-private-rooms.mjs http://127.0.0.1:8028` to exercise both seats. Public Friend Rooms still require browser integration, hosting, the full room and series rules, and cross-network testing. The launch set and art and the hosted Forge review and email workflow are also release gates.

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

`submit.html` writes submission metadata to OperatorStack, downloads and presents
the full JSON to the creator, then sends that same JSON to the protected Oracle
service in `oracle/card-submission-email`. The Oracle service sends the owner a
JSON attachment and sends the submitter a separate thank-you/review message.
See the service README for the required HTTPS, Outlook OAuth, and Cloudflare
Turnstile configuration. The public service URL and Turnstile site key belong in
`assets/js/submission-delivery-config.js`; secret keys never belong in this
repository.

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
