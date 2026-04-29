/* Carry The Flame card image resolver
   Purpose: connect card records to normalized image paths.
   Final standard: images/<SET>/<normalized_card_name>.gif
   Old explicit map still works first when present.
*/
(function(global){
  const PLACEHOLDER = 'images/placeholder.gif';

  function cleanText(value){
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, '_')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  function cleanSet(value){
    const set = String(value || '').trim();
    if(!set) return '';
    if(set.toUpperCase() === 'S-M') return 'SH1';
    return set.toUpperCase();
  }

  function getCardName(card){
    return card && (card.name || card.card_name || card.title || card.NAME || '');
  }

  function getCardSet(card){
    return card && (card.set || card.SET || card.setCode || card.set_code || card.pack || '');
  }

  function getExplicitPath(card){
    if(!card) return '';
    if(card.id && global.CTF_CARD_IMAGES && global.CTF_CARD_IMAGES[card.id]) return global.CTF_CARD_IMAGES[card.id];
    return (card.img || card.image || card.image_path || card.imagePath || '').trim();
  }

  function buildPath(card, extension){
    const set = cleanSet(getCardSet(card));
    const name = cleanText(getCardName(card));
    if(!set || !name) return PLACEHOLDER;
    return `images/${set}/${name}.${extension || 'gif'}`;
  }

  function resolveCardImage(card){
    const explicit = getExplicitPath(card);
    if(explicit && explicit !== PLACEHOLDER) return explicit;
    return buildPath(card, 'gif');
  }

  function applyFallback(img){
    if(!img) return;
    img.loading = img.loading || 'lazy';
    img.decoding = img.decoding || 'async';
    img.onerror = function(){
      const current = this.getAttribute('src') || '';
      if(current.toLowerCase().endsWith('.gif')){
        this.onerror = function(){ this.onerror = null; this.src = PLACEHOLDER; };
        this.src = current.replace(/\.gif$/i, '.png');
        return;
      }
      this.onerror = null;
      this.src = PLACEHOLDER;
    };
  }

  global.CTF_IMAGE_RESOLVER = {
    placeholder: PLACEHOLDER,
    cleanText,
    cleanSet,
    buildPath,
    resolve: resolveCardImage,
    applyFallback
  };
})(window);
