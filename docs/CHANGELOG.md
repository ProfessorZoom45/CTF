# CTF Changelog

## v2.0.0 — 2026-04-11

### Language Refinement (Full Pass)
- All card descriptions converted to CTF-native terminology
  - monster → Catalyst
  - Spell Card / Trap Card → Palm Trick / Concealed Trick
  - Spell/Trap → Palm/Concealed Trick
  - Life Points → Chi
  - Graveyard → Void
  - ATK → Pressure, DEF → Counter Pressure
  - Field Spell → Field Trick
  - Equip Spell → Equip Palm Trick
  - M/T → Palm/Concealed Trick
- Removed all YGO, Yu-Gi-Oh, YVD, and "legacy engine" references from site text
- Glossary reframed as "CTF-native terminology" (not "legacy engine terms")

### Card Database
- 1,610 unique cards across 41 sets (40 playable + tokens)
- New JSON-based card format with slug IDs (e.g., tg1-101-legatobluesummers)
- CTF-native cardType field: Catalyst, Palm Trick, Concealed Trick, Counter Trick, Field Trick, Fusion

### Starter Decks
- 5 official decks from source files: Anime Masters, Angel, BOOM, Burn, Reese's Trigun
- 2 auto-generated decks: Shadow Current, Dragon Force
- All decks use card ID references into CTF_CARDS array

### Board Layout
- Portrait card-shaped zones with rounded corners matching card back silhouette
- Stencil-accurate layout: 5 Trick Zones (outermost 2 = Libra), 5 Catalyst Zones
- Field Trick + The Box stacked (separate zones)
- 1 RFG zone per player in center
- Board PNG regenerated via headless Chromium

### Game Engine
- Starter deck loader reads from CTF_STARTER_DECKS (real decks + auto fallback)
- RFG zone counts render live during gameplay
- All engine messages use CTF-native terms

### Site
- 8-page static site: index, rules, cards, deckbuilder, play, glossary, submit
- Repo name standardized to CTF (uppercase)
- New INSTALL.txt with GitHub Pages deployment instructions
- Publisher: Makairis Holding Group (corrected from previous references)

## v1.0.0 — 2026-04-10

- Initial build: 8 HTML pages, game engine, card database, board diagram
