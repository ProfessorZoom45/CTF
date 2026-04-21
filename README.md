# Carry The Flame — Browser-First Beta

This repo now ships the free browser-first beta path first:

- all cards viewable
- live deckbuilder
- 5-match tutorial + hot-seat + solo sandbox
- beta signup + Discord funnel
- PWA install shell now, account systems later

# CTF — Carry The Flame

A fully original tactical card game by Perfect Timing Gaming / Makairis Holding Group.

## Quick Start

1. Clone: `git clone https://github.com/ProfessorZoom45/CTF.git`
2. Open `index.html` in any browser — no build step required.
3. All pages are static HTML + vanilla JS. No dependencies.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Homepage — game overview, win conditions, card types |
| `rules.html` | Complete rulebook — all 22 locked rules, board layout, phases |
| `cards.html` | Card database browser — search, filter, sort 1,610 cards |
| `deckbuilder.html` | Deck builder — build, save, load 40–60 card decks |
| `play.html` | Online play client — WebRTC P2P with room codes |
| `glossary.html` | CTF-native terminology reference |
| `submit.html` | Custom card submission — 5-card sets with stat pool system |

## Card Database

- **1,610 unique cards** across **41 sets** (40 playable + tokens)
- **5 official starter decks** loaded from source deck lists: Anime Masters, Angel, BOOM, Burn, Reese's Trigun
- All card descriptions use CTF-native terminology (Catalyst, Palm Trick, Concealed Trick, Chi, Void, Pressure, Counter Pressure)

## Tech Stack

- Static HTML/CSS/JS — no framework, no build tools
- `assets/js/data.js` — card database + starter decks (CTF_CARDS, CTF_SETS, CTF_META, CTF_STARTER_DECKS)
- `assets/js/engine.js` — game state machine, combat resolver, WebRTC networking
- PeerJS for WebRTC signaling (play.html)

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
