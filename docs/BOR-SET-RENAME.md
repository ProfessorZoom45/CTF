# BRO to BOR Rename Log

Date: 2026-08-25

The Boruto set code was renamed from `BRO` to `BOR` across the site source.

## Changed paths

- `images/BRO` → `images/BOR`
- `assets/js/data.js` — set list, card `set` values, and `bro-…` card IDs
- `assets/js/card-image-map.js` — image-manifest set key
- `assets/js/card-playability-manifest.js` — set references and card IDs
- `assets/js/engine.js` — effect registrations, lookup keys, and set labels
- `assets/js/engine.js.bak` — preserved engine snapshot

## Compatibility requirement

All consumers must use `BOR` and `bor-…` identifiers together.  A mixture of
the old and new code would break image lookup, card effects, and deck/card
lookups.
