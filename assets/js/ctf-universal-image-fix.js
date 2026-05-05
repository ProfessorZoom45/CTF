/* 🔥 CTF UNIVERSAL IMAGE FIX
   Purpose: fix broken images across cards.html, deckbuilder.html, and play.html.
   Strategy: dynamically resolve each card to images/<SET>/<normalized_name>.gif and fall back safely.
*/
(function(global){
  'use strict';

  var PLACEHOLDER = 'images/placeholder.gif';

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

  function getSet(card){
    var set = String((card && (card.set || card.SET || card.setCode || card.set_code || card.pack)) || '').trim();
    if(set.toUpperCase() === 'S-M') return 'SH1';
    return set.toUpperCase();
  }

  function getName(card){
    return String((card && (card.name || card.NAME || card.card_name || card.title)) || '').trim();
  }

  function buildGifPath(card){
    var set = getSet(card);
    var name = normalize(getName(card));
    if(!set || !name) return PLACEHOLDER;
    return 'images/' + set + '/' + name + '.gif';
  }

  function buildUpperGifPath(card){
    var set = getSet(card);
    var name = normalize(getName(card));
    if(!set || !name) return PLACEHOLDER;
    return 'images/' + set + '/' + name + '.GIF';
  }

  function buildPngPath(card){
    var set = getSet(card);
    var name = normalize(getName(card));
    if(!set || !name) return PLACEHOLDER;
    return 'images/' + set + '/' + name + '.png';
  }

  function getExplicit(card){
    return String((card && (card.img || card.image || card.image_path || card.imagePath)) || '').trim();
  }

  function candidates(card){
    var out = [];
    var seen = {};
    function add(path){
      if(!path || seen[path]) return;
      seen[path] = true;
      out.push(path);
    }
    add(buildGifPath(card));
    add(buildUpperGifPath(card));
    add(buildPngPath(card));
    add(getExplicit(card));
    add(PLACEHOLDER);
    return out;
  }

  function resolve(card){
    return candidates(card)[0] || PLACEHOLDER;
  }

  global.CTF_CARD_IMAGES = global.CTF_CARD_IMAGES || {};
  global.CTF_CARD_IMAGE_CANDIDATES = global.CTF_CARD_IMAGE_CANDIDATES || {};

  if(Array.isArray(global.CTF_CARDS)){
    global.CTF_CARDS.forEach(function(card){
      if(!card || !card.id) return;
      var list = candidates(card);
      global.CTF_CARD_IMAGES[card.id] = list[0] || PLACEHOLDER;
      global.CTF_CARD_IMAGE_CANDIDATES[card.id] = list;
      card.img = list[0] || PLACEHOLDER;
      card.image = list[0] || PLACEHOLDER;
    });
  }

  global.CTF_IMAGE = {
    placeholder: PLACEHOLDER,
    normalize: normalize,
    resolve: resolve,
    candidates: candidates
  };

  global.CTF_CARD_IMAGE_FALLBACK = function(img, card){
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
  };

  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('img').forEach(function(img){
      if((img.getAttribute('src') || '').indexOf('images/') !== -1){
        global.CTF_CARD_IMAGE_FALLBACK(img);
      }
    });
  });
})(window);
