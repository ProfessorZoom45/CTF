/* CTF live card image patch
   Loaded after data.js + card-image-map.js and before the card gallery inline script.
   It fills missing/placeholder image map entries with normalized paths.
*/
(function(global){
  function normalize(value){
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, '_')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  function setCode(card){
    var raw = String((card && (card.set || card.SET || card.setCode || card.set_code)) || '').trim();
    if(raw.toUpperCase() === 'S-M') return 'SH1';
    return raw.toUpperCase();
  }

  function cardName(card){
    return String((card && (card.name || card.NAME || card.card_name || card.title)) || '').trim();
  }

  function normalizedPath(card){
    var set = setCode(card);
    var name = normalize(cardName(card));
    if(!set || !name) return 'images/placeholder.png';
    return 'images/' + set + '/' + name + '.gif';
  }

  global.CTF_CARD_IMAGES = global.CTF_CARD_IMAGES || {};

  if(Array.isArray(global.CTF_CARDS)){
    global.CTF_CARDS.forEach(function(card){
      if(!card || !card.id) return;
      var current = global.CTF_CARD_IMAGES[card.id];
      if(!current || current === 'images/placeholder.png'){
        global.CTF_CARD_IMAGES[card.id] = normalizedPath(card);
      }
    });
  }

  global.CTF_CARD_IMAGE_FALLBACK = function(img){
    if(!img) return;
    img.loading = img.loading || 'lazy';
    img.decoding = img.decoding || 'async';
    img.onerror = function(){
      var src = this.getAttribute('src') || '';
      if(/\.gif$/i.test(src)){
        this.onerror = function(){ this.onerror = null; this.src = 'images/placeholder.png'; };
        this.src = src.replace(/\.gif$/i, '.png');
        return;
      }
      this.onerror = null;
      this.src = 'images/placeholder.png';
    };
  };

  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('img.ci-img,img.modal-art,#m-img').forEach(global.CTF_CARD_IMAGE_FALLBACK);
  });
})(window);
