const DATA_URL = new URL('./forge-review-data.json', import.meta.url);
// The original desk and V2 intentionally share one local decision store and export schema.
const STORAGE_KEY = 'ctf-forge-review-2026-09-24-v2';
const PAGE_SIZE = 50;
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const EFFECTS = {keep:'Keep source wording',rewrite:'Rewrite references / timing',custom:'Custom draft',none:'No effect (Normal)'};
let data, byId, state = {}, selected = new Set(), filtered = [], activeId = '', page = 0, searchTimer, resetPending = false;
const decision = card => state[card.id] || {};
const value = (card, key) => decision(card)[key] ?? card[key] ?? '';
const hasDecision = card => Object.keys(decision(card)).some(key => key !== 'selected');
const currentBranch = card => value(card,'branch');
const report = (msg, error=false, target='action-message') => { $(target).textContent=msg; $(target).classList.toggle('error',error); };

function readState() {
  try { const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'); if(saved.version===1 && saved.decisions && typeof saved.decisions==='object') state=saved.decisions; }
  catch { state={}; }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,decisions:state,savedAt:new Date().toISOString()})); $('saved-at').textContent='Saved in this browser'; }
  catch { $('saved-at').textContent='Browser storage unavailable'; }
  updateStats();
}
function setValue(card,key,item) { (state[card.id] ||= {})[key]=item; saveState(); }
function selectedName(card) {
  if(card.set==='ZF1') return card.currentName;
  const d=decision(card);
  return d.manualName?.trim() || (Number.isInteger(d.nameChoice) ? card.choices[d.nameChoice]?.name : '') || '';
}
function effectText(card) {
  const d=decision(card);
  return d.effectText ?? (card.branch==='Normal' ? '' : card.branch==='Fusion' && card.fusionRules ? card.desc.slice(card.fusionRules.length).trim() : card.desc);
}
function populateFilters() {
  for(const set of Object.keys(data.counts)) $('set-filter').add(new Option(`${set} · ${data.counts[set]}`,set));
  for(const source of [...new Set(data.cards.map(c=>c.sourceSet))].sort()) $('source-filter').add(new Option(source,source));
}
function matches(card) {
  if($('set-filter').value && card.set!==$('set-filter').value) return false;
  if($('source-filter').value && card.sourceSet!==$('source-filter').value) return false;
  if($('branch-filter').value && currentBranch(card)!==$('branch-filter').value) return false;
  const status=$('status-filter').value;
  if(status==='undecided' && hasDecision(card)) return false;
  if(status==='decided' && !hasDecision(card)) return false;
  if(status==='flagged' && !card.flags.length) return false;
  if(status==='selected' && !selected.has(card.id)) return false;
  const query=$('search').value.trim().toLowerCase();
  return !query || [card.id,card.currentName,card.oldName,card.sourceSet,card.group,card.type,card.desc,card.lineage,card.motif,...card.choices.map(x=>x.name)].some(x=>String(x).toLowerCase().includes(query));
}
function filterCards() {
  filtered=data.cards.filter(matches);
  page=0;
  if(!filtered.some(c=>c.id===activeId)) activeId=(filtered.find(c=>c.set!=='ZF1')||filtered[0])?.id||'';
  else page=Math.floor(filtered.findIndex(c=>c.id===activeId)/PAGE_SIZE);
  renderQueue(); renderEditor();
}
function queueRow(card) {
  const choice=decision(card).nameChoice;
  const picked=selectedName(card);
  return `<div class="queue-row${activeId===card.id?' active':''}" data-row="${esc(card.id)}"><input type="checkbox" data-select="${esc(card.id)}" aria-label="Select ${esc(card.id)}"${selected.has(card.id)?' checked':''}><button type="button" class="queue-open" data-open="${esc(card.id)}"><b>${esc(card.id)} · ${esc(card.currentName)}</b><small>${esc(picked && card.set!=='ZF1'?picked:card.oldName)}</small><span>${esc(card.sourceSet)} · ${esc(currentBranch(card))}${hasDecision(card)?' · draft saved':''}${card.flags.length?` · ${card.flags.length} flags`:''}</span></button>${card.set==='ZF1'?'<span class="lock-tag">NAME LOCKED</span>':`<div class="quick-choices" aria-label="Quick name choices for ${esc(card.id)}">${card.choices.map((c,i)=>`<button type="button" data-quick="${esc(card.id)}" data-choice="${i}" class="${choice===i&&!decision(card).manualName?'chosen':''}" aria-label="${esc(card.id)} choice ${'ABCDE'[i]}: ${esc(c.name)}" title="${esc(c.name)}">${'ABCDE'[i]}</button>`).join('')}</div>`}</div>`;
}
function renderQueue() {
  const maxPage=Math.max(0,Math.ceil(filtered.length/PAGE_SIZE)-1); page=Math.min(page,maxPage);
  const rows=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  $('queue-list').innerHTML=rows.length?rows.map(queueRow).join(''):'<p class="empty">No cards match these filters.</p>';
  $('match-count').textContent=`${filtered.length.toLocaleString()} matched`;
  $('page-label').textContent=`${page+1} / ${maxPage+1}`;
  $('previous-page').disabled=page===0; $('next-page').disabled=page>=maxPage;
  $('select-page').checked=rows.length>0&&rows.every(c=>selected.has(c.id));
  $('selected-count').textContent=`${selected.size.toLocaleString()} selected`;
}
function updateStats() {
  if(!data) return;
  const count=data.cards.filter(c=>c.set!=='ZF1'&&hasDecision(c)).length;
  $('decided-count').textContent=count.toLocaleString();
  $('progress-label').textContent=`${count.toLocaleString()} / 1,587`;
  $('progress-bar').style.width=`${count/1587*100}%`;
}
function openCard(id) {
  const index=filtered.findIndex(c=>c.id===id);
  if(index<0) return;
  activeId=id; page=Math.floor(index/PAGE_SIZE); renderQueue(); renderEditor();
  $('queue-list').querySelector(`[data-row="${CSS.escape(id)}"]`)?.scrollIntoView({block:'nearest'});
}
function moveCard(step) { const i=filtered.findIndex(c=>c.id===activeId); if(i>=0&&filtered[i+step]) openCard(filtered[i+step].id); }
function jumpCard(id) {
  if(!byId.has(id)) return;
  $('set-filter').value=''; $('source-filter').value=''; $('branch-filter').value=''; $('status-filter').value=''; $('search').value=id;
  activeId=id; filterCards(); $('editor').scrollIntoView({behavior:'smooth',block:'start'});
}
function choiceName(card,index) {
  if(card.set==='ZF1'||!card.choices[index]) return;
  const d=(state[card.id] ||= {}); d.nameChoice=index; delete d.manualName;
  saveState(); renderQueue(); if(activeId===card.id) renderEditor();
}
function optionList(options,chosen) { return options.map(x=>`<option value="${esc(x)}"${x===chosen?' selected':''}>${esc(x)}</option>`).join(''); }
function selectField(card,key,label,options,full=false) { return `<label class="${full?'full':''}">${esc(label)}<select data-field="${esc(key)}">${optionList(options,value(card,key))}</select></label>`; }
function inputField(card,key,label,type='text') { return `<label>${esc(label)}<input data-field="${esc(key)}" type="${type}" value="${esc(value(card,key))}"></label>`; }
function areaField(card,key,label,contents,full=true) { return `<label class="${full?'full':''}">${esc(label)}<textarea data-field="${esc(key)}">${esc(contents)}</textarea></label>`; }
function forgeFields(card) {
  if(card.isTrick) return '<p class="branch-guide">Trick entry: review effect timing, targets, references, and interactions. The ZIP contains no Catalyst-only forge fields for Tricks.</p>';
  const alignment=value(card,'alignment'), race=value(card,'race');
  const races=data.allowedRaces[alignment]||[];
  const skills=race==='Aquatic'?(alignment==='Demi-God'?'Normal|Pelagic|Warrior|Ninja|Mage':'Normal|Torrential|Tideshifter|Ninja|Mage').split('|'):(data.skills[race]||'Normal').split('|');
  return `<div class="edit-grid">${selectField(card,'alignment','1 · Alignment',data.canonicalAlignments)}${selectField(card,'race','2 · Race',races)}${selectField(card,'skill','3 · Skill',skills)}${selectField(card,'branch','4 · Effect class',['Normal','Effect','Fusion'])}${inputField(card,'pressure','5 · Pressure','number')}${inputField(card,'counterPressure','6 · Counter Pressure','number')}${inputField(card,'rank','7 · Rank','number')}${areaField(card,'resolution','8 · Catalyst resolution · timing, targets, materials, result',value(card,'resolution'))}</div>`;
}
function branchFields(card) {
  const branch=currentBranch(card);
  if(card.isTrick) return areaField(card,'effectText','Effect / interaction text',effectText(card));
  if(branch==='Normal') return areaField(card,'lore','Lore · required',value(card,'lore')||card.desc);
  if(branch==='Effect') return areaField(card,'effectText','Effect text · required',effectText(card))+areaField(card,'lore','Lore · optional',value(card,'lore'));
  return areaField(card,'fusionRules','Fusion rules / requirements · required',value(card,'fusionRules'))+areaField(card,'effectText','Effect text · required',effectText(card))+areaField(card,'lore','Lore · optional',value(card,'lore'));
}
function renderEditor() {
  const card=byId.get(activeId);
  if(!card){$('editor').innerHTML='<p class="empty">Choose a card from the queue.</p>';return;}
  const position=filtered.findIndex(c=>c.id===card.id);
  const chosen=decision(card).nameChoice;
  const names=card.set==='ZF1'?`<div class="lock-box"><b>${esc(card.currentName)}</b> is final. Use the notes field for format suggestions.</div>`:`<div class="name-grid">${card.choices.map((c,i)=>`<label class="name-option${chosen===i&&!decision(card).manualName?' selected':''}"><input type="radio" name="name-choice" value="${i}" data-field="nameChoice"${chosen===i&&!decision(card).manualName?' checked':''}><span><b>${'ABCDE'[i]} · ${esc(c.name)}</b><small>${esc(c.tradition)} · ${esc(c.basis)}</small><a href="${esc(c.source)}" target="_blank" rel="noopener noreferrer">${c.sourceScope==='named root'?'Root source':'Tradition overview'} ↗</a></span></label>`).join('')}</div><label class="custom-name">Custom ancient-source name<input data-field="manualName" value="${esc(value(card,'manualName'))}" placeholder="Optional alternative"></label>`;
  const links=[];
  for(const id of card.creatorIds||[]) links.push(`<button type="button" data-jump="${esc(id)}">Creator ${esc(id)}</button>`);
  for(const id of (card.references||[]).slice(0,8)) links.push(`<button type="button" data-jump="${esc(id)}">References ${esc(id)}</button>`);
  for(const id of (card.referencedBy||[]).slice(0,8)) if(!card.creatorIds?.length) links.push(`<button type="button" data-jump="${esc(id)}">Used by ${esc(id)}</button>`);
  $('editor').innerHTML=`<div class="editor-top"><div><span class="eyebrow">${esc(card.set)} · ${esc(card.sourceSet)} · ${position+1} of ${filtered.length} matched</span><h2>${esc(card.id)} · ${esc(card.currentName)}</h2><p>Archive name: ${esc(card.oldName)}</p></div><div class="editor-arrows"><button type="button" data-move="-1" aria-label="Previous card"${position<=0?' disabled':''}>↑</button><button type="button" data-move="1" aria-label="Next card"${position>=filtered.length-1?' disabled':''}>↓</button></div></div><div class="status-pills"><span class="pill">${esc(currentBranch(card))}</span>${card.set==='ZF1'?'<span class="pill good">ZF1 name locked</span>':''}${hasDecision(card)?'<span class="pill good">Draft saved</span>':''}${card.flags.length?`<span class="pill warn">${card.flags.length} source flags</span>`:''}</div><div class="source-card"><div><b>Group</b>${esc(card.group||'—')}</div><div><b>Type / icon</b>${esc(card.type||'—')} ${esc(card.icon||'')}</div><div><b>Rank</b>${esc(card.rank||'—')}</div><div><b>Pressure / Counter</b>${esc(card.pressure||'—')} / ${esc(card.counterPressure||'—')}</div></div><div class="source-text">${esc(card.desc||'No printed description in source record.')}</div>${links.length?`<div class="editor-nav">${links.join('')}</div>`:''}${card.flags.length?`<div class="flag-list">${card.flags.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}<section class="panel-section"><h3>${card.set==='ZF1'?'Protected name':'Choose one of five name directions'}</h3>${names}</section><section class="panel-section"><h3>Forge &amp; effect entry</h3>${forgeFields(card)}<div class="edit-grid">${selectField(card,'effectDecision','Effect assignment',['Undecided','Keep source wording','Rewrite references / timing','Custom draft','No effect (Normal)'],true)}${branchFields(card)}${selectField(card,'reviewStatus','Editorial status',['Needs review','Approved for draft','Hold for correction'],true)}${areaField(card,'note',card.set==='ZF1'?'ZF1 format suggestions':'Editorial notes / interaction questions',value(card,'note'))}</div></section>`;
}
function batch(key,raw) {
  if(raw==='') return report('Choose a batch value first.',true);
  let count=0;
  for(const id of selected){const card=byId.get(id);if(!card||(key==='nameChoice'&&card.set==='ZF1'))continue;const d=(state[id] ||= {});if(key==='nameChoice'){d.nameChoice=Number(raw);delete d.manualName;}else d.effectDecision=EFFECTS[raw];count++;}
  saveState();filterCards();report(`Applied ${key==='nameChoice'?'name':'effect'} choices to ${count} cards.`);
}
function applyPaste() {
  const lines=$('paste-decisions').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  let changed=0, skipped=0;const errors=[];
  for(const [index,line] of lines.entries()){
    const [rawId,rawChoice='',rawEffect='']=line.split('\t').map(x=>x.trim());
    if(index===0&&/^(card\s*)?id$/i.test(rawId))continue;
    const card=byId.get(rawId.toUpperCase());
    const choice=rawChoice.toUpperCase(),effect=rawEffect.toLowerCase();
    if(!card){skipped++;errors.push(`Line ${index+1}: unknown ID ${rawId}`);continue;}
    if(choice&&!/^[A-E]$/.test(choice)){skipped++;errors.push(`Line ${index+1}: choice must be A–E`);continue;}
    if(effect&&!EFFECTS[effect]){skipped++;errors.push(`Line ${index+1}: unknown effect decision`);continue;}
    if(choice&&card.set==='ZF1'){skipped++;errors.push(`Line ${index+1}: ZF1 name is locked`);continue;}
    if(!choice&&!effect){skipped++;errors.push(`Line ${index+1}: no decision`);continue;}
    const d=(state[card.id] ||= {});
    if(choice){d.nameChoice='ABCDE'.indexOf(choice);delete d.manualName;}
    if(effect)d.effectDecision=EFFECTS[effect];
    changed++;
  }
  if(changed){saveState();filterCards();}
  report(`${changed} ${changed===1?'card':'cards'} updated; ${skipped} ${skipped===1?'line':'lines'} skipped.${errors.length?' '+errors.slice(0,3).join(' · ')+(errors.length>3?` · ${errors.length-3} more errors`:''):''}`,skipped>0,'paste-report');
}
function validation(card,d) {
  const issues=[];
  if(card.set!=='ZF1'&&!selectedName(card))issues.push('No name chosen');
  if(card.set==='ZTS'){
    if(!card.creatorIds?.length)issues.push('Token creator relationship not yet identified');
    if(Number.isInteger(d.nameChoice))for(const id of card.creatorIds||[]){const creator=byId.get(id), creatorChoice=creator?decision(creator).nameChoice:undefined;
      if(creator?.choices.length&&Number.isInteger(creatorChoice)&&card.choices[d.nameChoice]?.root!==creator.choices[creatorChoice]?.root)issues.push(`Token myth root differs from chosen creator ${id}`);}
  }
  if(card.isTrick)return issues;
  const alignment=value(card,'alignment'),race=value(card,'race'),skill=value(card,'skill'),branch=currentBranch(card);
  if(!(data.allowedRaces[alignment]||[]).includes(race))issues.push('Race is outside selected alignment');
  const skills=race==='Aquatic'?(alignment==='Demi-God'?'Normal|Pelagic|Warrior|Ninja|Mage':'Normal|Torrential|Tideshifter|Ninja|Mage').split('|'):(data.skills[race]||'').split('|');
  if(!skills.includes(skill))issues.push('Skill is outside selected race');
  if(branch==='Normal'&&!(d.lore??card.desc).trim())issues.push('Normal lore required');
  if(branch==='Effect'&&!effectText(card).trim())issues.push('Effect text required');
  if(branch==='Fusion'&&!value(card,'fusionRules').trim())issues.push('Fusion rules required');
  if(branch==='Fusion'&&!effectText(card).trim())issues.push('Fusion effect required');
  for(const field of ['pressure','counterPressure','rank'])if(value(card,field)===''||Number(value(card,field))<0)issues.push(`${field} required`);
  if(!value(card,'resolution').trim())issues.push('Catalyst resolution text required');
  return issues;
}
function decisionsForExport() {
  const records=[];
  for(const card of data.cards){const d=decision(card);if(!hasDecision(card))continue;
    records.push({id:card.id,set:card.set,number:card.number,sourceSet:card.sourceSet,oldName:card.oldName,currentName:card.currentName,nameLocked:card.set==='ZF1',chosenName:selectedName(card),nameChoice:Number.isInteger(d.nameChoice)?'ABCDE'[d.nameChoice]:'Custom / none',mythSource:Number.isInteger(d.nameChoice)?card.choices[d.nameChoice]?.source||'':'',creatorIds:card.creatorIds||[],alignment:card.isTrick?'':value(card,'alignment'),race:card.isTrick?'':value(card,'race'),skill:card.isTrick?'':value(card,'skill'),effectClass:currentBranch(card),pressure:value(card,'pressure'),counterPressure:value(card,'counterPressure'),rank:value(card,'rank'),catalystResolution:value(card,'resolution'),reviewStatus:d.reviewStatus||'Needs review',effectDecision:d.effectDecision||'Undecided',fusionRules:value(card,'fusionRules'),effectText:effectText(card),lore:d.lore??(currentBranch(card)==='Normal'?card.desc:''),note:d.note||'',sourceFlags:card.flags,validation:validation(card,d)});
  }
  const names=new Map();for(const record of records)if(record.chosenName){const key=record.chosenName.toLowerCase();if(names.has(key))record.validation.push(`Name also used by ${names.get(key)}`);else names.set(key,record.id);}
  return records;
}
function download(filename,mime,contents){const blob=new Blob([contents],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function table(records,delimiter){const fields=['id','set','sourceSet','currentName','oldName','chosenName','nameChoice','alignment','race','skill','effectClass','pressure','counterPressure','rank','catalystResolution','reviewStatus','effectDecision','fusionRules','effectText','lore','creatorIds','mythSource','note','validation'];const cell=v=>{const s=Array.isArray(v)?v.join('; '):String(v??'');return delimiter===','?`"${s.replaceAll('"','""')}"`:s.replaceAll('\t',' ').replaceAll(/\r?\n/g,' | ');};return [fields.join(delimiter),...records.map(r=>fields.map(f=>cell(r[f])).join(delimiter))].join('\r\n');}
function doExport(kind){const records=decisionsForExport();if(!records.length)return report('Make at least one decision before exporting.',true);const manifest={format:'CTF_FORGE_REVIEW_V1',sourceArchive:data.sourceArchive,exportedAt:new Date().toISOString(),count:records.length,records};if(kind==='json')download('ctf-forge-review-decisions.json','application/json',JSON.stringify(manifest,null,2));if(kind==='csv')download('ctf-forge-review-decisions.csv','text/csv;charset=utf-8','\uFEFF'+table(records,','));if(kind==='txt')download('ctf-forge-review-decisions.txt','text/plain;charset=utf-8',records.map(r=>`${r.id} | ${r.currentName} → ${r.chosenName||'[pending]'} | ${r.effectClass} | ${r.effectDecision}\nSource: ${r.sourceSet} / ${r.mythSource||'none'}\nValidation: ${r.validation.join('; ')||'none'}\nNotes: ${r.note||'none'}\n`).join('\n'));if(kind==='tsv')navigator.clipboard.writeText(table(records,'\t')).then(()=>report(`${records.length} decisions copied as TSV.`)).catch(()=>report('Clipboard unavailable; use CSV download.',true));else report(`Exported ${records.length} drafts. ${records.filter(r=>r.validation.length).length} have validation notes.`);}
function importFile(file){file.text().then(text=>{const payload=JSON.parse(text);if(payload.format!=='CTF_FORGE_REVIEW_V1'||!Array.isArray(payload.records))throw Error('Not a CTF forge review manifest.');let count=0;for(const r of payload.records){const card=byId.get(r.id);if(!card)continue;const d=state[r.id]||{};if(card.set!=='ZF1'){const idx='ABCDE'.indexOf(r.nameChoice);if(idx>=0&&card.choices[idx]?.name===r.chosenName){d.nameChoice=idx;delete d.manualName;}else if(r.chosenName){d.manualName=r.chosenName;delete d.nameChoice;}}for(const key of ['alignment','race','skill','pressure','counterPressure','rank','fusionRules','effectText','lore','note'])if(r[key]!==undefined&&r[key]!=='')d[key]=r[key];if(r.effectClass)d.branch=r.effectClass;if(r.effectDecision)d.effectDecision=r.effectDecision;if(r.catalystResolution)d.resolution=r.catalystResolution;if(r.reviewStatus)d.reviewStatus=r.reviewStatus;state[r.id]=d;count++;}saveState();filterCards();report(`Imported ${count} decisions.`);}).catch(err=>report(`Import failed: ${err.message}`,true));}
function handleField(event){const card=byId.get(activeId),el=event.target,key=el.dataset.field;if(!card||!key)return;if(key==='nameChoice'){choiceName(card,Number(el.value));return;}if(key==='manualName'&&card.set==='ZF1')return;setValue(card,key,el.value);if(key==='alignment'){const races=data.allowedRaces[el.value]||[];if(!races.includes(value(card,'race')))state[card.id].race=races[0];state[card.id].skill=(data.skills[value(card,'race')]||'Normal').split('|')[0];saveState();renderEditor();}else if(key==='race'){state[card.id].skill=(data.skills[el.value]||'Normal').split('|')[0];saveState();renderEditor();}else if(key==='branch'){renderEditor();renderQueue();}else if(key==='manualName'&&event.type==='change'){renderQueue();renderEditor();}else if(event.type==='change')renderQueue();}
function wire(){for(const id of ['set-filter','source-filter','branch-filter','status-filter'])$(id).addEventListener('change',filterCards);$('search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(filterCards,170)});$('queue-list').addEventListener('click',e=>{const quick=e.target.closest('[data-quick]');if(quick){activeId=quick.dataset.quick;choiceName(byId.get(activeId),Number(quick.dataset.choice));return;}const open=e.target.closest('[data-open]');if(open)openCard(open.dataset.open);});$('queue-list').addEventListener('change',e=>{if(e.target.matches('[data-select]')){e.target.checked?selected.add(e.target.dataset.select):selected.delete(e.target.dataset.select);renderQueue();}});$('editor').addEventListener('click',e=>{const move=e.target.closest('[data-move]');if(move)moveCard(Number(move.dataset.move));const jump=e.target.closest('[data-jump]');if(jump)jumpCard(jump.dataset.jump);});$('editor').addEventListener('change',handleField);$('editor').addEventListener('input',e=>{if(e.target.matches('textarea,input[data-field]:not([type="radio"])'))handleField(e);});$('previous-page').addEventListener('click',()=>{page--;renderQueue();});$('next-page').addEventListener('click',()=>{page++;renderQueue();});$('select-page').addEventListener('change',e=>{for(const card of filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE))e.target.checked?selected.add(card.id):selected.delete(card.id);renderQueue();});$('select-filtered').addEventListener('click',()=>{for(const card of filtered)selected.add(card.id);renderQueue();report(`${filtered.length} matched cards selected.`);});$('clear-selection').addEventListener('click',()=>{selected.clear();renderQueue();});$('apply-batch-name').addEventListener('click',()=>batch('nameChoice',$('batch-name').value));$('apply-batch-effect').addEventListener('click',()=>batch('effectDecision',$('batch-effect').value));$('apply-paste').addEventListener('click',applyPaste);$('clear-paste').addEventListener('click',()=>{$('paste-decisions').value='';report('Paste area cleared.',false,'paste-report');});for(const kind of ['json','csv','txt'])$(`export-${kind}`).addEventListener('click',()=>doExport(kind));$('copy-tsv').addEventListener('click',()=>doExport('tsv'));$('import-json').addEventListener('change',e=>{if(e.target.files[0])importFile(e.target.files[0]);e.target.value='';});$('reset-decisions').addEventListener('click',()=>{if(!resetPending){resetPending=true;report('Click Reset local drafts again to clear saved decisions. Export first if needed.');setTimeout(()=>{resetPending=false},8000);return;}resetPending=false;state={};selected.clear();saveState();filterCards();report('Local draft decisions cleared.');});document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select,[contenteditable="true"],button,a'))return;if(e.key==='/'){e.preventDefault();$('search').focus();}else if(e.key==='ArrowDown'){e.preventDefault();moveCard(1);}else if(e.key==='ArrowUp'){e.preventDefault();moveCard(-1);}else if(/^[1-5]$/.test(e.key)){const card=byId.get(activeId);if(card&&card.set!=='ZF1'){e.preventDefault();choiceName(card,Number(e.key)-1);}}});window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY){readState();filterCards();report('Decisions refreshed from the other review tab.');}});}
try{const response=await fetch(DATA_URL);if(!response.ok)throw Error(`Data request returned ${response.status}`);data=await response.json();if(data.cards?.length!==1613)throw Error('Expected 1,613 archive cards.');byId=new Map(data.cards.map(c=>[c.id,c]));readState();populateFilters();wire();filterCards();updateStats();}catch(error){$('queue-list').innerHTML=`<p class="empty">Could not load the archive: ${esc(error.message)}. Serve this ALPHA folder over HTTP, such as GitHub Pages.</p>`;$('match-count').textContent='Data unavailable';$('editor').innerHTML='<p class="empty">Card data unavailable.</p>';}
