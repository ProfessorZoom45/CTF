/* 🔥 CTF UNIVERSAL IMAGE FIX v2
   Fixes mixed image naming on GitHub Pages.
   Handles:
   - snake_case.gif
   - compactname.GIF
   - compactname.gif
   - old explicit map paths
   - png fallback
*/
(function(global){
  'use strict';

  var PLACEHOLDER = 'images/placeholder.gif';
  var patched = false;

  function normalize(value){
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  function compact(value){
    return normalize(value).replace(/_/g, '');
  }

  function titleCompact(value){
    return compact(value).replace(/\b\w/g, function(m){ return m.toUpperCase(); });
  }

  function getSet(card){
    var set = String((card && (card.set || card.SET || card.setCode || card.set_code || card.pack)) || '').trim();
    if(set.toUpperCase() === 'S-M') return 'SH1';
    return set.toUpperCase();
  }

  function getName(card){
    return String((card && (card.name || card.NAME || card.card_name || card.title)) || '').trim();
  }

  function getExplicit(card){
    return String((card && (card.img || card.image || card.image_path || card.imagePath)) || '').trim();
  }

  function addUnique(list, seen, path){
    if(!path || seen[path]) return;
    seen[path] = true;
    list.push(path);
  }

  function candidates(card){
    var list = [];
    var seen = {};
    var set = getSet(card);
    var rawName = getName(card);
    var snake = normalize(rawName);
    var flat = compact(rawName);

    if(set && snake){
      addUnique(list, seen, 'images/' + set + '/' + snake + '.gif');
      addUnique(list, seen, 'images/' + set + '/' + snake + '.GIF');
      addUnique(list, seen, 'images/' + set + '/' + snake + '.png');
    }

    if(set && flat){
      addUnique(list, seen, 'images/' + set + '/' + flat + '.gif');
      addUnique(list, seen, 'images/' + set + '/' + flat + '.GIF');
      addUnique(list, seen, 'images/' + set + '/' + flat + '.png');
    }

    addUnique(list, seen, getExplicit(card));

    if(card && card.id && global.CTF_CARD_IMAGES && global.CTF_CARD_IMAGES[card.id]){
      addUnique(list, seen, global.CTF_CARD_IMAGES[card.id]);
    }

    addUnique(list, seen, PLACEHOLDER);
    return list;
  }

  function resolve(card){
    return candidates(card)[0] || PLACEHOLDER;
  }

  function patchCardData(){
    if(!Array.isArray(global.CTF_CARDS)) return false;

    global.CTF_CARD_IMAGES = global.CTF_CARD_IMAGES || {};
    global.CTF_CARD_IMAGE_CANDIDATES = global.CTF_CARD_IMAGE_CANDIDATES || {};

    global.CTF_CARDS.forEach(function(card){
      if(!card || !card.id) return;
      var list = candidates(card);
      global.CTF_CARD_IMAGE_CANDIDATES[card.id] = list;
      global.CTF_CARD_IMAGES[card.id] = list[0] || PLACEHOLDER;
      card.img = list[0] || PLACEHOLDER;
      card.image = list[0] || PLACEHOLDER;
    });

    patched = true;
    return true;
  }

  function applyFallback(img, card){
    if(!img) return;
    var list = card ? candidates(card) : [img.getAttribute('src') || '', PLACEHOLDER];
    var index = 0;
    img.loading = img.loading || 'lazy';
    img.decoding = img.decoding || 'async';
    img.onerror = function(){
      index += 1;
      if(index < list.length){
        this.src = list[index];
      }else{
        this.onerror = null;
        this.src = PLACEHOLDER;
      }
    };
  }

  function patchVisibleImages(){
    document.querySelectorAll('img').forEach(function(img){
      if((img.getAttribute('src') || '').indexOf('images/') !== -1){
        applyFallback(img);
      }
    });
  }

  global.CTF_IMAGE = {
    placeholder: PLACEHOLDER,
    normalize: normalize,
    compact: compact,
    resolve: resolve,
    candidates: candidates,
    patchCardData: patchCardData,
    applyFallback: applyFallback
  };

  // Try now, then retry because some pages load data.js after this script is injected.
  patchCardData();
  var tries = 0;
  var timer = setInterval(function(){
    tries += 1;
    if(patchCardData() || tries > 30){
      clearInterval(timer);
      patchVisibleImages();
    }
  }, 100);

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', patchVisibleImages, { once:true });
  }else{
    patchVisibleImages();
  }
})(window);
