// Build the static Alpha review snapshot from an extracted CTF-GENERIC-SETS folder.
// Usage: node build-forge-review.mjs <path-to-CTF-GENERIC-SETS>
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const source = process.argv[2];
if (!source) throw new Error('Pass the extracted CTF-GENERIC-SETS directory.');
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'forge-review-data.json');
const sets = ['ZF1','ZNC','ZEC','ZFC','ZPT','ZCT','ZTS'];
const counts = {ZF1:26,ZNC:117,ZEC:709,ZFC:41,ZPT:461,ZCT:235,ZTS:24};
const citations = {
  mesopotamia: 'https://www.metmuseum.org/essays/mesopotamian-deities',
  egypt: 'https://www.metmuseum.org/exhibitions/divine-egypt',
  greece: 'https://www.metmuseum.org/essays/greek-gods-and-religious-practices',
  medusa: 'https://www.metmuseum.org/toah/hd/medu/hd_medu.htm'
};
const rootSources = {
  Gula:'https://www.metmuseum.org/art/collection/search/323812',
  Gilgamesh:'https://www.metmuseum.org/essays/gilgamesh',
  Ereshkigal:'https://oracc.museum.upenn.edu/amgg/listofdeities/erekigal/',
  Ninhursag:'https://www.britishmuseum.org/collection/object/W_1919-1011-4874',
  Lamassu:'https://www.metmuseum.org/art/collection/search/322608',
  Pazuzu:'https://www.metmuseum.org/exhibitions/listings/2014/assyria-to-iberia/blog/posts/pazuzu',
  Tiamat:'https://www.metmuseum.org/essays/epic-of-creation-mesopotamia',
  Apep:'https://www.britishmuseum.org/collection/object/Y_EA10188-13',
  Anubis:'https://www.metmuseum.org/art/collection/search/544075',
  Isis:'https://www.metmuseum.org/art/collection/search/570685',
  Sekhmet:'https://www.metmuseum.org/art/collection/search/544484',
  Seth:'https://www.metmuseum.org/art/collection/search/557091',
  Sobek:'https://www.metmuseum.org/art/collection/search/551362',
  Thoth:'https://www.metmuseum.org/exhibitions/divine-egypt/inside-the-exhibition',
  Ra:'https://www.metmuseum.org/exhibitions/divine-egypt/inside-the-exhibition',
  Cerberus:'https://www.metmuseum.org/-/media/files/learn/for-educators/publications-for-educators/greek.pdf',
  Perseus:'https://www.metmuseum.org/art/collection/search/254523',
  Gaia:'https://www.britishmuseum.org/collection/term/BIOG58378'
};
const roots = [
  ['An','mesopotamia','sky'],['Inanna','mesopotamia','star'],['Enki','mesopotamia','water'],['Enlil','mesopotamia','storm'],['Nergal','mesopotamia','shadow'],['Ereshkigal','mesopotamia','shadow'],['Nanna','mesopotamia','moon'],['Utu','mesopotamia','sun'],['Ninhursag','mesopotamia','earth'],
  ['Horus','egypt','sky'],['Osiris','egypt','shadow'],['Isis','egypt','magic'],['Thoth','egypt','wisdom'],['Sekhmet','egypt','fire'],['Seth','egypt','storm'],['Sobek','egypt','water'],['Ra','egypt','sun'],['Hathor','egypt','light'],['Anubis','egypt','shadow'],
  ['Athena','greece','wisdom'],['Hermes','greece','speed'],['Poseidon','greece','water'],['Hades','greece','shadow'],['Zeus','greece','storm'],['Helios','greece','sun'],['Selene','greece','moon'],['Gaia','greece','earth'],['Medusa','medusa','serpent'],
  ['Gula','mesopotamia','dog'],['Gilgamesh','mesopotamia','hero'],['Lamassu','mesopotamia','guardian'],['Pazuzu','mesopotamia','demon'],['Tiamat','mesopotamia','sea'],['Apep','egypt','serpent'],['Cerberus','greece','dog'],['Perseus','greece','hero']
];
const rootsNamedInOverview = {
  mesopotamia:new Set(['An','Inanna','Enki','Enlil','Nergal','Utu']),
  egypt:new Set(['Horus','Osiris']),
  greece:new Set(['Athena','Hermes','Poseidon','Hades','Zeus'])
};
const sourceEvidence = root => ({source:rootSources[root[0]]||citations[root[1]],sourceScope:(rootSources[root[0]]||root[1]==='medusa'||rootsNamedInOverview[root[1]]?.has(root[0]))?'named root':'tradition overview'});
const modifiers = ['First','Hidden','Brazen','Silent','Vigilant','Ancient','Bound','Veiled','High','Last','Wandering','Iron','Golden','Hollow','Swift','Radiant','Distant','Twilight','Burning','Living','Deep','Hallowed','Waking','Fallen','Steadfast','Rising','Obsidian','Silver','Crowned','Unbroken','Stormbound'];
const motifRules = [
  [/negate|counter|prevent|cannot be destroyed|protect/i,'Ward'],[/gain(?:s)? \d+ pressure|increase .*pressure|double .*pressure/i,'Might'],[/draw|search|add .* hand|deck/i,'Tablet'],[/destroy|remove from play|banish/i,'Judgment'],[/spawn|summon|resurrect|void/i,'Return'],[/attack|battle|damage/i,'Strike'],[/equip|sword|weapon/i,'Arm'],[/fusion|materials/i,'Union'],[/field|terrain|forest|earth/i,'Ground'],[/fire|flame|burn/i,'Flame'],[/water|flood|sea/i,'Tide'],[/wind|air|storm/i,'Gale'],[/heal|life|chi/i,'Breath'],[/trap|conceal|hidden/i,'Snare'],[/token/i,'Image']
];
function parsePtCg(file) {
  const chunks = fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').split(/(?=^\[[^\r\n]+\]\s*$)/m).filter(x => /^\[[^\r\n]+\]/.test(x));
  return chunks.map(chunk => {
    const fields = {};
    for (const line of chunk.split(/\r?\n/).slice(1)) {
      const pos = line.indexOf('=');
      if (pos > 0) fields[line.slice(0,pos).trim()] = line.slice(pos+1).trim();
    }
    return fields;
  });
}
function masterMap() {
  const map = new Map();
  const lines = fs.readFileSync(path.join(source,'OLD_TO_NEW_CARD_NAMES_MASTER.txt'),'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([^|]+) \| (.*?) -> (.*?) \| (Z[A-Z0-9]+) \| (\d+)$/);
    if (match) map.set(`${match[4]}-${match[5]}`, {sourceSet:match[1],oldName:match[2],mappedName:match[3]});
  }
  return map;
}
const history = masterMap();
function inferAlignment(group, type) {
  const g = group.toLowerCase();
  for (const [word,label] of [['demi-god','Demi-God'],['demigod','Demi-God'],['angel','Angel'],['djinn','Djinn'],['spirit','Spirit'],['god','God'],['demon','Demon'],['villain','Villain'],['hero','Hero']]) if (g.includes(word)) return label;
  if (/fiend|zombie|vampire/i.test(g)) return 'Demon';
  if (/ghost|guardian/i.test(g)) return 'Spirit';
  return /dark/i.test(type) ? 'Villain' : 'Hero';
}
const allowedRaces = {
  Hero:['Android','Human','Hybrid','Machine','Mutant','Giant Robot','Artificial Intelligence','Snake','Fish','Plant','Dinosaur','Reptile','Insect','Dragon','Beast'],
  Villain:['Android','Human','Hybrid','Machine','Mutant','Giant Robot','Artificial Intelligence','Snake','Fish','Plant','Dinosaur','Reptile','Insect','Dragon','Beast'],
  God:['Psychic','Titan','Celestial','Elemental'], 'Demi-God':['Hybrid','Psychic','Sea Serpent','Aquatic'], Angel:['Winged Beast','Hybrid','Fairy','Elf'], Demon:['Vampire','Elf','Zombie','Mutant','Hybrid','Fiend'],
  Djinn:['Construct','Alter','Union','Trickster','Pyric','Aquatic','Geological','Aeric'], Spirit:['Construct','Alter','Union','Guardian','Ghost','Pyric','Geological','Aeric','Aquatic']
};
const raceMatches = [['Artificial Intelligence',/artificial intelligence|\bai\b/i],['Giant Robot',/giant robot|gundam|mecha/i],['Sea Serpent',/sea serpent|leviathan/i],['Winged Beast',/winged beast|avian/i],['Android',/android|cyborg/i],['Machine',/machine|robot/i],['Mutant',/mutant/i],['Snake',/snake|serpent/i],['Fish',/fish/i],['Plant',/plant|flora/i],['Dinosaur',/dinosaur/i],['Reptile',/reptile/i],['Insect',/insect/i],['Dragon',/dragon/i],['Beast',/beast|animal|wolf/i],['Psychic',/psychic|psionic/i],['Titan',/titan|giant/i],['Celestial',/celestial/i],['Elemental',/elemental/i],['Aquatic',/aqua|water/i],['Elf',/elf/i],['Fairy',/fairy/i],['Vampire',/vampire/i],['Zombie',/zombie/i],['Fiend',/fiend/i],['Construct',/construct|rock/i],['Ghost',/ghost/i],['Guardian',/guardian/i],['Pyric',/pyric|fire/i],['Geological',/geological|earth|rock/i],['Aeric',/aeric|wind/i],['Trickster',/trickster/i],['Alter',/alter/i],['Union',/union/i],['Hybrid',/hybrid|chimera/i],['Human',/human|warrior|witch|ninja|gunman|mage/i]];
function inferRace(alignment, group) {
  const allowed = allowedRaces[alignment];
  for (const [race,rx] of raceMatches) if (allowed.includes(race) && rx.test(group)) return race;
  return {Hero:'Human',Villain:'Human',God:'Celestial','Demi-God':'Hybrid',Angel:'Hybrid',Demon:'Fiend',Djinn:'Construct',Spirit:'Guardian'}[alignment];
}
const skills = {
  Aeric:'Normal|Zephyr|Tempest|Gale Caller',Alter:'Normal|Shifter|Alter User|Alter Union',Android:'Normal|Cybernetic|Warrior|Ninja|Gunman|Swordsman|Healer|Hacker',
  'Artificial Intelligence':'Normal|Sentient|Gunman|Hacker|Virus|Healer',Beast:'Normal|Feral|Warrior|Ninja|Predator',Celestial:'Normal|Astral|Mage|Healer',Construct:'Normal|Golemite|Mage|Virus|Artificer',
  Dinosaur:'Normal|Primeval|Behemoth|Apex',Dragon:'Normal|Draconic|Wyrmlord|Dreadnought',Elemental:'Normal|Primordial|Mage|Shaper',Elf:'Normal|Sylvan|Warrior|Mage',Fairy:'Normal|Fae|Warrior|Mage',
  Fiend:'Normal|Infernal|Warrior|Gunman',Fish:'Normal|Marine|Warrior|Abyssal',Geological:'Normal|Tectonic|Earthshaker|Monolith',Ghost:'Normal|Ethereal|Haunter|Phantasm',
  'Giant Robot':'Normal|Titan Mech|Gunman|Juggernaut',Guardian:'Normal|Aegis|Warden|Ninja|Mage|Healer',Human:'Normal|Mortal|Warrior|Ninja|Mage|Witch|Warlock|Hacker|Gunman',
  Hybrid:'Normal|Chimera|Warrior|Ninja|Mage|Witch|Warlock|Hacker|Gunman|Virus',Insect:'Normal|Chitinous|Warrior|Swarm',Machine:'Normal|Automaton|Gunman|Hacker',
  Mutant:'Normal|Deviant|Warrior|Ninja|Mage|Gunman',Plant:'Normal|Botanical|Healer|Thornweaver',Psychic:'Normal|Psionic|Mage|Witch|Warlock|Gunman|Healer',
  Pyric:'Normal|Cinder|Igniter|Ashlord',Reptile:'Normal|Scaled|Warrior|Ninja','Sea Serpent':'Normal|Abyssal Wyrm|Warrior|Leviathan',Snake:'Normal|Serpentine|Warrior|Venomist',
  Titan:'Normal|Colossal|Warrior|Colossus',Trickster:'Normal|Mirage|Mage|Witch|Warlock',Union:'Normal|Harmonizer|Conduit|Weaver',Vampire:'Normal|Sanguine|Warrior|Bloodbinder',
  'Winged Beast':'Normal|Avian|Warrior|Aerialist',Zombie:'Normal|Dread|Undying'
};
function skillList(alignment,race) {
  if (race === 'Aquatic') return (alignment === 'Demi-God' ? 'Normal|Pelagic|Warrior|Ninja|Mage' : 'Normal|Torrential|Tideshifter|Ninja|Mage').split('|');
  return skills[race].split('|');
}
function inferSkill(race, group, branch, alignment) {
  if (branch === 'Normal') return 'Normal';
  const options = skillList(alignment,race);
  for (const skill of options.slice(1)) if (new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(group)) return skill;
  for (const skill of ['Warrior','Ninja','Mage','Witch','Warlock','Hacker','Gunman','Healer','Virus']) if (options.includes(skill) && new RegExp(`\\b${skill}\\b`,'i').test(group)) return skill;
  return options[1];
}
function motif(record) {
  for (const [rx,value] of motifRules) if (rx.test(record.desc)) return value;
  for (const [rx,value] of motifRules) if (rx.test(`${record.group} ${record.type}`)) return value;
  return record.branch === 'Normal' ? 'Omen' : 'Rite';
}
const usedNames = new Set();
const rootByName = new Map(roots.map(root=>[root[0],root]));
const trickRoots = {Ward:['Enki','Isis','Athena'],Might:['Enlil','Sekhmet','Zeus'],Tablet:['Enki','Thoth','Hermes'],Judgment:['Nergal','Seth','Hades'],Return:['Inanna','Osiris','Perseus'],Strike:['Gilgamesh','Horus','Perseus'],Arm:['Enki','Thoth','Athena'],Union:['Inanna','Isis','Hermes'],Ground:['Ninhursag','Osiris','Gaia'],Flame:['Utu','Ra','Helios'],Tide:['Enki','Sobek','Poseidon'],Gale:['Enlil','Seth','Zeus'],Breath:['Gula','Isis','Athena'],Snare:['Ereshkigal','Anubis','Hades'],Image:['Enki','Thoth','Athena'],Omen:['An','Thoth','Zeus'],Rite:['Inanna','Isis','Hermes']};
const motifTitles = {Ward:'Counterseal',Might:'War Cry',Tablet:'Seeking Tablet',Judgment:'Judgment',Return:'Return Rite',Strike:'Battle Oath',Arm:'Forged Arm',Union:'Union Rite',Ground:'Sacred Ground',Flame:'Flame Rite',Tide:'Rising Tide',Gale:'Wind Rite',Breath:'Healing Breath',Snare:'Binding Snare',Image:'Mirror Rite',Omen:'Omen',Rite:'Rite'};
const alternateTrickTitles = {Ward:'Denial Rite',Might:'Strength Rite',Tablet:'Revelation Tablet',Judgment:'Final Judgment',Return:'Restoration Rite',Strike:'Battle Surge',Arm:'Armory Rite',Union:'Joining Rite',Ground:'Sanctuary',Flame:'Ember Rite',Tide:'Flood Rite',Gale:'Storm Rite',Breath:'Life Rite',Snare:'Hidden Binding',Image:'Reflection Rite',Omen:'Prophecy',Rite:'Ancient Rite'};
const motifAdjectives = {Ward:'Guarded',Might:'Mighty',Tablet:'Seeking',Judgment:'Judging',Return:'Returning',Strike:'Keen',Arm:'Armed',Union:'Bound',Ground:'Rooted',Flame:'Burning',Tide:'Tidal',Gale:'Windborne',Breath:'Renewed',Snare:'Hidden',Image:'Mirrored',Omen:'Fated',Rite:'Consecrated'};
const attributeAdjectives = {Fire:'Ember',Water:'River',Earth:'Stone',Wind:'Sky',Dark:'Shadow',Light:'Dawn',Thunder:'Thunder',Divine:'Sacred'};
const places = {mesopotamia:['Uruk','Eridu','Nippur','Ur','Nineveh','Ashur'],egypt:['Abydos','Memphis','Thebes','Heliopolis','Saqqara','Elephantine'],greece:['Argos','Athens','Delphi','Olympia','Corinth','Crete'],medusa:['Argos','Athens','Delphi','Olympia','Corinth','Crete']};
function role(record) {
  const text=`${record.oldName} ${record.desc} ${record.group}`;
  if (record.race==='Beast' && /dog|hound|canine|wolf|best friend/i.test(text)) return 'Hound';
  return {'Artificial Intelligence':'Oracle','Giant Robot':'Colossus','Sea Serpent':'Sea Serpent','Winged Beast':'Winged Guardian',Android:'Automaton',Machine:'Construct',Mutant:'Shifter',Snake:'Serpent',Fish:'Fish',Plant:'Bloom',Dinosaur:'Primeval Beast',Reptile:'Scaled One',Insect:'Swarm',Dragon:'Wyrm',Beast:'Beast',Psychic:'Seer',Titan:'Titan',Celestial:'Celestial',Elemental:'Elemental',Aquatic:'Tidekeeper',Elf:'Elf',Fairy:'Fae',Vampire:'Bloodbound',Zombie:'Undying',Fiend:'Fiend',Construct:'Construct',Ghost:'Shade',Guardian:'Guardian',Pyric:'Flamebearer',Geological:'Stonekeeper',Aeric:'Windcaller',Trickster:'Trickster',Alter:'Shifter',Union:'Binder',Hybrid:'Chimera',Human:'Warrior'}[record.race]||'Champion';
}
function chooseRoot(record,index,m) {
  let names;
  if (record.isTrick) names=trickRoots[m]||trickRoots.Rite;
  else if (record.alignment==='God') names=['An','Ra','Zeus'];
  else if (record.alignment==='Demon') names=['Pazuzu','Seth','Medusa'];
  else if (record.alignment==='Angel'||record.alignment==='Spirit') names=['Lamassu','Isis','Athena'];
  else if (record.alignment==='Djinn') names=['Enki','Thoth','Hermes'];
  else if (/dog|hound|canine|wolf|best friend/i.test(`${record.oldName} ${record.desc}`) && record.race==='Beast') names=['Gula','Anubis','Cerberus'];
  else if (['Dragon','Snake','Reptile','Sea Serpent'].includes(record.race)) names=['Tiamat','Apep','Medusa'];
  else if (['Machine','Giant Robot','Artificial Intelligence','Android','Construct'].includes(record.race)) names=['Enki','Thoth','Athena'];
  else if (['Aquatic','Fish'].includes(record.race)) names=['Enki','Sobek','Poseidon'];
  else if (['Beast','Plant','Insect','Dinosaur','Winged Beast'].includes(record.race)) names=['Ninhursag','Sekhmet','Gaia'];
  else if (record.alignment==='Villain') names=['Nergal','Seth','Hades'];
  else names=['Gilgamesh','Horus','Perseus'];
  return rootByName.get(names[index % 3]);
}
function proposal(record, index) {
  const seed = record.globalIndex * 7 + index * 19;
  const m = motif(record);
  const root = chooseRoot(record,index,m);
  const adjective = record.branch==='Normal' ? (role(record)==='Hound'?'Watchful':'Ancient') : motifAdjectives[m]||'Ancient';
  const alternate = index >= 3;
  const title = alternate ? alternateTrickTitles[m] || 'Ancient Rite' : motifTitles[m] || m;
  const descriptor = alternate ? attributeAdjectives[record.type] || 'Ancient' : adjective;
  const kind = record.isTrick ? `${root[0]}'s ${title}` : `${root[0]}'s ${descriptor} ${role(record)}`;
  let name = kind;
  let n = 1;
  while (usedNames.has(name.toLowerCase())) {
    const extra = modifiers[(seed+n) % modifiers.length];
    const placeIndex = Math.floor((n-1)/modifiers.length)-1;
    const place = placeIndex >= 0 ? ` of ${places[root[1]][placeIndex % places[root[1]].length]}` : '';
    const cycle = placeIndex >= places[root[1]].length ? ` ${modifiers[Math.floor(placeIndex/places[root[1]].length)%modifiers.length]}` : '';
    name = record.isTrick ? `${root[0]}'s ${extra} ${title}${place}${cycle}` : `${root[0]}'s ${extra} ${descriptor} ${role(record)}${place}${cycle}`;
    n++;
    if (n>1000) throw new Error(`Unable to distinguish ${record.id}`);
  }
  usedNames.add(name.toLowerCase());
  return {name,root:root[0],tradition:root[1],...sourceEvidence(root),basis:`Ancient ${root[1]} name; ${record.isTrick?'effect':'race and effect'} motif ${m.toLowerCase()} inferred from the card record. Editorial proposal; verify cultural and mechanical fit.`};
}
let globalIndex = 0;
const cards = [];
for (const set of sets) {
  const data = parsePtCg(path.join(source,set,`${set}.ptcg`));
  if (data.length !== counts[set]) throw new Error(`${set}: expected ${counts[set]} records, got ${data.length}`);
  const cnl = fs.readFileSync(path.join(source,set,`${set}.cnl`),'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  if (cnl.length !== data.length) throw new Error(`${set}: CNL count mismatch`);
  for (let i=0; i<data.length; i++) {
    const d=data[i], id=`${set}-${d.CARDNO}`;
    if (Number(d.CARDNO)!==i+1 || d.NAME!==cnl[i]) throw new Error(`${id}: PTCG/CNL mismatch`);
    const h=history.get(id);
    if (!h) throw new Error(`${id}: missing history`);
    const isTrick = set==='ZPT'||set==='ZCT'||/^(Spell|Trap)$/i.test(d.TYPE||'');
    const branch = isTrick ? 'Trick' : set==='ZFC' ? 'Fusion' : set==='ZEC' ? 'Effect' : /\/Effect\b/i.test(d.GROUP||'') ? 'Effect' : 'Normal';
    const alignment = isTrick ? null : inferAlignment(d.GROUP||'',d.TYPE||'');
    const race = isTrick ? null : inferRace(alignment,d.GROUP||'');
    const skill = isTrick ? null : inferSkill(race,d.GROUP||'',branch,alignment);
    const desc=d.DESC||'';
    const fusionSplit = branch==='Fusion' ? desc.match(/^(Fusion Materials?:.*?)(?=(?: Once| When| If| While| This| Cannot| Gains| At |$))/i) : null;
    const card={id,set,number:i+1,globalIndex:globalIndex++,currentName:d.NAME,oldName:h.oldName,sourceSet:h.sourceSet,group:d.GROUP||'',type:d.TYPE||'',icon:d.ICON||'',rank:d.LEVEL||'',pressure:d.ATK||'',counterPressure:d.DEF||'',desc,branch,isTrick,alignment,race,skill,skillOptions:isTrick?[]:skillList(alignment,race),fusionRules:fusionSplit?fusionSplit[1]:''};
    card.lineage = (card.group.match(/(?:Lineage|Origin)-\d+/g)||[])[0]||'';
    card.motif = motif(card);
    card.flags=[];
    if (set==='ZF1') card.flags.push('ZF1 name locked');
    if (!isTrick && !/\b(?:Hero|Villain|God|Demi-God|Angel|Demon|Djinn|Spirit)\b/i.test(card.group)) card.flags.push('Alignment inferred');
    if (!isTrick && !new RegExp(`\\b${race.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(card.group)) card.flags.push('Race inferred');
    if (/Effect Catalyst #|Normal Catalyst #|Fusion Catalyst #|Palm Trick #|Concealed Trick #|Token Catalyst #/.test(desc)) card.flags.push('Name references in text');
    if (branch==='Fusion' && !card.fusionRules) card.flags.push('Fusion rules need separation');
    if (isTrick) card.flags.push('Trick forge mapping pending');
    card.choices = set==='ZF1' ? [] : [0,1,2].map(index=>proposal(card,index));
    delete card.globalIndex;
    cards.push(card);
  }
}
if (cards.length!==1613 || history.size!==1613) throw new Error('Master map total mismatch');
// Generate D/E only after all A/B/C cards to preserve existing saved choices.
for (let i=0; i<cards.length; i++) {
  const card=cards[i];
  if (card.set==='ZF1') continue;
  card.globalIndex=i;
  card.choices.push(proposal(card,3),proposal(card,4));
  delete card.globalIndex;
}
const byId = new Map(cards.map(card=>[card.id,card]));
const referenceSet = {'Normal Catalyst':'ZNC','Effect Catalyst':'ZEC','Fusion Catalyst':'ZFC','Palm Trick':'ZPT','Concealed Trick':'ZCT','Token Catalyst':'ZTS'};
for (const card of cards) {
  card.references = [...new Set([...card.desc.matchAll(/\b(Normal Catalyst|Effect Catalyst|Fusion Catalyst|Palm Trick|Concealed Trick|Token Catalyst) #(\d+)\b/g)].map(match=>`${referenceSet[match[1]]}-${match[2]}`).filter(id=>byId.has(id)&&id!==card.id))];
  card.referencedBy = [];
}
for (const card of cards) for (const id of card.references) byId.get(id).referencedBy.push(card.id);
for (const token of cards.filter(card=>card.set==='ZTS')) {
  token.creatorIds = token.referencedBy;
  if (!token.creatorIds.length) token.flags.push('No creating card found in archive');
  const creator = token.creatorIds.map(id=>byId.get(id)).find(card=>card.choices.length);
  if (creator && token.creatorIds.some(id=>{
    const other=byId.get(id);
    return other.choices.length && other.choices.some((choice,index)=>choice.root!==creator.choices[index].root);
  })) token.flags.push('Multiple creator name roots; shared Token family needs review');
  const creature = /snake|serpent|reptile/i.test(token.group) ? 'Serpent' : /dragon/i.test(token.group) ? 'Dragon' : /ghost|spirit|fiend/i.test(token.group) ? 'Shade' : /beast/i.test(token.group) ? 'Beast' : /warrior|human/i.test(token.group) ? 'Guard' : 'Image';
  if (!creator && token.creatorIds.length) {
    const creators=token.creatorIds.map(id=>byId.get(id));
    const combined=creators.map(card=>`${card.currentName} ${card.desc}`).join(' ');
    const m=/lightning|thunder|wind/i.test(combined)?'Gale':/fire|flame|inferno/i.test(combined)?'Flame':/protect|guard|shield/i.test(combined)?'Ward':'Return';
    const roleName=/gunman|gunner/i.test(token.group)?'Gunner':creature;
    token.choices=token.choices.map((choice,index)=>{
      const root=rootByName.get(trickRoots[m][index % 3]);
      const descriptor=index>=3 ? attributeAdjectives[token.type]||'Ancient' : m==='Gale'?'Swift':motifAdjectives[m];
      return {...choice,name:`${root[0]}'s ${descriptor} ${roleName}`,root:root[0],tradition:root[1],...sourceEvidence(root),basis:`Related to fixed-name creator cards ${token.creatorIds.join(', ')}; ${m.toLowerCase()} motif and token form inferred from their text. Verify all creators.`};
    });
  }
  if (!creator) continue;
  token.choices = token.choices.map((choice,index)=>({
    ...choice,
    name:`${creator.choices[index].root}'s ${modifiers[(token.number*3+index)%modifiers.length]} ${creature}`,
    root:creator.choices[index].root,
    tradition:creator.choices[index].tradition,
    source:creator.choices[index].source,
    sourceScope:creator.choices[index].sourceScope,
    basis:`Draft linked to option ${'ABCDE'[index]} of creator ${creator.id}; creature form inferred from token GROUP. Compare every listed creator before approving the shared Token name.`
  }));
}
// Preserve the original A-C options while resolving any D/E collision after
// creator-linked Token names have replaced the generic proposals.
const finalNames = new Set(cards.flatMap(card=>card.choices.slice(0,3).map(choice=>choice.name.toLowerCase())));
for (const card of cards) for (const choice of card.choices.slice(3)) {
  const base=choice.name;
  let suffix=0;
  while (finalNames.has(choice.name.toLowerCase())) {
    const place=places[choice.tradition]?.[(card.number+suffix)%places[choice.tradition].length]||'Uruk';
    choice.name=`${base} of ${place}${suffix>=6?` ${suffix+1}`:''}`;
    suffix++;
  }
  finalNames.add(choice.name.toLowerCase());
}
const payload={version:1,built:'2026-09-24',sourceArchive:'CTF-GENERIC-SETS(9-7-26).zip',counts,canonicalAlignments:Object.keys(allowedRaces),allowedRaces,skills,citations,cards};
fs.writeFileSync(out,JSON.stringify(payload));
console.log(`Built ${cards.length} records → ${out}`);
