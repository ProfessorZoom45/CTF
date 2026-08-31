/*
 * Card Database 2.0 delta from SETS8-25-26 updated.zip.
 * This follows the 8/24 normalization layer and keeps the full, active
 * 1,613-card collection available to the Collection and TheForge pages.
 */
(function(global){
  const cards = (typeof CTF_CARDS !== 'undefined' && Array.isArray(CTF_CARDS))
    ? CTF_CARDS
    : global.CTF_CARDS;
  if(!Array.isArray(cards)) return;
  global.CTF_CARDS = cards;

  const updates = {
    'dbz-019-summoningbuu': {
      name: 'Summoning Buu',
      desc: 'Special Spawn "Majin-Buu" or "Kid Buu" from your hand. To do this, discard Catalysts from your hand whose total Levels exactly equal the Level of the card you are Special Spawning.'
    },
    'dbz-027-kidbuu': {
      desc: 'This card can only be Special Spawned from your hand by the effect of "Summoning Buu". To do this, discard Catalysts from your hand whose total Levels exactly equal this card\'s Level. This card cannot be destroyed by Palm Tricks or Concealed Tricks.'
    }
  };
  cards.forEach(function(card){
    const update = updates[card && card.id];
    if(update) Object.assign(card, update);
  });
  cards.filter(function(card){ return String(card && card.set).toUpperCase() === 'TOKEN'; }).forEach(function(card){
    card.kinds = Array.isArray(card.kinds) ? card.kinds : [];
    if(!card.kinds.includes('Token')) card.kinds.push('Token');
    card.kindsStr = card.kinds.join(' / ');
    card.sub = card.sub || 'Token';
  });

  const additions = [
    {id:'inu-025-shikonjewelshard',set:'inu',name:'Shikon Jewel Shard',cardType:'Palm Trick',alignment:'',level:0,pr:0,cp:0,kinds:[],kindsStr:'',sub:'Equip',desc:'Increase the Pressure of the equipped Catalyst by 200. When a Catalyst with this card attacks with a Pressure higher than the Counter Pressure of your opponent\'s Counter Position Catalyst, inflict the difference as Logic damage to your opponent\'s Chi.',great:false},
    {id:'token-012-shadowtoken',set:'token',name:'Shadow Token',cardType:'Catalyst',alignment:'Dark',level:1,pr:500,cp:500,kinds:['Warrior','Shadow','Token','Normal'],kindsStr:'Warrior / Shadow / Token / Normal',sub:'Token',desc:'A Shadow Token created by Shadow-Type effects. [TOKEN]',great:false},
    {id:'token-013-robottoken',set:'token',name:'Robot Token',cardType:'Catalyst',alignment:'Dark',level:1,pr:500,cp:500,kinds:['Machine','Token','Normal'],kindsStr:'Machine / Token / Normal',sub:'Token',desc:'A Robot Token created by Machine Field effects. [TOKEN]',great:false},
    {id:'token-014-shadowclonetoken',set:'token',name:'Shadow Clone Token',cardType:'Catalyst',alignment:'Wind',level:1,pr:0,cp:500,kinds:['Warrior','Shadow','Ninja','Token','Effect'],kindsStr:'Warrior / Shadow / Ninja / Token / Effect',sub:'Token',desc:'A Shadow Clone Token created by Naruto-based effects. [TOKEN]',great:false},
    {id:'token-015-carrottoken',set:'token',name:'Carrot Token',cardType:'Catalyst',alignment:'Earth',level:1,pr:0,cp:0,kinds:['Plant','Token','Normal'],kindsStr:'Plant / Token / Normal',sub:'Token',desc:'A Carrot Token created by Boss Rabbit. [TOKEN]',great:false},
    {id:'token-016-saiyantoken',set:'token',name:'Saiyan Token',cardType:'Catalyst',alignment:'Wind',level:1,pr:800,cp:600,kinds:['Warrior','Saiyan','Token','Normal'],kindsStr:'Warrior / Saiyan / Token / Normal',sub:'Token',desc:'A Saiyan Token created by Saiyan effects. [TOKEN]',great:false},
    {id:'token-017-yoshieggtoken',set:'token',name:"Yoshi's Egg Token",cardType:'Catalyst',alignment:'Water',level:1,pr:400,cp:400,kinds:['Reptile','Token','Normal'],kindsStr:'Reptile / Token / Normal',sub:'Token',desc:"A Yoshi's Egg Token created by Yoshi-based effects. [TOKEN]",great:false},
    {id:'token-018-spinyeggtoken',set:'token',name:'Spiny Egg Token',cardType:'Catalyst',alignment:'Earth',level:1,pr:0,cp:2000,kinds:['Reptile','Token','Normal'],kindsStr:'Reptile / Token / Normal',sub:'Token',desc:'A defensive Spiny Egg Token created by Lakitu. [TOKEN]',great:false},
    {id:'token-019-kagebushintoken',set:'token',name:'Kage Bushin Token',cardType:'Catalyst',alignment:'Earth',level:2,pr:500,cp:500,kinds:['Warrior','Ninja','Token','Normal'],kindsStr:'Warrior / Ninja / Token / Normal',sub:'Token',desc:'A Kage Bushin Token created by Naruto effects. [TOKEN]',great:false},
    {id:'token-020-puppettoken',set:'token',name:'Puppet Token',cardType:'Catalyst',alignment:'Earth',level:3,pr:1200,cp:1000,kinds:['Machine','Token','Normal'],kindsStr:'Machine / Token / Normal',sub:'Token',desc:'A Puppet Token created by Kankuro. [TOKEN]',great:false},
    {id:'token-021-opiumtoken',set:'token',name:'Opium Token',cardType:'Catalyst',alignment:'Dark',level:1,pr:0,cp:0,kinds:['Plant','Token','Normal'],kindsStr:'Plant / Token / Normal',sub:'Token',desc:'An Opium Token created by RKN effects. [TOKEN]',great:false},
    {id:'token-022-minibottoken',set:'token',name:'Minibot Token',cardType:'Catalyst',alignment:'Dark',level:1,pr:500,cp:1000,kinds:['Machine','Token','Normal'],kindsStr:'Machine / Token / Normal',sub:'Token',desc:'A Minibot Token created by Dr. Robotnik - Eggbot. [TOKEN]',great:false},
    {id:'token-023-washudoll',set:'token',name:'Washu Doll',cardType:'Catalyst',alignment:'Earth',level:2,pr:1000,cp:1000,kinds:['Machine','Token','Normal'],kindsStr:'Machine / Token / Normal',sub:'Token',desc:'A Washu Doll created by Washu. [TOKEN]',great:false},
    {id:'token-024-buckthegreattoken',set:'token',name:'BuCk The Great Token',cardType:'Catalyst',alignment:'Fire',level:3,pr:1000,cp:1000,kinds:['Gunman','Token','Normal'],kindsStr:'Gunman / Token / Normal',sub:'Token',desc:'A BuCk The Great Token created by Keep It Moving. This Token cannot be used as a Tribute. [TOKEN]',great:false}
  ];
  const knownIds = new Set(cards.map(function(card){ return card.id; }));
  additions.forEach(function(card){ if(!knownIds.has(card.id)) cards.push(card); });

  // Palm Tricks have no Level, Pressure, or Counter Pressure. Any legacy
  // record carrying a level was parsed from a Catalyst entry and must remain
  // a Catalyst in the browser database and TheForge.
  const catalystTypeCorrections = cards.filter(function(card){
    return card && card.cardType === 'Palm Trick' && Number(card.level) > 0;
  });
  catalystTypeCorrections.forEach(function(card){ card.cardType = 'Catalyst'; });

  global.CTF_CARD_IMAGES_OVERRIDES = Object.assign({}, global.CTF_CARD_IMAGES_OVERRIDES, {
    'dbz-019-summoningbuu':'images/DBZ/SummoningBuu.gif',
    'inu-025-shikonjewelshard':'images/INU/shikon_jewel_shard.gif',
    'token-017-yoshieggtoken':'images/TOKEN/yoshi_seggtoken.gif',
    'token-018-spinyeggtoken':'images/TOKEN/spinyeggtoken.gif'
  });

  global.CTF_ALPHA_SET_AUDIT = {
    source: 'SETS8-25-26 updated',
    activeSets: 41,
    activeCards: cards.length,
    normalizedEntries: 16,
    catalystTypeCorrections: catalystTypeCorrections.length,
    note: 'The 8/25 delta adds Shikon Jewel Shard and 13 token cards. It also restores 89 leveled Catalyst records that were misclassified as Palm Tricks. Available art is resolved; remaining new token art uses the CTF torch placeholder.'
  };
})(window);
