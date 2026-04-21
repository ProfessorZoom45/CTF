// CTF Deck Utilities — Patch 1
(function(global){
  const DECK_CFG = (global.CTF_CONFIG && global.CTF_CONFIG.game && global.CTF_CONFIG.game.deck) ? global.CTF_CONFIG.game.deck : { mainMin:40, mainMax:60, fusionMax:15, sideMin:0, sideMax:15, copiesPerCard:3 };
  const GREAT_CFG = (global.CTF_CONFIG && global.CTF_CONFIG.game && global.CTF_CONFIG.game.great) ? global.CTF_CONFIG.game.great : { maxPerName:1, maxPerDeck:5 };
  const CARD_ID_ALIASES = {
    'ss1-000-legat0thegreat': 'tuv-031-legat0thegreat',
    'ss1-002-kamehamehacounterattack': 'db1-054-kamehamehacounterattack'
  };
  const CARD_NAME_ALIASES = {
    "the great brainiac's control": "Brainiac's Great Control",
    "brainiac's control": "Brainiac's Great Control",
    "onigumo": "Onigumo - The Bandit",
    "onigumo - the bandit - the bandit": "Onigumo - The Bandit",
    "meryl strife": "Meryl Stryfe",
    "peppor/effect": "Peppor",
    "red xiii - trance": "RedXIII - Trance",
    "second sealbraker": "Second Sealbreaker",
    "tetsuaiga": "Tessaiga",
    "tetsaiga": "Tessaiga",
    "110 percent": "110%"
  };
  const STORAGE_KEYS = {
    activeDeck: 'ctf_deck',
    playDeck: 'ctf_play_deck'
  };

  function safeParse(raw){
    try { return JSON.parse(raw); } catch { return null; }
  }

  function normalizeCardId(id){
    return CARD_ID_ALIASES[String(id || '').trim()] || String(id || '').trim();
  }

  function normalizeCardName(name){
    const raw = String(name || '').trim();
    const lower = raw.toLowerCase();
    return CARD_NAME_ALIASES[lower] || raw;
  }

  function normalizeDeck(deck){
    deck = deck || {};
    return {
      name: String(deck.name || 'My CTF Deck').trim() || 'My CTF Deck',
      main: Array.isArray(deck.main) ? deck.main.map(normalizeCardId).filter(Boolean) : [],
      fusion: Array.isArray(deck.fusion) ? deck.fusion.map(normalizeCardId).filter(Boolean) : [],
      side: Array.isArray(deck.side) ? deck.side.map(normalizeCardId).filter(Boolean) : []
    };
  }

  function loadLocalDeck(){
    return normalizeDeck(safeParse(localStorage.getItem(STORAGE_KEYS.activeDeck)));
  }

  function saveLocalDeck(deck){
    const normalized = normalizeDeck(deck);
    localStorage.setItem(STORAGE_KEYS.activeDeck, JSON.stringify(normalized));
    return normalized;
  }

  function setPlayDeck(deck){
    const normalized = normalizeDeck(deck);
    localStorage.setItem(STORAGE_KEYS.playDeck, JSON.stringify(normalized));
    return normalized;
  }

  function getPreparedPlayDeck(){
    const fromPlay = safeParse(localStorage.getItem(STORAGE_KEYS.playDeck));
    if (fromPlay && Array.isArray(fromPlay.main)) return normalizeDeck(fromPlay);
    const fromActive = safeParse(localStorage.getItem(STORAGE_KEYS.activeDeck));
    if (fromActive && Array.isArray(fromActive.main)) return normalizeDeck(fromActive);
    return null;
  }

  function clearPlayDeck(){
    localStorage.removeItem(STORAGE_KEYS.playDeck);
  }

  function validateDeck(deck, cards){
    const d = normalizeDeck(deck);
    const byId = new Map((cards || []).map(c => [c.id, c]));
    const errors = [];
    const warnings = [];
    const missing = [];
    const counts = new Map();
    let greatCount = 0;

    for (const id of d.main){
      counts.set(id, (counts.get(id) || 0) + 1);
      const card = byId.get(id);
      if (!card){ missing.push(id); continue; }
      if (card.cardType === 'Fusion') errors.push(`${card.name} is in the Main Deck but must be placed in the Fusion Deck.`);
      if (card.great) greatCount += 1;
    }

    for (const id of d.fusion){
      const card = byId.get(id);
      if (!card){ missing.push(id); continue; }
      if (card.cardType !== 'Fusion') errors.push(`${card.name} is in the Fusion Deck but is not a Fusion card.`);
    }

    for (const id of d.side){
      const card = byId.get(id);
      if (!card){ missing.push(id); continue; }
    }

    for (const [id, count] of counts.entries()){
      const card = byId.get(id);
      if (!card) continue;
      if (count > (DECK_CFG.copiesPerCard || 3)) errors.push(`${card.name} exceeds the ${(DECK_CFG.copiesPerCard || 3)}-copy limit (${count}).`);
      if (card.great && count > (GREAT_CFG.maxPerName || 1)) errors.push(`${card.name} is a Great Card and can only have ${(GREAT_CFG.maxPerName || 1)} copy.`);
    }

    if (d.main.length < (DECK_CFG.mainMin || 40) || d.main.length > (DECK_CFG.mainMax || 60)) errors.push(`Main Deck must contain ${(DECK_CFG.mainMin || 40)}–${(DECK_CFG.mainMax || 60)} cards. Current: ${d.main.length}.`);
    if (d.fusion.length > (DECK_CFG.fusionMax || 15)) errors.push(`Fusion Deck cannot exceed ${(DECK_CFG.fusionMax || 15)} cards. Current: ${d.fusion.length}.`);
    if (greatCount > (GREAT_CFG.maxPerDeck || 5)) errors.push(`Main Deck cannot contain more than ${(GREAT_CFG.maxPerDeck || 5)} Great Cards. Current: ${greatCount}.`);
    if (d.side.length < (DECK_CFG.sideMin || 0) || d.side.length > (DECK_CFG.sideMax || 15)) errors.push(`Side Deck must contain ${(DECK_CFG.sideMin || 0)}–${(DECK_CFG.sideMax || 15)} cards. Current: ${d.side.length}.`);
    if (missing.length) errors.push(`Missing or unknown card IDs: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}`);

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      stats: {
        name: d.name,
        main: d.main.length,
        fusion: d.fusion.length,
        side: d.side.length,
        greatCount,
        uniqueMain: counts.size
      }
    };
  }

  global.CTFDeckUtils = {
    STORAGE_KEYS,
    normalizeDeck,
    loadLocalDeck,
    saveLocalDeck,
    setPlayDeck,
    getPreparedPlayDeck,
    clearPlayDeck,
    validateDeck,
    normalizeCardId,
    normalizeCardName
  };
})(window);
