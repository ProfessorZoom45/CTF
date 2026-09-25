const TREE_URL = new URL('../../ALPHA/forge-review-data.json', import.meta.url);
const STORAGE_KEY = 'ctf:first-five-forge:v1';
const SLOTS = [
  {title:'Foundation Catalyst 1',kind:'low',rank:[1,4],maxPressure:1800,maxCounter:2000,intro:'Build the first card you could put on the field without a Tribute.',points:['Draw one card during Draw Phase.','A Rank 1–4 Catalyst can be Normal Spawned without a Tribute.','Pressure attacks; Counter Pressure protects a defending Catalyst.']},
  {title:'Foundation Catalyst 2',kind:'low',rank:[1,4],maxPressure:1800,maxCounter:2000,intro:'Give your opening plan a second low-Rank Catalyst.',points:['Choose Pressure or Counter Pressure position when you place a Catalyst.','When attacking a defending Catalyst, compare Pressure with Counter Pressure.','Your first three Catalysts share 4,500 Pressure and 4,500 Counter Pressure.']},
  {title:'High-Rank Catalyst',kind:'high',rank:[6,7],maxPressure:2500,maxCounter:2500,intro:'Create the stronger card your early Catalysts can help bring out.',points:['Rank 6 Normal Spawns require one Tribute.','Rank 7 Normal Spawns require two Tributes.','Plan the cost before spending your field presence.']},
  {title:'Great Fusion Catalyst',kind:'fusion',rank:[1,12],maxPressure:3200,maxCounter:3200,intro:'Combine exactly two of your first three Catalysts.',points:['The Fusion lives in the Fusion Deck.','Choose two distinct, exact material cards and write their requirements.','Its Pressure and Counter Pressure cannot exceed the chosen materials combined.']},
  {title:'Palm or Concealed Trick',kind:'trick',intro:'Finish with one effect that interacts with a Catalyst.',points:['Palm and Concealed Tricks have different timing and placement.','Name the Trick for what its effect actually does.','Save this fifth card, then review all five in Lesson 6.']}
];
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const blank = index => ({name:'',alignment:'Hero',race:'Android',skill:'Normal',effectClass:index===3?'Fusion':'Normal',rank:[1,1,6,8,0][index],pressure:0,counterPressure:0,lore:'',effectText:'',fusionRules:'',resolution:'',materialOne:'0',materialTwo:'1',trickType:'Concealed Trick'});
let tree, cards=SLOTS.map((_,i)=>blank(i)),step=0,complete=false,resetPending=false,savedLessons=SLOTS.map(()=>false);

function load() {
  try {
    const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    if([1,2].includes(stored.version)&&Array.isArray(stored.cards)&&stored.cards.length===5){
      cards=stored.cards.map((card,i)=>({...blank(i),...card}));
      savedLessons=stored.version===2&&Array.isArray(stored.savedLessons)&&stored.savedLessons.length===5
        ?stored.savedLessons.map(Boolean):SLOTS.map((_,i)=>validateCard(i).length===0);
      step=stored.version===1&&stored.complete===true?5:Math.max(0,Math.min(5,Number(stored.step)||0));
      complete=stored.version===2&&stored.complete===true&&savedLessons.every(Boolean)&&validateAll().length===0;
    }
  } catch { /* The empty draft remains usable. */ }
}
function save() {
  try {localStorage.setItem(STORAGE_KEY,JSON.stringify({version:2,cards,step,complete,savedLessons,savedAt:new Date().toISOString()}));$('save-status').textContent='Draft saved in this browser.';}
  catch {$('save-status').textContent='Browser storage unavailable. Download your draft JSON.';}
}
function choices(options,value){return options.map(x=>`<option value="${esc(x)}"${x===value?' selected':''}>${esc(x)}</option>`).join('');}
function field(label,key,value,extra='',className=''){return `<label class="${className}">${esc(label)}<input data-field="${key}" value="${esc(value)}" ${extra}></label>`;}
function select(label,key,options,value,className=''){return `<label class="${className}">${esc(label)}<select data-field="${key}">${choices(options,value)}</select></label>`;}
function area(label,key,value,help='',className='full'){return `<label class="${className}">${esc(label)}<textarea data-field="${key}" placeholder="${esc(help)}">${esc(value)}</textarea></label>`;}
function numberField(label,key,value,min,max){return `<label>${esc(label)}<input type="number" data-field="${key}" min="${min}" max="${max}" step="50" value="${esc(value)}"><small>Range ${min}–${max}</small></label>`;}
function validRaces(card){return tree.allowedRaces[card.alignment]||[];}
function validSkills(card){return card.race==='Aquatic'?(card.alignment==='Demi-God'?['Normal','Pelagic','Warrior','Ninja','Mage']:['Normal','Torrential','Tideshifter','Ninja','Mage']):(tree.skills[card.race]||'Normal').split('|');}

function renderForm(){
  if(step===5){renderReview();return;}
  const slot=SLOTS[step],card=cards[step],trick=slot.kind==='trick';
  $('step-count').textContent=`Lesson ${step+1} of 6`;
  $('step-title').textContent=slot.title;
  $('step-intro').textContent=slot.intro;
  $('class-badge').textContent=trick?'Trick · effect entry':slot.kind==='fusion'?'Fusion branch':'Normal or Effect branch';
  $('lesson-points').innerHTML=slot.points.map(point=>`<li>${esc(point)}</li>`).join('');
  let html=field('Card name','name',card.name,'maxlength="128" placeholder="Give this card an original name"',trick?'full':'');
  if(trick){
    html+=select('Trick type','trickType',['Concealed Trick','Palm Trick'],card.trickType);
    html+=area('Effect text · required','effectText',card.effectText,'Example: Target 1 Catalyst; it gains 300 Pressure.');
  } else {
    const races=validRaces(card),skills=validSkills(card);
    html+=select('1 · Alignment','alignment',tree.canonicalAlignments,card.alignment);
    html+=select('2 · Race','race',races,card.race);
    html+=select('3 · Skill','skill',skills,card.skill);
    html+=select('4 · Effect class','effectClass',slot.kind==='fusion'?['Fusion']:['Normal','Effect'],card.effectClass);
    if(slot.kind==='fusion'){
      const materialOptions=cards.slice(0,3).map((item,i)=>({value:String(i),label:`Catalyst ${i+1} · ${item.name||'unnamed'}`}));
      const materialSelect=(key,label)=>`<label>${label}<select data-field="${key}">${materialOptions.map(option=>`<option value="${option.value}"${option.value===card[key]?' selected':''}>${esc(option.label)}</option>`).join('')}</select></label>`;
      html+=materialSelect('materialOne','Fusion material 1')+materialSelect('materialTwo','Fusion material 2');
      html+=area('Fusion rules / requirements · required','fusionRules',card.fusionRules,'Name both exact materials and the Fusion requirement.');
    }
    if(card.effectClass==='Normal') html+=area('Lore · required','lore',card.lore,'Tell this Catalyst’s story without a gameplay effect.');
    else {html+=area('Effect text · required','effectText',card.effectText,'Describe timing, target, cost, and result.');html+=area('Lore · optional','lore',card.lore,'Optional story text.');}
    html+=numberField('5 · Pressure','pressure',card.pressure,0,slot.maxPressure);
    html+=numberField('6 · Counter Pressure','counterPressure',card.counterPressure,0,slot.maxCounter);
    html+=`<label>7 · Rank<select data-field="rank">${Array.from({length:slot.rank[1]-slot.rank[0]+1},(_,i)=>slot.rank[0]+i).map(n=>`<option value="${n}"${Number(card.rank)===n?' selected':''}>Rank ${n}</option>`).join('')}</select></label>`;
    html+=area('8 · Catalyst resolution · required','resolution',card.resolution,'Describe timing, targets, materials, and the resulting state.');
  }
  $('form-fields').classList.remove('review-grid');
  $('form-fields').innerHTML=html;
  $('form-error').textContent='';
  $('back-step').disabled=step===0;
  $('next-step').textContent=step===4?'Save fifth card & review →':'Save card & continue →';
  $('next-step').disabled=false;
  $('complete-panel').hidden=true;
  renderRail();renderPool();
}
function renderReview(){
  $('step-count').textContent='Lesson 6 of 6';
  $('step-title').textContent='Review & finalize all five';
  $('step-intro').textContent='Check the five cards you saved in Lessons 1–5. Edit any card before finalizing the package.';
  $('class-badge').textContent='Five-card package';
  $('lesson-points').innerHTML=['Confirm each card name and its game role.','Check the Catalyst stats, Fusion materials, and Trick effect together.','Finalize the private draft package before opening the guided battle.'].map(point=>`<li>${esc(point)}</li>`).join('');
  $('form-fields').classList.add('review-grid');
  $('form-fields').innerHTML=cards.map((card,i)=>{
    const slot=SLOTS[i],saved=savedLessons[i]&&validateCard(i).length===0;
    const details=slot.kind==='trick'?`${card.trickType} · ${card.effectText||'Effect missing'}`:`${card.alignment} / ${card.race} / ${card.skill} · ${card.effectClass} · Rank ${card.rank} · ${Number(card.pressure).toLocaleString()} PR / ${Number(card.counterPressure).toLocaleString()} CP`;
    const fusion=slot.kind==='fusion'?`<p>Materials: ${esc(cards[Number(card.materialOne)]?.name||'Missing')} + ${esc(cards[Number(card.materialTwo)]?.name||'Missing')}</p>`:'';
    const text=slot.kind==='trick'?'':`<p>${card.effectClass==='Normal'?'Lore':'Effect'}: ${esc(card.effectClass==='Normal'?card.lore:card.effectText)}</p><p>Catalyst resolution: ${esc(card.resolution)}</p>`;
    const rules=slot.kind==='fusion'?`<p>Fusion rules: ${esc(card.fusionRules)}</p>`:'';
    return `<article class="review-card"><div><span class="review-state ${saved?'ready':'needs-work'}">${saved?'Saved':'Needs saving'}</span><h3>${i+1}. ${esc(card.name||slot.title)}</h3><p>${esc(details)}</p>${fusion}${rules}${text}</div><button type="button" data-edit-card="${i}">Edit card ${i+1}</button></article>`;
  }).join('');
  $('form-error').textContent='';
  $('back-step').disabled=false;
  $('next-step').textContent=complete?'Five drafts finalized':'Finalize all five drafts';
  $('next-step').disabled=complete;
  $('complete-panel').hidden=!complete;
  renderRail();renderPool();
}
function renderRail(){
  $('step-rail').innerHTML=[...SLOTS,{title:'Review & finalize'}].map((slot,i)=>{
    const done=i===5?complete:savedLessons[i]&&validateCard(i).length===0;
    const locked=i===5?!savedLessons.every(Boolean):i>0&&!savedLessons.slice(0,i).every(Boolean);
    return `<li><button class="step-button${i===step?' active':''}${done?' done':''}" type="button" data-step="${i}" aria-current="${i===step?'step':'false'}" ${locked?'disabled':''}><span>${i+1}</span>${esc(slot.title)}</button></li>`;
  }).join('');
}
function renderPool(){
  const used=cards.slice(0,3).reduce((totals,c)=>({pressure:totals.pressure+(Number(c.pressure)||0),counter:totals.counter+(Number(c.counterPressure)||0)}),{pressure:0,counter:0});
  $('pool-pressure').textContent=`Pressure ${used.pressure.toLocaleString()} / 4,500`;
  $('pool-counter').textContent=`Counter Pressure ${used.counter.toLocaleString()} / 4,500`;
  $('pressure-meter').style.width=`${Math.min(100,used.pressure/4500*100)}%`;
  $('counter-meter').style.width=`${Math.min(100,used.counter/4500*100)}%`;
  $('pressure-meter').parentElement.classList.toggle('over',used.pressure>4500);
  $('counter-meter').parentElement.classList.toggle('over',used.counter>4500);
}
function validateCard(index){
  if(!tree)return ['Forge tree still loading'];
  const slot=SLOTS[index],card=cards[index],issues=[];
  if(!card.name.trim())issues.push('Enter a card name');
  if(card.name.length>128)issues.push('Keep the name under 129 characters');
  if(cards.some((other,i)=>i!==index&&other.name.trim()&&other.name.trim().toLowerCase()===card.name.trim().toLowerCase()))issues.push('Use a distinct name for each card');
  if(slot.kind==='trick'){
    if(!card.effectText.trim())issues.push('Write the Trick effect');
    if(!/target\s+(?:exactly\s+)?1\s+catalyst/i.test(card.effectText))issues.push('State “Target 1 Catalyst” in the effect');
    const boost=card.effectText.match(/(?:gain|increase)[^0-9]{0,30}(\d{2,4})/i);
    if(boost&&Number(boost[1])>300)issues.push('Trick stat boosts cannot exceed +300');
    return issues;
  }
  if(!tree.canonicalAlignments.includes(card.alignment))issues.push('Choose a canonical alignment');
  if(!validRaces(card).includes(card.race))issues.push('Choose a race allowed by the alignment');
  if(!validSkills(card).includes(card.skill))issues.push('Choose a skill allowed by the race');
  if(slot.kind==='fusion'&&card.effectClass!=='Fusion')issues.push('The Great Fusion must use Fusion class');
  if(slot.kind!=='fusion'&&!['Normal','Effect'].includes(card.effectClass))issues.push('Choose Normal or Effect class');
  if(!Number.isInteger(Number(card.rank))||Number(card.rank)<slot.rank[0]||Number(card.rank)>slot.rank[1])issues.push(`Rank must be ${slot.rank[0]}–${slot.rank[1]}`);
  for(const [field,limit,label] of [['pressure',slot.maxPressure,'Pressure'],['counterPressure',slot.maxCounter,'Counter Pressure']]) if(card[field]===''||!Number.isFinite(Number(card[field]))||Number(card[field])<0||Number(card[field])>limit)issues.push(`${label} must be 0–${limit}`);
  if(slot.kind!=='fusion'){
    const totalPressure=cards.slice(0,3).reduce((sum,c)=>sum+(Number(c.pressure)||0),0);
    const totalCounter=cards.slice(0,3).reduce((sum,c)=>sum+(Number(c.counterPressure)||0),0);
    if(totalPressure>4500)issues.push('The three Catalysts exceed the 4,500 Pressure pool');
    if(totalCounter>4500)issues.push('The three Catalysts exceed the 4,500 Counter Pressure pool');
  }
  if(card.effectClass==='Normal'&&!card.lore.trim())issues.push('Normal cards require lore');
  if(card.effectClass!=='Normal'&&!card.effectText.trim())issues.push('Effect and Fusion cards require effect text');
  if(slot.kind==='fusion'){
    if(!card.name.toLowerCase().includes('great'))issues.push('Include “Great” in the Fusion name');
    if(card.materialOne===card.materialTwo)issues.push('Choose two different materials');
    if(!card.fusionRules.trim())issues.push('Write the Fusion requirements');
    if(Number(card.pressure)+Number(card.counterPressure)>4000)issues.push('Fusion Pressure + Counter Pressure cannot exceed 4,000');
    const one=cards[Number(card.materialOne)],two=cards[Number(card.materialTwo)];
    if(!one||!two||Number(card.materialOne)>2||Number(card.materialTwo)>2)issues.push('Choose two submitted Catalyst materials');
    else if(one!==two){if(Number(card.pressure)>Number(one.pressure)+Number(two.pressure))issues.push('Fusion Pressure exceeds its materials');if(Number(card.counterPressure)>Number(one.counterPressure)+Number(two.counterPressure))issues.push('Fusion Counter Pressure exceeds its materials');}
  }
  if(!card.resolution.trim())issues.push('Write the Catalyst resolution');
  return issues;
}
function validateAll(){return SLOTS.flatMap((slot,i)=>validateCard(i).map(issue=>`${slot.title}: ${issue}`));}
function onField(event){
  const key=event.target.dataset.field;if(!key)return;
  cards[step][key]=event.target.value;complete=false;savedLessons[step]=false;
  if(key==='alignment'){cards[step].race=validRaces(cards[step])[0]||'';cards[step].skill=validSkills(cards[step])[0]||'';renderForm();}
  else if(key==='race'){cards[step].skill=validSkills(cards[step])[0]||'';renderForm();}
  else if(key==='effectClass'){renderForm();}
  else {renderRail();renderPool();$('complete-panel').hidden=true;}
  save();
}
function download(){const output={format:'CTF_FIRST_FIVE_FORGE_V2',forgeTreeVersion:'canonical-2026-09-24',exportedAt:new Date().toISOString(),status:complete?'private-finalized-draft':'private-draft',savedLessons,cards,validation:validateAll()};const blob=new Blob([JSON.stringify(output,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='ctf-first-five-forge-draft.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('save-status').textContent='Draft JSON downloaded.';}
function wire(){
  $('form-fields').addEventListener('input',onField);
  $('form-fields').addEventListener('change',onField);
  $('form-fields').addEventListener('click',event=>{const button=event.target.closest('[data-edit-card]');if(!button)return;step=Number(button.dataset.editCard);renderForm();save();});
  $('step-rail').addEventListener('click',event=>{const button=event.target.closest('[data-step]');if(!button||button.disabled)return;step=Number(button.dataset.step);renderForm();save();});
  $('back-step').addEventListener('click',()=>{if(step>0){step--;renderForm();save();}});
  $('next-step').addEventListener('click',()=>{if(step<5){const issues=validateCard(step);if(issues.length){$('form-error').textContent=issues.slice(0,4).join(' · ')+(issues.length>4?` · ${issues.length-4} more issues`:'');return;}savedLessons[step]=true;step++;save();renderForm();return;}const all=validateAll();if(!savedLessons.every(Boolean))all.unshift('Save each card in Lessons 1–5 before finalizing');if(all.length){$('form-error').textContent=all.slice(0,4).join(' · ')+(all.length>4?` · ${all.length-4} more issues`:'');return;}complete=true;save();renderForm();$('complete-panel').scrollIntoView({behavior:'smooth',block:'nearest'});});
  $('download-draft').addEventListener('click',download);
  $('reset-draft').addEventListener('click',()=>{if(!resetPending){resetPending=true;$('save-status').textContent='Click Start a new draft again to clear the saved five cards.';setTimeout(()=>resetPending=false,8000);return;}resetPending=false;cards=SLOTS.map((_,i)=>blank(i));savedLessons=SLOTS.map(()=>false);step=0;complete=false;save();renderForm();});
}
try{
  const response=await fetch(TREE_URL);if(!response.ok)throw Error(`Forge tree request returned ${response.status}`);
  const snapshot=await response.json();if(snapshot.cards?.length!==1613||snapshot.canonicalAlignments?.length!==8)throw Error('Canonical forge snapshot is incomplete');
  tree=snapshot;load();wire();renderForm();save();
}catch(error){$('form-fields').innerHTML=`<p class="form-error">Could not load the canonical forge tree: ${esc(error.message)}. Open this page through the website or an HTTP preview.</p>`;$('save-status').textContent='Forge tree unavailable.';}
