CARRY THE FLAME — ALPHA FORGE NAME & EFFECT REVIEW
Preview build: 24 September 2026

PURPOSE
These static pages review the complete CTF-GENERIC-SETS(9-7-26).zip archive.
It provides draft naming choices, forge classification, batch selection,
effect review, local saving, and export. It does not change game data.

SOURCE
Archive SHA-256:
29B64C7D56278F0646D6C8BA9D02971A2A9D1085CC491855D6D521EA6C681B44

Records: 1,613. ZF1: 26; ZNC: 117; ZEC: 709; ZFC: 41; ZPT: 461;
ZCT: 235; ZTS: 24. ZF1 names stay locked. Every other record has five
first-pass naming choices and may be given a custom ancient-source name.
The source ZIP contains no card images; the page uses CTF brand images only.

CANONICAL EIGHT-STEP CATALYST TREE
1. Alignment — Hero, Villain, God, Demi-God, Angel, Demon, Djinn, Spirit.
   These eight alignments are fixed.
2. Race — must be one allowed by the selected alignment.
3. Skill — must be one allowed by that race and, where relevant, alignment.
4. Effect class:
   Normal -> required lore.
   Effect -> required effect text; optional lore.
   Fusion -> required fusion rules/requirements and effect; optional lore.
5. Pressure.
6. Counter Pressure.
7. Rank.
8. Catalyst resolution — required written description of how the card
   resolves, including timing, targets, materials, and resulting state.

The page embeds the complete alignment/race and race/skill option lists
from the user's final tree. It validates choices when exporting. The archive
does not carry explicit canonical fields for every Catalyst, so the initial
alignment, race, and skill values are suggestions inferred from GROUP tags
and attributes. Cards marked "inferred" require creator review.

Palm and Concealed Tricks are named for effect, timing, and interaction.
They retain their original card type and effect text as the review baseline.
They have no Catalyst-only forge fields in the ZIP. Token Catalysts use the
full Catalyst fields and list cards that create them. Where a non-ZF1
creator exists, Token options A/B/C/D/E share the first linked creator's
corresponding myth root. Multiple creators can have conflicting roots; these
Tokens are flagged, and selected Token/creator root conflicts appear in export
validation. A shared family name still requires creator approval.
Tokens with a ZF1-only creator retain independently proposed myth roots,
while their creator relationship remains visible. Eleven Tokens have no
creating card detectable by exact Token number in this archive; their
relationships remain open for manual review.

NAMING METHOD
The five choices use documented ancient Mesopotamian, Egyptian, and Greek
myth names. A is Mesopotamian, B Egyptian, and C Greek. D and E offer
alternate Mesopotamian and Egyptian names with a different motif or attribute
emphasis. Mesopotamian choices come first to prioritize older attested
traditions; the age of each individual name is not asserted. A mechanical
motif is drawn from the card's text. All complete proposed titles are
editorial drafts; some will need rewriting for better cultural and card
fit. Each option labels its link as either a named-root source or a broader
tradition overview; an overview alone does not verify the individual root.
No modern retelling or artwork is licensed by the source links.

USING THE PAGE
Two layouts use the same 1,613-card JSON and share local browser decisions.
The original page supports grouped, expandable cards. V2 uses a compact
queue and focused editor at /ALPHA/forge-name-review-v2.html. In V2, choose
A-E on a queue row, press 1-5 outside form fields, or paste tab-separated
ID / choice / optional effect-decision rows. Arrow keys move through cards;
slash focuses search. ZF1 names stay locked in both layouts. Both accept and
produce the same CTF_FORGE_REVIEW_V1 JSON manifest.

1. From the repository root, run `node ALPHA/serve-forge-review.mjs`, then
   open http://127.0.0.1:8765/forge-name-review.html. GitHub Pages can
   serve the same ALPHA files after publication.
2. Filter by source family, generic set, forge branch, or review status.
3. Group by source family, generic set, lineage, or branch.
4. Select shown, all filtered, or one complete displayed group. Then apply
   option A/B/C/D/E and an effect decision. ZF1 is excluded from batch renaming.
5. Open a card to inspect original text, choose a name, edit forge fields,
   and record an effect/lore/fusion draft, Catalyst resolution, or note.
6. Download JSON, CSV, or TXT, or copy TSV. JSON can be imported to resume
   on another browser. Draft changes are also saved in localStorage.

EXPORT INTERPRETATION
Exports contain only touched cards. The JSON decision manifest is the
primary round-trip format. CSV and TSV support sorting and spreadsheets;
TXT supports creator review. Each record carries its original and chosen
name, source set, effect choice, forge fields, resolution text, source URL,
editorial status, notes, and
validation findings. Export is a review artifact, not a playable database.
No export performs reference substitution in effect text. Once card names
are approved, exact-name links in every .ptcg effect and .cnl list must be
rebuilt and audited together; references from ZF1 to renamed cards also
need repair without renaming ZF1 itself.

PREVIEW / GITHUB PAGES
Files to keep together in /ALPHA/:
  forge-name-review.html
  forge-name-review.css
  forge-name-review.js
  forge-name-review-v2.html
  forge-name-review-v2.css
  forge-name-review-v2.js
  forge-review-data.json
  build-forge-review.mjs
  serve-forge-review.mjs (local preview helper)
  CTF-FORGE-REVIEW-README.txt
  CTF-FORGE-REVIEW-SUGGESTIONS.txt
  assets/ctf-mark.png and assets/carry-the-flame-horizontal.png

The page uses relative links and has no backend or build framework.
Publishing these files in the existing CTF repository's /ALPHA/ directory
will make the review page hostable at its GitHub Pages /ALPHA/ URL. A
robots noindex tag is not access control; public GitHub Pages exposes the
legacy mapping and source text in forge-review-data.json. Review that
exposure before publication. The current checkout already contains
unrelated edits; this preview was added without altering them.

To regenerate the JSON from an extracted source archive:
  node ALPHA/build-forge-review.mjs PATH_TO_CTF-GENERIC-SETS

The builder validates all 1,613 PTCG/CNL records and the master source map.

HISTORICAL / COPYRIGHT SOURCE NOTES
U.S. Copyright Office: names and short phrases are not protected by
copyright, but some names may have trademark protection.
https://www.copyright.gov/help/faq/faq-protect.html
Ancient Mesopotamian names:
https://www.metmuseum.org/essays/mesopotamian-deities
Ancient Egyptian names:
https://www.metmuseum.org/exhibitions/divine-egypt
Ancient Greek names:
https://www.metmuseum.org/essays/greek-gods-and-religious-practices
Medusa specifically:
https://www.metmuseum.org/toah/hd/medu/hd_medu.htm

These references support the existence and broad context of historical
names. They do not certify each newly combined title or its market use.
