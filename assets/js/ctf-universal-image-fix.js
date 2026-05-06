/* CTF UNIVERSAL IMAGE FIX v3.1 (helper)
   ─────────────────────────────────────────────────────────────────────
   This file is a thin compatibility layer around the manifest-based
   resolver living in card-image-map.js. It does NOT hold a manifest of
   its own — that would mean two sources of truth.

   What this file is for:
   - Pages that include this script but NOT card-image-map.js still get
     a basic snake_case + compact name resolver and an onerror fallback.
   - Pages that include BOTH scripts get the smart manifest-based path
     (because card-image-map.js sets window.CTF_IMAGE first and this
     file just defers to it).

   In short: load card-image-map.js if you want truth. Load this file
   too if you want the same `CTF_IMAGE` API on pages that don't have
   data.js / CTF_CARDS at all.
*/
(function(global){
  'use strict';

  // If the manifest-based resolver already loaded, do nothing.
  if(global.CTF_IMAGE && global.CTF_IMAGE.version && global.CTF_IMAGE.version.indexOf('manifest') !== -1){
    return;
  }

  var PLACEHOLDER = 'images/placeholder.gif';

  function normalize(value){
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2019']/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }
  function compact(value){ return normalize(value).replace(/_/g, ''); }

  function getSet(c){
    var s = String((c && (c.set || c.SET || c.setCode || c.set_code || c.pack)) || '').trim();
    return s.toUpperCase();
  }
  function getName(c){
    return String((c && (c.name || c.NAME || c.card_name || c.title)) || '').trim();
  }
  function getExplicit(c){
    return String((c && (c.img || c.image || c.image_path || c.imagePath)) || '').trim();
  }

  function candidates(card){
    var list = [];
    var seen = {};
    function push(p){ if(p && !seen[p]){ seen[p] = true; list.push(p); } }

    var set = getSet(card);
    var snake = normalize(getName(card));
    var flat = compact(getName(card));

    if(set && snake){
      push('images/' + set + '/' + snake + '.gif');
      push('images/' + set + '/' + snake + '.GIF');
      push('images/' + set + '/' + snake + '.png');
    }
    if(set && flat){
      push('images/' + set + '/' + flat + '.gif');
      push('images/' + set + '/' + flat + '.GIF');
      push('images/' + set + '/' + flat + '.png');
    }
    var explicit = getExplicit(card);
    if(explicit) push(explicit);
    push(PLACEHOLDER);
    return list;
  }

  function resolve(card){ return candidates(card)[0] || PLACEHOLDER; }

  function applyFallback(img, card){
    if(!img) return;
    var list = card ? candidates(card) : [img.getAttribute('src') || '', PLACEHOLDER];
    var idx = 0;
    img.loading = img.loading || 'lazy';
    img.decoding = img.decoding || 'async';
    img.onerror = function(){
      idx += 1;
      if(idx < list.length){ this.src = list[idx]; }
      else { this.onerror = null; this.src = PLACEHOLDER; }
    };
  }

  function patchCardData(){
    if(!Array.isArray(global.CTF_CARDS)) return false;
    global.CTF_CARD_IMAGES = global.CTF_CARD_IMAGES || {};
    global.CTF_CARDS.forEach(function(card){
      if(!card || !card.id) return;
      var top = resolve(card);
      global.CTF_CARD_IMAGES[card.id] = top;
      card.img = top;
      card.image = top;
    });
    return true;
  }

  function patchVisibleImages(){
    if(typeof document === 'undefined') return;
    document.querySelectorAll('img').forEach(function(img){
      var src = img.getAttribute('src') || '';
      if(src.indexOf('images/') !== -1) applyFallback(img);
    });
  }

  global.CTF_IMAGE = {
    placeholder: PLACEHOLDER,
    normalize: normalize,
    compact: compact,
    resolve: resolve,
    candidates: candidates,
    patchCardData: patchCardData,
    applyFallback: applyFallback,
    version: '3.1.0-helper'
  };

  patchCardData();
  if(typeof document !== 'undefined'){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', patchVisibleImages, { once: true });
    } else {
      patchVisibleImages();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
