
/*
CTF Card Database + Deck Builder (Static / GitHub Pages)
Rules enforced (Deck Builder):
- Deck size: 40–60 cards (valid range)
- Great cards: max 5 total
- Each Great card: max 1 copy
- Non-Great cards: max 3 copies
- Side Deck: 0–15 cards
*/

const DATA_URL = 'data/cards.json';
const PLACEHOLDER_IMAGE = 'images/placeholder.gif';

const state = {
  cards: [],
  filtered: [],
  sets: [],
  deck: { main: [], fusion: [], side: [] },
  activeTab: 'main',
};

const el = (id) => document.getElementById(id);
const norm = (value) => String(value || '').trim();
const slug = (value) => norm(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const compact = (value) => norm(value).toLowerCase().replace(/[^a-z0-9]+/g, '');

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function getCardsArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.cards)) return payload.cards;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function cardName(card) {
  return norm(card.name || card.NAME || card.card_name || card.title);
}

function cardSet(card) {
  return norm(card.set || card.SET || card.set_code || card.source_set || card.pack);
}

function cardType(card) {
  return norm(card.category || card.card_type || card.typeLine || card.group || card.GROUP || card.type || card.TYPE);
}

function cardDesc(card) {
  return norm(card.desc || card.DESC || card.description || card.text || card.effect || card.lore);
}

function cardLevel(card) {
  return norm(card.level || card.LEVEL);
}

function cardPressure(card) {
  return norm(card.pressure || card.ATK || card.atk);
}

function cardCounterPressure(card) {
  return norm(card.counter_pressure || card.DEF || card.def);
}

function isFusion(card) {
  const text = `${cardType(card)} ${cardDesc(card)} ${norm(card.fusion || card.FUSION)}`.toLowerCase();
  return text.includes('fusion') && !text.includes('fusion=0');
}

function isGreat(card) {
  return /\bgreat\b/i.test(`${cardName(card)} ${cardType(card)} ${cardDesc(card)}`);
}

function candidateImagePaths(card) {
  const existing = norm(card.image || card.img || card.image_url || card.imageUrl || card.art || card.src);
  const name = cardName(card);
  const set = cardSet(card);
  const bases = uniq([
    name,
    slug(name),
    compact(name),
    name.replace(/\s+/g, ''),
    name.replace(/\s+/g, '_'),
    name.replace(/[’']/g, ''),
    name.replace(/[’']/g, '_'),
    slug(name).replace(/_/g, ''),
  ]);
  const exts = ['gif', 'GIF', 'png', 'jpg', 'jpeg', 'webp'];
  const paths = [];
  if (existing) paths.push(existing);
  for (const b of bases) {
    for (const ext of exts) {
      if (set) {
        paths.push(`images/${set}/${b}.${ext}`);
        paths.push(`IMAGES/${set}/${b}.${ext}`);
      }
      paths.push(`images/${b}.${ext}`);
      paths.push(`IMAGES/${b}.${ext}`);
    }
  }
  return uniq(paths);
}

function resolveImage(card) {
  const candidates = candidateImagePaths(card);
  return candidates[0] || PLACEHOLDER_IMAGE;
}

function attachImageFallback(img, card) {
  const candidates = candidateImagePaths(card);
  let index = 0;
  img.onerror = () => {
    index += 1;
    if (index < candidates.length) {
      img.src = candidates[index];
    } else {
      img.onerror = null;
      img.src = PLACEHOLDER_IMAGE;
    }
  };
  img.src = candidates[0] || PLACEHOLDER_IMAGE;
}

async function loadCards() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
    const payload = await res.json();
    state.cards = getCardsArray(payload).map((card, index) => ({ ...card, _id: card.id || `${cardSet(card)}-${cardName(card)}-${index}` }));
    state.filtered = [...state.cards];
    state.sets = uniq(state.cards.map(cardSet)).sort();
    hydrateFilters();
    renderCards();
    renderStats();
  } catch (err) {
    console.error(err);
    const grid = el('cardsGrid') || el('cardGrid') || el('cards');
    if (grid) grid.innerHTML = `<div class="notice">Could not load card database. ${err.message}</div>`;
  }
}

function hydrateFilters() {
  const setFilter = el('setFilter');
  if (setFilter) {
    setFilter.innerHTML = '<option value="">All Sets</option>' + state.sets.map(s => `<option value="${s}">${s}</option>`).join('');
  }
  ['searchInput', 'setFilter', 'typeFilter'].forEach(id => {
    const node = el(id);
    if (node) node.addEventListener('input', applyFilters);
    if (node) node.addEventListener('change', applyFilters);
  });
}

function applyFilters() {
  const q = (el('searchInput')?.value || '').toLowerCase().trim();
  const set = el('setFilter')?.value || '';
  const type = (el('typeFilter')?.value || '').toLowerCase();
  state.filtered = state.cards.filter(card => {
    const hay = `${cardName(card)} ${cardSet(card)} ${cardType(card)} ${cardDesc(card)}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (set && cardSet(card) !== set) return false;
    if (type && !cardType(card).toLowerCase().includes(type)) return false;
    return true;
  });
  renderCards();
  renderStats();
}

function renderStats() {
  const stats = el('stats') || el('cardStats');
  if (!stats) return;
  stats.innerHTML = `
    <span>${state.filtered.length.toLocaleString()} shown</span>
    <span>${state.cards.length.toLocaleString()} total cards</span>
    <span>${state.sets.length.toLocaleString()} sets</span>
  `;
}

function renderCards() {
  const grid = el('cardsGrid') || el('cardGrid') || el('cards');
  if (!grid) return;
  if (!state.filtered.length) {
    grid.innerHTML = '<div class="notice">No cards match your filters.</div>';
    return;
  }
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  state.filtered.forEach(card => frag.appendChild(cardNode(card)));
  grid.appendChild(frag);
}

function cardNode(card) {
  const wrap = document.createElement('article');
  wrap.className = 'card-tile';
  const img = document.createElement('img');
  img.alt = cardName(card);
  img.loading = 'lazy';
  img.className = 'card-img';
  attachImageFallback(img, card);

  const info = document.createElement('div');
  info.className = 'card-info';
  info.innerHTML = `
    <h3>${cardName(card)}</h3>
    <p class="meta"><strong>${cardSet(card) || 'NO SET'}</strong> · ${cardType(card) || 'Card'}</p>
    <p class="stats-line">Level ${cardLevel(card) || '-'} · Pressure ${cardPressure(card) || '-'} / Counter ${cardCounterPressure(card) || '-'}</p>
    <p class="desc">${cardDesc(card) || 'No effect text.'}</p>
  `;

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  actions.innerHTML = `
    <button type="button" data-zone="main">+ Main</button>
    <button type="button" data-zone="fusion">+ Fusion</button>
    <button type="button" data-zone="side">+ Side</button>
  `;
  actions.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => addToDeck(card, btn.dataset.zone)));

  wrap.append(img, info, actions);
  return wrap;
}

function addToDeck(card, zone = 'main') {
  const target = state.deck[zone] || state.deck.main;
  const name = cardName(card);
  const existingCopies = [...state.deck.main, ...state.deck.fusion, ...state.deck.side].filter(c => cardName(c) === name).length;
  if (isGreat(card) && existingCopies >= 1) return alert('Great Cards are limited to 1 copy each.');
  if (!isGreat(card) && existingCopies >= 3) return alert('Non-Great cards are limited to 3 copies.');
  if (zone === 'fusion' && state.deck.fusion.length >= 15) return alert('Fusion Deck max is 15 cards.');
  if (zone === 'side' && state.deck.side.length >= 15) return alert('Side Deck max is 15 cards.');
  target.push(card);
  renderDeck();
}

function removeFromDeck(zone, index) {
  state.deck[zone].splice(index, 1);
  renderDeck();
}

function renderDeck() {
  const panel = el('deckList');
  if (!panel) return;
  const greatCount = state.deck.main.filter(isGreat).length;
  const mainCount = state.deck.main.length;
  const legal = mainCount >= 40 && mainCount <= 60 && greatCount <= 5 && state.deck.fusion.length <= 15 && state.deck.side.length <= 15;
  panel.innerHTML = `
    <div class="deck-summary ${legal ? 'legal' : 'warning'}">
      Main: ${mainCount}/40–60 · Fusion: ${state.deck.fusion.length}/15 · Side: ${state.deck.side.length}/15 · Greats: ${greatCount}/5
    </div>
    ${deckZone('main', 'Main Deck')}
    ${deckZone('fusion', 'Fusion Deck')}
    ${deckZone('side', 'Side Deck')}
  `;
  panel.querySelectorAll('[data-remove-zone]').forEach(btn => {
    btn.addEventListener('click', () => removeFromDeck(btn.dataset.removeZone, Number(btn.dataset.removeIndex)));
  });
}

function deckZone(zone, label) {
  return `
    <section class="deck-zone">
      <h3>${label}</h3>
      ${state.deck[zone].length ? '<ul>' + state.deck[zone].map((card, i) => `<li><span>${cardName(card)}</span><button type="button" data-remove-zone="${zone}" data-remove-index="${i}">Remove</button></li>`).join('') + '</ul>' : '<p class="muted">No cards added yet.</p>'}
    </section>
  `;
}

function exportDeck() {
  const lines = [];
  lines.push('# CARRY THE FLAME Deck Export');
  lines.push('');
  lines.push('[Main Deck]');
  state.deck.main.forEach(c => lines.push(cardName(c)));
  lines.push('');
  lines.push('[Fusion Deck]');
  state.deck.fusion.forEach(c => lines.push(cardName(c)));
  lines.push('');
  lines.push('[Side Deck]');
  state.deck.side.forEach(c => lines.push(cardName(c)));
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ctf_deck_export.cnl';
  a.click();
  URL.revokeObjectURL(a.href);
}

window.addEventListener('DOMContentLoaded', () => {
  loadCards();
  const exportBtn = el('exportDeck');
  if (exportBtn) exportBtn.addEventListener('click', exportDeck);
});
