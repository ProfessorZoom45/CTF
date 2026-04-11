# 🔥 CARRY THE FLAME — Official Website

**The official web platform for Carry The Flame (CTF), a tactical online card game by Perfect Timing Gaming.**

3 Win Paths · 1,599 Cards · 40 Sets · 4 Game Modes

---

## 🎮 What Is Carry The Flame?

Carry The Flame (CTF) is a strategic online card battle game with three simultaneous win conditions — Chi KO, 7 Kills, and 7 Extractions — a locked 7-phase turn structure, and board decisions that reward timing, sacrifice discipline, and planning.

Created by **Dr. Zoom (Morrese Towns)** and **Newz (Destin Sharp)**  
Published by **Perfect Timing Gaming / Makairis Holding Group (MHG)**  
Based in **Buffalo, NY**

---

## 📁 Repository Structure

```
ctf/
├── index.html              # Landing page — hero, features, win conditions, quick start
├── rules.html              # Complete rulebook — all 22 locked rules
├── cards.html              # Card gallery — all 1,610 cards, search & filter
├── deckbuilder.html        # YGO-style deck builder — Main/Fusion/Side zones
├── play.html               # How to Play — step-by-step guide for new players
├── glossary.html           # Searchable A–Z glossary of all CTF terms
├── submit.html             # Custom card submission — 5-card builder with validation
│
├── assets/
│   ├── js/
│   │   ├── data.js         # Full card database (1,610 cards, CTF terminology)
│   │   └── engine.js       # Game engine — state machine, combat, phases, P2P networking
│   ├── css/                # (Reserved for future shared stylesheets)
│   └── img/                # (Reserved for logos, card art, banners)
│
├── docs/
│   └── CHANGELOG.md        # Version history
│
├── .gitignore
├── .nojekyll               # Tells GitHub Pages to skip Jekyll processing
├── LICENSE                  # Proprietary license
└── README.md               # This file
```

---

## 🚀 Deployment — GitHub Pages

This site is designed for **zero-config GitHub Pages deployment** from the repo root.

### Step-by-Step

1. **Push this repo** to `github.com/ProfessorZoom45/ctf`
2. Go to **Settings → Pages**
3. Under **Source**, select **Deploy from a branch**
4. Set branch to `main` and folder to `/ (root)`
5. Click **Save**
6. Your site will be live at: `https://ProfessorZoom45.github.io/ctf/`

### That's it. No build step. No dependencies. No Node.js required.

All HTML files are self-contained with inline CSS and JS. The only external dependency is Google Fonts (loaded via CDN). The card database (`assets/js/data.js`) is loaded by `cards.html` and `deckbuilder.html`.

---

## 📄 Pages Overview

| Page | File | Description |
|------|------|-------------|
| **Home** | `index.html` | Landing page with ember particle animation, feature grid, win conditions, quick start guide |
| **Rules** | `rules.html` | Complete official rulebook with sidebar navigation, all 22 locked rules, combat matrix, End Phase reference |
| **Cards** | `cards.html` | Searchable gallery of all 1,610 cards with type/alignment/set/level filters, paginated (60/page), detail modals |
| **Deck Builder** | `deckbuilder.html` | Full YGO-style deck builder with card pool, Main/Fusion/Side zones, live validation, sort, export/import, localStorage save |
| **Play** | `play.html` | Online game client — lobby with room codes, full top-down board, 7-phase engine, combat resolver, End Phase UI, P2P via PeerJS |
| **Glossary** | `glossary.html` | A–Z searchable glossary of all CTF terms with locked indicators and legacy engine term mappings |
| **Submit Cards** | `submit.html` | Custom 5-card submission builder with stat pool enforcement, dynamic sliders, live validation, email + JSON export |

---

## 🃏 Card Database

The card database lives at `assets/js/data.js` and contains:

| Stat | Count |
|------|-------|
| Total Cards | 1,610 |
| Catalysts | 849 |
| Palm Tricks | 406 |
| Concealed Tricks | 200 |
| Counter Tricks | 38 |
| Field Tricks | 73 |
| Fusion Cards | 44 |
| Great Cards | 47 |
| Sets | 40 (+ token set) |

All card data uses **CTF terminology** (Pressure, Counter Pressure, Palm Trick, Concealed Trick, etc.) — legacy YVD engine terms have been mapped automatically.

---

## 📏 Core Rules Quick Reference

| Rule | Value |
|------|-------|
| Starting Chi | 10,000 |
| Deck Size | 40–60 Main · 0–15 Fusion · 0–15 Side |
| Normal Summons | 1 per turn |
| Special Summon Cap | 5 per turn (hard cap) |
| Shotgun Rule | Opponent draws 1 per every SS (1st–5th) |
| Hand Limit | 7 at End Phase |
| Win Condition 1 | Chi KO — reduce Chi to 0 |
| Win Condition 2 | 7 Kills — battle destruction only |
| Win Condition 3 | 7 Extractions — Capture → Box → Extract |
| Win Priority | Chi KO > 7 Kills > 7 Extractions |
| Mandatory Attack | REMOVED — attacking is always optional |
| Deck Out | NOT a loss — skip draw, continue |
| P1 Turn 1 | Draws normally, cannot attack |
| Direct Attack | Catalyst Zones empty only — Tricks don't block |
| End Phase | Mandatory: End Turn / Extraction / Rescue / Destroy Trick |
| Rescue | YOUR Catalyst from opponent's Box → YOUR Deck |
| 7 Phases | Turn Start → Draw → Ignition → Action → Battle → Resolution → End |

---

## 🛠 Local Development

No build tools needed. Open any HTML file directly in a browser:

```bash
# Clone the repo
git clone https://github.com/ProfessorZoom45/ctf.git
cd ctf

# Option A: Open directly
open index.html

# Option B: Run a local server (recommended for data.js loading)
python3 -m http.server 8000
# Then visit http://localhost:8000

# Option C: VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

> **Note:** `cards.html` and `deckbuilder.html` load `assets/js/data.js` via a `<script>` tag. Some browsers block local file loading without a server. If the card database doesn't load, use Option B or C above.

---

## 🔒 Terminology

CTF uses its own complete terminology. The digital engine may display legacy terms in some card descriptions:

| CTF Term | Meaning | Legacy Engine Term |
|----------|---------|-------------------|
| Catalyst | Primary card type | Monster |
| Palm Trick | Proactive spell | Spell Card |
| Concealed Trick | Reactive trap | Trap Card |
| Field Trick | Environment card | Field Spell |
| Counter Trick | Highest-priority response | Counter Trap |
| Chi | Life total (starts 10,000) | Life Points |
| Pressure | ATK stat | ATK |
| Counter Pressure | DEF stat | DEF |
| The Void | Destroy/discard zone | Graveyard |
| The Box | Capture zone | (No equivalent) |
| Logic Damage | Battle/effect damage to Chi | Battle Damage |

---

## 📝 Contributing

Custom cards can be submitted via the [Submit Cards](submit.html) page on the live site. All submissions are reviewed by the PTG team before approval.

**Important:** All approved cards become the intellectual property of Perfect Timing Gaming / Makairis Holding Group. Card names must be original and free of third-party IP. See the full disclaimer on the submission page.

---

## 📜 License

All content, game rules, card data, and website code are proprietary to **Perfect Timing Gaming / Makairis Holding Group (MHG)**. All rights reserved.

**Carry The Flame** is a trademark of Perfect Timing Gaming.

---

## 📬 Contact

- **Email:** changethewrld@outlook.com
- **Web:** [perfecttiminggaming.com](https://perfecttiminggaming.com)
- **GitHub:** [ProfessorZoom45](https://github.com/ProfessorZoom45)
- **Platform:** [ProfessorZoom45.github.io/ctf](https://ProfessorZoom45.github.io/ctf)

---

*"Every card you play is a move. Every move you make is a strategy. Every strategy is a story."*

**Carry The Flame.** 🔥
