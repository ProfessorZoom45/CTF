/*
 * Active-set normalization from SETS8-24-26 updated.zip.
 * The archive contains 41 active sets / 1,599 cards.  The image resolver runs
 * after this patch so every corrected entry retains its existing art fallback.
 */
(function(global){
  const cards = (typeof CTF_CARDS !== 'undefined' && Array.isArray(CTF_CARDS))
    ? CTF_CARDS
    : global.CTF_CARDS;
  if(!Array.isArray(cards)) return;
  global.CTF_CARDS = cards;

  const corrections = {
    'anm-023-thechosenone': { name: 'The Great One' },
    'anm-024-blazeinginferno': { name: 'Blazing Inferno' },
    'ct1-001-aylaprehystoricwarrior': { name: 'Ayla Prehistoric Warrior' },
    'db1-005-flyingnumbus': { name: 'Flying Nimbus' },
    'hls-043-fullmoon': { name: 'Blood Moon' },
    'inu-004-tetsaiga': { name: 'Tessaiga' },
    'inu-004-tetsuaiga': { name: 'Warriors Return' },
    'inu-004-tetsuaiga-v2': { name: 'Tenseiga' },
    'nar-040-summoningnojutsu': { name: 'Summoning no Jutsu' },
    's-m-039-greenlaternsring': { name: "Green Lantern's Ring" },
    's-m-040-greenlaterncorps': { name: 'Green Lantern Corps' },
    'sh2-028-focusyourengery': { name: 'Focus Your Energy' },
    'tg1-105-knivesminipulation': { name: 'Knives Manipulation' },
    'yyh-024-spiritequipment': { name: 'The Great Spirit Equipment' }
  };

  cards.forEach(function(card){
    const patch = corrections[card && card.id];
    if(patch) Object.assign(card, patch);
  });

  global.CTF_ALPHA_SET_AUDIT = {
    source: 'SETS8-24-26 updated',
    activeSets: 41,
    activeCards: 1599,
    normalizedEntries: Object.keys(corrections).length,
    note: 'Duplicate CNL labels were reconciled against their PTCG records; image fallback coverage is retained.'
  };
})(window);
