// CTF Deck Utilities — Patch 1
(function(global){
  const STORAGE_KEYS = {
    activeDeck: 'ctf_deck',
    playDeck: 'ctf_play_deck'
  };

  function safeParse(raw){
    try { return JSON.parse(raw); } catch { return null; }
  }

  function normalizeDeck(deck){
    deck = deck || {};
    return {
      name: String(deck.name || 'My CTF Deck').trim() || 'My CTF Deck',
      main: Array.isArray(deck.main) ? deck.main.slice() : [],
      fusion: Array.isArray(deck.fusion) ? deck.fusion.slice() : [],
      side: Array.isArray(deck.side) ? deck.side.slice() : []
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
      if (count > 3) errors.push(`${card.name} exceeds the 3-copy limit (${count}).`);
      if (card.great && count > 1) errors.push(`${card.name} is a Great Card and can only have 1 copy.`);
    }

    if (d.main.length < 40 || d.main.length > 60) errors.push(`Main Deck must contain 40–60 cards. Current: ${d.main.length}.`);
    if (d.fusion.length > 15) errors.push(`Fusion Deck cannot exceed 15 cards. Current: ${d.fusion.length}.`);
    if (greatCount > 5) errors.push(`Main Deck cannot contain more than 5 Great Cards. Current: ${greatCount}.`);
    if (d.side.length > 15) errors.push(`Side Deck cannot exceed 15 cards. Current: ${d.side.length}.`);
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
    validateDeck
  };
})(window);
