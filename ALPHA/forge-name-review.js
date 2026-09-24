const DATA_URL = new URL('./forge-review-data.json', import.meta.url);
const STORAGE_KEY = 'ctf-forge-review-2026-09-24-v2';
const PAGE_SIZE = 60;
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let data, byId, state = {}, selected = new Set(), filtered = [], shown = PAGE_SIZE, searchTimer, resetPending = false;
const value = (card, key) => state[card.id]?.[key] ?? card[key] ?? '';
const decision = card => state[card.id] || {};
const hasDecision = card => Object.keys(decision(card)).some(key => !['selected'].includes(key));
const message = msg => { $('action-message').textContent = msg; };

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.version === 1 && saved.decisions && typeof saved.decisions === 'object') state = saved.decisions;
  } catch { state = {}; }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({version:1,decisions:state,savedAt:new Date().toISOString()})); $('saved-at').textContent = 'Saved locally'; }
  catch { $('saved-at').textContent = 'Browser storage unavailable'; }
  updateStats();
}
function setDecision(card, key, item) {
  if (!state[card.id]) state[card.id] = {};
  state[card.id][key] = item;
  saveState();
}
function selectedName(card) {
  if (card.set === 'ZF1') return card.currentName;
  const d = decision(card);
  return d.manualName?.trim() || (Number.isInteger(d.nameChoice) ? card.choices[d.nameChoice]?.name : '') || '';
}
function effectText(card) {
  const d = decision(card);
  return d.effectText ?? (card.branch === 'Normal' ? '' : card.branch === 'Fusion' && card.fusionRules ? card.desc.slice(card.fusionRules.length).trim() : card.desc);
}
function currentBranch(card) { return value(card,'branch'); }
function groupLabel(card, key) { return key === 'lineage' ? card.lineage || 'No lineage tag' : card[key] || 'Unknown'; }
function populateFilters() {
  for (const set of Object.keys(data.counts)) $('set-filter').add(new Option(`${set} · ${data.counts[set]}`,set));
  for (const source of [...new Set(data.cards.map(c=>c.sourceSet))].sort()) $('source-filter').add(new Option(source,source));
}
function matches(card) {
  if ($('set-filter').value && card.set !== $('set-filter').value) return false;
  if ($('source-filter').value && card.sourceSet !== $('source-filter').value) return false;
  if ($('branch-filter').value && currentBranch(card) !== $('branch-filter').value) return false;
  const status = $('status-filter').value;
  if (status === 'undecided' && hasDecision(card)) return false;
  if (status === 'decided' && !hasDecision(card)) return false;
  if (status === 'flagged' && !card.flags.length) return false;
  if (status === 'selected' && !selected.has(card.id)) return false;
  const query = $('search').value.trim().toLowerCase();
  if (query && ![card.id,card.currentName,card.oldName,card.sourceSet,card.group,card.type,card.desc,card.lineage,card.motif,...card.choices.map(x=>x.name)].some(x=>String(x).toLowerCase().includes(query))) return false;
  return true;
}
function filterCards() {
  filtered = data.cards.filter(matches);
  shown = PAGE_SIZE;
  renderCards();
}
function renderChoice(card, option, index) {
  const checked = decision(card).nameChoice === index && !decision(card).manualName ? ' checked' : '';
  return `<label class="choice"><input type="radio" name="name-${esc(card.id)}" value="${index}" data-id="${esc(card.id)}" data-key="nameChoice"${checked}><span><b>${'ABCDE'[index]} · ${esc(option.name)}</b><small>${esc(option.tradition)} · ${esc(option.basis)}</small><a href="${esc(option.source)}" target="_blank" rel="noopener noreferrer">${option.sourceScope==='named root'?'View root source':'View tradition overview'} ↗</a></span></label>`;
}
function optionList(options, chosen) { return options.map(x=>`<option value="${esc(x)}"${x===chosen?' selected':''}>${esc(x)}</option>`).join(''); }
function editField(card, key, label, control, full=false) { return `<label class="${full?'full':''}">${esc(label)}${control.replace('DATA_ID',esc(card.id)).replace('DATA_KEY',esc(key))}</label>`; }
function editSelect(card,key,label,options,full=false) { return editField(card,key,label,`<select data-id="DATA_ID" data-key="DATA_KEY">${optionList(options,value(card,key))}</select>`,full); }
function editInput(card,key,label,type='text') { return editField(card,key,label,`<input type="${type}" data-id="DATA_ID" data-key="DATA_KEY" value="${esc(value(card,key))}">`); }
function editArea(card,key,label,contents,full=true) { return editField(card,key,label,`<textarea data-id="DATA_ID" data-key="DATA_KEY">${esc(contents)}</textarea>`,full); }
function forgeFields(card) {
  if (card.isTrick) return `<div class="status-note">Trick: review the effect's timing, targets, source references, and card interactions. Catalyst-only forge fields do not exist in this ZIP.</div>`;
  const alignment = value(card,'alignment');
  const race = value(card,'race');
  const races = data.allowedRaces[alignment] || [];
  const skills = race === 'Aquatic' ? (alignment === 'Demi-God' ? 'Normal|Pelagic|Warrior|Ninja|Mage' : 'Normal|Torrential|Tideshifter|Ninja|Mage').split('|') : (data.skills[race] || 'Normal').split('|');
  return editSelect(card,'alignment','1 · Alignment',data.canonicalAlignments) + editSelect(card,'race','2 · Race',races) + editSelect(card,'skill','3 · Skill',skills) + editSelect(card,'branch','4 · Effect class',['Normal','Effect','Fusion']) + editInput(card,'pressure','5 · Pressure','number') + editInput(card,'counterPressure','6 · Counter Pressure','number') + editInput(card,'rank','7 · Rank','number') + editArea(card,'resolution','8 · Catalyst resolution · required — timing, targets, materials, and result',value(card,'resolution'));
}
function branchFields(card) {
  const branch = currentBranch(card);
  if (card.isTrick) return editArea(card,'effectText','Effect / interaction text',effectText(card));
  if (branch === 'Normal') return editArea(card,'lore','Lore · required',value(card,'lore') || card.desc);
  if (branch === 'Effect') return editArea(card,'effectText','Effect text · required',effectText(card)) + editArea(card,'lore','Lore · optional',value(card,'lore'));
  return editArea(card,'fusionRules','Fusion rules / requirements · required',value(card,'fusionRules')) + editArea(card,'effectText','Effect text · required',effectText(card)) + editArea(card,'lore','Lore · optional',value(card,'lore'));
}
function cardHtml(card) {
  const d = decision(card), finalName = selectedName(card), locked = card.set === 'ZF1';
  let creatorHtml = card.creatorIds?.length ? `<p><b>Created by:</b> ${card.creatorIds.map(id=>`<button class="jump" data-jump="${esc(id)}" type="button">${esc(id)}</button>`).join(' ')}</p>` : '';
  if (card.references?.length) creatorHtml += `<p><b>References:</b> ${card.references.slice(0,12).map(id=>`<button class="jump" data-jump="${esc(id)}" type="button">${esc(id)}</button>`).join(' ')}${card.references.length>12?` +${card.references.length-12} more`:''}</p>`;
  if (card.referencedBy?.length && !card.creatorIds?.length) creatorHtml += `<p><b>Referenced by:</b> ${card.referencedBy.slice(0,12).map(id=>`<button class="jump" data-jump="${esc(id)}" type="button">${esc(id)}</button>`).join(' ')}${card.referencedBy.length>12?` +${card.referencedBy.length-12} more`:''}</p>`;
  return `<details class="card" data-card="${esc(card.id)}"><summary><input class="card-check" type="checkbox" aria-label="Select ${esc(card.id)}" data-select="${esc(card.id)}"${selected.has(card.id)?' checked':''}><img class="card-icon" src="assets/ctf-mark.png" alt=""><span class="card-title"><strong>${esc(card.id)} · ${esc(card.currentName)}</strong><small>Source ${esc(card.sourceSet)} · ${esc(card.oldName)}${finalName&&!locked?` <span class="newname">→ ${esc(finalName)}</span>`:''}</small></span><span class="card-meta"><span class="badge">${esc(currentBranch(card))}</span>${locked?'<span class="badge green">ZF1 locked</span>':''}${card.flags.length?`<span class="badge red">${card.flags.length} flags</span>`:''}${hasDecision(card)?'<span class="badge orange">Draft saved</span>':''}</span></summary><div class="card-body"><div class="source-panel"><h4>Archive record</h4><div class="facts"><div class="fact"><b>Generic set</b>${esc(card.set)}</div><div class="fact"><b>Source family</b>${esc(card.sourceSet)}</div><div class="fact"><b>Group tags</b>${esc(card.group)}</div><div class="fact"><b>Attribute / icon</b>${esc(card.type)} ${esc(card.icon)}</div><div class="fact"><b>Rank</b>${esc(card.rank||'—')}</div><div class="fact"><b>Pressure / Counter</b>${esc(card.pressure||'—')} / ${esc(card.counterPressure||'—')}</div></div><b>Printed description</b><p class="quote">${esc(card.desc||'No text in source record.')}</p>${creatorHtml}<div class="flags">${card.flags.map(x=>`<span class="flag">${esc(x)}</span>`).join('')}</div></div><div class="review-panel"><h4>${locked?'Protected name · format review':'Name directions · choose A, B, C, D, or E'}</h4>${locked?`<div class="locked-box">${esc(card.currentName)} is fixed. Record only a forge-format suggestion below.</div>`:`<div class="choices">${card.choices.map((x,i)=>renderChoice(card,x,i)).join('')}</div>${editInput(card,'manualName','Alternative ancient-source name · optional')}`}<div class="edit">${forgeFields(card)}${editSelect(card,'effectDecision','Effect assignment',['Undecided','Keep source wording','Rewrite references / timing','Custom draft','No effect (Normal)'],true)}${branchFields(card)}${editSelect(card,'reviewStatus','Editorial status · separate from forge step 8',['Needs review','Approved for draft','Hold for correction'],true)}${editArea(card,'note',locked?'Suggested ZF1 format changes':'Editorial notes / interaction questions',value(card,'note'))}</div></div></div></details>`;
}
function renderCards() {
  const openIds = new Set([...$('cards').querySelectorAll('details[open][data-card]')].map(el=>el.dataset.card));
  const subset = filtered.slice(0,shown), key = $('group-by').value, groups = new Map();
  for (const card of subset) { const label=groupLabel(card,key); if(!groups.has(label)) groups.set(label,[]); groups.get(label).push(card); }
  $('cards').innerHTML = groups.size ? [...groups.entries()].map(([label,cards])=>`<section class="group"><div class="group-head"><h3>${esc(label)}</h3><span>${cards.length} shown <button type="button" data-select-group="${esc(label)}">Select group</button></span></div>${cards.map(cardHtml).join('')}</section>`).join('') : '<p>No cards match these filters.</p>';
  for (const el of $('cards').querySelectorAll('details[data-card]')) if (openIds.has(el.dataset.card)) el.open = true;
  $('visible-count').textContent = `${Math.min(shown,filtered.length)} shown / ${filtered.length} matched`;
  $('load-more').hidden = shown >= filtered.length;
  $('select-page').checked = subset.length > 0 && subset.every(c=>selected.has(c.id));
  $('selected-count').textContent = `${selected.size} selected`;
  updateStats();
}
function updateStats() {
  if (!data) return;
  const decided = data.cards.filter(c=>c.set!=='ZF1' && hasDecision(c)).length;
  $('decided-count').textContent = decided.toLocaleString();
  $('progress-label').textContent = `${decided.toLocaleString()} of 1,587 rename cards touched`;
  $('progress-bar').style.width = `${decided/1587*100}%`;
}
function batch(key, raw) {
  if (raw === '') return message('Choose a batch value first.');
  let count=0;
  for (const id of selected) {
    const card=byId.get(id);
    if (!card || (key==='nameChoice' && card.set==='ZF1')) continue;
    if (!state[id]) state[id]={};
    if (key==='nameChoice') { state[id].nameChoice=Number(raw); delete state[id].manualName; }
    else state[id].effectDecision = {'keep':'Keep source wording','rewrite':'Rewrite references / timing','custom':'Custom draft','none':'No effect (Normal)'}[raw];
    count++;
  }
  saveState(); renderCards(); message(`Applied to ${count} cards.`);
}
function validation(card, d) {
  const issues=[];
  const name=selectedName(card);
  if (card.set!=='ZF1' && !name) issues.push('No name chosen');
  if (card.set==='ZTS') {
    if (!card.creatorIds?.length) issues.push('Token creator relationship not yet identified');
    if (Number.isInteger(d.nameChoice)) for (const id of card.creatorIds||[]) {
      const creator=byId.get(id), creatorChoice=creator ? decision(creator).nameChoice : undefined;
      if (creator?.choices.length && Number.isInteger(creatorChoice) && card.choices[d.nameChoice]?.root!==creator.choices[creatorChoice]?.root)
        issues.push(`Token myth root differs from chosen creator ${id}`);
    }
  }
  if (card.isTrick) return issues;
  const alignment=value(card,'alignment'), race=value(card,'race'), skill=value(card,'skill'), branch=currentBranch(card);
  if (!(data.allowedRaces[alignment]||[]).includes(race)) issues.push('Race is outside selected alignment');
  const skillOptions = race === 'Aquatic' ? (alignment === 'Demi-God' ? 'Normal|Pelagic|Warrior|Ninja|Mage' : 'Normal|Torrential|Tideshifter|Ninja|Mage').split('|') : (data.skills[race]||'').split('|');
  if (!skillOptions.includes(skill)) issues.push('Skill is outside selected race');
  if (branch==='Normal' && !(d.lore ?? card.desc).trim()) issues.push('Normal lore required');
  if (branch==='Effect' && !effectText(card).trim()) issues.push('Effect text required');
  if (branch==='Fusion' && !value(card,'fusionRules').trim()) issues.push('Fusion rules required');
  if (branch==='Fusion' && !effectText(card).trim()) issues.push('Fusion effect required');
  for (const field of ['pressure','counterPressure','rank']) if (value(card,field)==='' || Number(value(card,field))<0) issues.push(`${field} required`);
  if (!value(card,'resolution').trim()) issues.push('Catalyst resolution text required');
  return issues;
}
function decisionsForExport() {
  const records=[];
  for (const card of data.cards) {
    const d=decision(card);
    if (!hasDecision(card)) continue;
    records.push({id:card.id,set:card.set,number:card.number,sourceSet:card.sourceSet,oldName:card.oldName,currentName:card.currentName,nameLocked:card.set==='ZF1',chosenName:selectedName(card),nameChoice:Number.isInteger(d.nameChoice)?'ABCDE'[d.nameChoice]:'Custom / none',mythSource:Number.isInteger(d.nameChoice)?card.choices[d.nameChoice]?.source||'':'',creatorIds:card.creatorIds||[],alignment:card.isTrick?'':value(card,'alignment'),race:card.isTrick?'':value(card,'race'),skill:card.isTrick?'':value(card,'skill'),effectClass:currentBranch(card),pressure:value(card,'pressure'),counterPressure:value(card,'counterPressure'),rank:value(card,'rank'),catalystResolution:value(card,'resolution'),reviewStatus:d.reviewStatus||'Needs review',effectDecision:d.effectDecision||'Undecided',fusionRules:value(card,'fusionRules'),effectText:effectText(card),lore:d.lore??(currentBranch(card)==='Normal'?card.desc:''),note:d.note||'',sourceFlags:card.flags,validation:validation(card,d)});
  }
  const names=new Map();
  for(const r of records) if(r.chosenName){const key=r.chosenName.toLowerCase();if(names.has(key)){r.validation.push(`Name also used by ${names.get(key)}`);}else names.set(key,r.id);}
  return records;
}
function download(filename, mime, contents) {
  const blob=new Blob([contents],{type:mime}), url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function table(records, delimiter) {
  const fields=['id','set','sourceSet','currentName','oldName','chosenName','nameChoice','alignment','race','skill','effectClass','pressure','counterPressure','rank','catalystResolution','reviewStatus','effectDecision','fusionRules','effectText','lore','creatorIds','mythSource','note','validation'];
  const cell = v => { const s=Array.isArray(v)?v.join('; '):String(v??''); return delimiter===',' ? `"${s.replaceAll('"','""')}"` : s.replaceAll('\t',' ').replaceAll(/\r?\n/g,' | '); };
  return [fields.join(delimiter),...records.map(r=>fields.map(f=>cell(r[f])).join(delimiter))].join('\r\n');
}
function doExport(kind) {
  const records=decisionsForExport();
  if (!records.length) return message('Make at least one decision before exporting.');
  const manifest={format:'CTF_FORGE_REVIEW_V1',sourceArchive:data.sourceArchive,exportedAt:new Date().toISOString(),count:records.length,records};
  if (kind==='json') download('ctf-forge-review-decisions.json','application/json',JSON.stringify(manifest,null,2));
  if (kind==='csv') download('ctf-forge-review-decisions.csv','text/csv;charset=utf-8','\uFEFF'+table(records,','));
  if (kind==='txt') download('ctf-forge-review-decisions.txt','text/plain;charset=utf-8',records.map(r=>`${r.id} | ${r.currentName} → ${r.chosenName||'[pending]'} | ${r.effectClass} | ${r.effectDecision}\nSource: ${r.sourceSet} / ${r.mythSource||'none'}\nValidation: ${r.validation.join('; ')||'none'}\nNotes: ${r.note||'none'}\n`).join('\n'));
  if (kind==='tsv') navigator.clipboard.writeText(table(records,'\t')).then(()=>message(`${records.length} decisions copied as TSV.`)).catch(()=>message('Clipboard unavailable; use CSV download.'));
  else message(`Exported ${records.length} draft decisions. ${records.filter(r=>r.validation.length).length} still have validation notes.`);
}
function importFile(file) {
  file.text().then(text=>{
    const payload=JSON.parse(text);
    if (payload.format!=='CTF_FORGE_REVIEW_V1' || !Array.isArray(payload.records)) throw Error('Not a CTF forge review manifest.');
    let count=0;
    for(const r of payload.records){const card=byId.get(r.id);if(!card)continue;const d=state[r.id]||{};if(card.set!=='ZF1'){
      const idx='ABCDE'.indexOf(r.nameChoice);if(idx>=0&&card.choices[idx]?.name===r.chosenName){d.nameChoice=idx;delete d.manualName;}else if(r.chosenName){d.manualName=r.chosenName;delete d.nameChoice;}}
      for(const key of ['alignment','race','skill','pressure','counterPressure','rank','fusionRules','effectText','lore','note']) if(r[key]!==undefined&&r[key]!=='') d[key]=r[key];
      if(r.effectClass) d.branch=r.effectClass;if(r.effectDecision) d.effectDecision=r.effectDecision;if(r.catalystResolution)d.resolution=r.catalystResolution;if(r.reviewStatus)d.reviewStatus=r.reviewStatus;
      state[r.id]=d;count++;
    }saveState();filterCards();message(`Imported ${count} decisions.`);
  }).catch(err=>message(`Import failed: ${err.message}`));
}
function handleField(event) {
  const el=event.target, card=byId.get(el.dataset.id);
  if(!card || !el.dataset.key)return;
  const key=el.dataset.key;
  if(key==='nameChoice'){setDecision(card,key,Number(el.value));if(state[card.id].manualName){delete state[card.id].manualName;saveState();}renderCards();return;}
  if(key==='manualName' && card.set==='ZF1')return;
  setDecision(card,key,el.value);
  if(key==='alignment'){
    const races=data.allowedRaces[el.value]||[];
    if(!races.includes(value(card,'race')))state[card.id].race=races[0];
    state[card.id].skill=(data.skills[value(card,'race')]||'Normal').split('|')[0];
    saveState();renderCards();
  } else if(key==='race'){
    state[card.id].skill=(data.skills[el.value]||'Normal').split('|')[0];saveState();renderCards();
  } else if(key==='branch')renderCards();
  else if(key==='manualName') { const title=el.closest('.card').querySelector('.card-title .newname'); if(title)title.textContent=`→ ${el.value}`; }
}
function wire() {
  for(const id of ['set-filter','source-filter','branch-filter','status-filter']) $(id).addEventListener('change',filterCards);
  $('group-by').addEventListener('change',renderCards);
  $('search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(filterCards,180)});
  $('cards').addEventListener('click',e=>{
    if(e.target.matches('[data-select-group]')){const group=e.target.dataset.selectGroup, key=$('group-by').value;for(const card of filtered)if(groupLabel(card,key)===group)selected.add(card.id);renderCards();message(`Selected the full ${group} group.`);return;}
    if(e.target.matches('[data-jump]')){e.preventDefault();$('search').value=e.target.dataset.jump;filterCards();$('workspace').scrollIntoView();return;}
    if(e.target.matches('.card-check'))e.stopPropagation();
  });
  $('cards').addEventListener('change',e=>{
    if(e.target.matches('[data-select]')){const id=e.target.dataset.select;e.target.checked?selected.add(id):selected.delete(id);renderCards();return;}
    handleField(e);
  });
  $('cards').addEventListener('input',e=>{if(e.target.matches('textarea,[data-key="manualName"],[data-key="pressure"],[data-key="counterPressure"],[data-key="rank"],[data-key="note"]'))handleField(e)});
  $('select-page').addEventListener('change',e=>{for(const card of filtered.slice(0,shown))e.target.checked?selected.add(card.id):selected.delete(card.id);renderCards()});
  $('select-filtered').addEventListener('click',()=>{for(const card of filtered)selected.add(card.id);renderCards();message(`${filtered.length} filtered cards selected.`)});
  $('clear-selection').addEventListener('click',()=>{selected.clear();renderCards()});
  $('apply-batch-name').addEventListener('click',()=>batch('nameChoice',$('batch-name').value));
  $('apply-batch-effect').addEventListener('click',()=>batch('effectDecision',$('batch-effect').value));
  $('load-more').addEventListener('click',()=>{shown+=PAGE_SIZE;renderCards()});
  for(const kind of ['json','csv','txt']) $(`export-${kind}`).addEventListener('click',()=>doExport(kind));
  $('copy-tsv').addEventListener('click',()=>doExport('tsv'));
  $('import-json').addEventListener('change',e=>{if(e.target.files[0])importFile(e.target.files[0]);e.target.value=''});
  $('reset-decisions').addEventListener('click',()=>{
    if (!resetPending) {resetPending=true;message('Click Reset local decisions again to clear drafts. Export first if needed.');setTimeout(()=>{resetPending=false},8000);return;}
    resetPending=false;state={};selected.clear();saveState();filterCards();message('Local draft decisions cleared.');
  });
}
try {
  const response=await fetch(DATA_URL);
  if(!response.ok)throw Error(`Data request returned ${response.status}`);
  data=await response.json();
  if(data.cards?.length!==1613)throw Error('Expected 1,613 archive cards.');
  byId=new Map(data.cards.map(c=>[c.id,c]));
  readState();populateFilters();wire();filterCards();
} catch(error) {
  $('cards').innerHTML=`<p class="notice">Could not load the card snapshot: ${esc(error.message)}. Serve this ALPHA folder over HTTP, such as GitHub Pages, instead of opening the file directly.</p>`;
  $('visible-count').textContent='Data unavailable';
}
