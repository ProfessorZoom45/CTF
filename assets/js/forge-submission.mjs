export const DRAFT_KEY = 'ctf:first-five-forge:v1';
export function validateTriggerTiming(card,isTrick=false){
  const timing=card?.timingWindow;
  if(timing!==undefined&&(typeof timing!=='string'||timing.length>500))return ['Keep the timing window to 500 characters.'];
  const triggered=(isTrick||card?.effectClass!=='Normal')&&/(?:^|[.!?;]\s*|\n)\s*(?:when(?:ever)?|after|at the (?:start|end))\b/i.test(card?.effectText||'');
  if((triggered||String(timing||'').trim())&&!/^After\s+.+\s+resolves,\s+before\s+.+\s+begins\.?$/i.test(String(timing||'').trim()))return ['Define the trigger timing as “After [event] resolves, before [next step] begins.”'];
  return [];
}
export function validateDraft(draft, tree) {
  const errors = [];
  if (!draft || draft.version !== 2 || !draft.complete || !Array.isArray(draft.cards) || draft.cards.length !== 5 || !Array.isArray(draft.savedLessons) || draft.savedLessons.length !== 5 || !draft.savedLessons.every(value=>value===true)) return ['Finalize all five cards in Lesson 6 before submitting.'];
  const names = new Set();
  draft.cards.forEach((card,i)=>{
    const label = `Card ${i+1}`;
    if (!card || typeof card !== 'object') { errors.push(`${label} is missing.`); return; }
    const name = String(card.name || '').trim();
    errors.push(...validateTriggerTiming(card,i===4).map(error=>`${label}: ${error}`));
    if (typeof card.name!=='string' || !name || name.length>128 || names.has(name.toLowerCase())) errors.push(`${label} needs a distinct name of 1–128 characters.`);
    names.add(name.toLowerCase());
    for (const key of ['lore','effectText','resolution','fusionRules']) if (typeof card[key] !== 'string' || card[key].length>8000) errors.push(`${label}: invalid ${key}.`);
    if (i===4) {
      if (!['Palm Trick','Concealed Trick'].includes(card.trickType)) errors.push('Choose Palm or Concealed Trick.');
      if (!/target\s+(?:exactly\s+)?1\s+catalyst/i.test(card.effectText || '')) errors.push('The Trick must target 1 Catalyst.');
      const boost=String(card.effectText || '').match(/(?:gain|increase)[^0-9]{0,30}(\d{2,4})/i);
      if (boost && Number(boost[1])>300) errors.push('The Trick boost cannot exceed +300.');
      return;
    }
    const ranks = i<2 ? [1,4] : i===2 ? [6,7] : [1,12];
    const rank = Number(card.rank);
    if (!Number.isInteger(rank) || rank<ranks[0] || rank>ranks[1]) errors.push(`${label}: invalid Rank.`);
    const limits = i<2 ? [1800,2000] : i===2 ? [2500,2500] : [3200,3200];
    ['pressure','counterPressure'].forEach((key,index)=>{
      if (card[key]==='' || !Number.isFinite(Number(card[key])) || Number(card[key])<0 || Number(card[key])>limits[index]) errors.push(`${label}: invalid ${key}.`);
    });
    if (!tree.canonicalAlignments.includes(card.alignment) || !(tree.allowedRaces[card.alignment] || []).includes(card.race)) errors.push(`${label}: invalid Alignment/Race.`);
    const skills = card.race==='Aquatic' ? (card.alignment==='Demi-God' ? ['Normal','Pelagic','Warrior','Ninja','Mage'] : ['Normal','Torrential','Tideshifter','Ninja','Mage']) : String(tree.skills[card.race] || 'Normal').split('|');
    if (!skills.includes(card.skill)) errors.push(`${label}: invalid Skill.`);
    if (!(i===3 ? card.effectClass==='Fusion' : ['Normal','Effect'].includes(card.effectClass))) errors.push(`${label}: invalid effect class.`);
    if (!String(card.resolution || '').trim()) errors.push(`${label}: write its resolution.`);
    if (card.effectClass==='Normal' ? !String(card.lore || '').trim() : !String(card.effectText || '').trim()) errors.push(`${label}: write its lore/effect text.`);
    if (i===3) {
      const a=Number(card.materialOne),b=Number(card.materialTwo);
      if (!/great/i.test(name) || !String(card.fusionRules || '').trim()) errors.push('Fusion needs Great in its name and printed material requirements.');
      if (![a,b].every(value=>Number.isInteger(value)&&value>=0&&value<3) || a===b) errors.push('Choose two distinct submitted Catalyst materials.');
      else {
        for (const key of ['pressure','counterPressure']) if (Number(card[key])>Number(draft.cards[a]?.[key])+Number(draft.cards[b]?.[key])) errors.push(`Fusion ${key} exceeds its materials.`);
      }
      if (Number(card.pressure)+Number(card.counterPressure)>4000) errors.push('Fusion combined stats exceed 4,000.');
    }
  });
  for (const key of ['pressure','counterPressure']) if (draft.cards.slice(0,3).reduce((sum,card)=>sum+Number(card?.[key] || 0),0)>4500) errors.push(`Shared ${key} pool exceeds 4,500.`);
  return errors;
}

export function buildSubmission(input, tree) {
  const errors = validateDraft(input?.draft,tree);
  const name=String(input?.submitter?.name || '').trim(), email=String(input?.submitter?.email || '').trim();
  if (!name || name.length>128) errors.push('Enter your name or gamertag.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) errors.push('Enter a valid email address.');
  if (input?.agreement !== true) errors.push('Accept the submission agreement.');
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(input?.submission_id || '')) errors.push('Invalid submission ID.');
  if (errors.length) return {ok:false,errors};
  const draft=input.draft;
  const cards=draft.cards.map((card,i)=> {
    const result={slot:i<3?`Catalyst ${i+1}`:i===3?'Fusion (Great)':'Trick Card',name:card.name.trim(),type:i===4?card.trickType:i===3?'Great Effect Fusion Catalyst':`${card.effectClass} Catalyst`,effectClass:i===4?'Trick':card.effectClass,text:i===4?card.effectText:card.effectClass==='Normal'?card.lore:card.effectText,timingWindow:String(card.timingWindow||'').trim()};
    if(i<4)Object.assign(result,{rank:Number(card.rank),alignment:card.alignment,race:card.race,skill:card.skill,kinds:`${card.race}, ${card.skill}`,pressure:Number(card.pressure),counterPressure:Number(card.counterPressure),lore:card.lore,effectText:card.effectText,resolution:card.resolution});
    if(i===3)Object.assign(result,{great:true,materials:[draft.cards[Number(card.materialOne)].name,draft.cards[Number(card.materialTwo)].name],fusionRules:card.fusionRules});
    return result;
  });
  return {ok:true,submission:{format:'CTF_FORGE_SUBMISSION_V1',submission_id:input.submission_id,submitter:{name,email},timestamp:new Date().toISOString(),status:'pending_review',agreementAccepted:true,cards,poolUsed:{pressure:cards.slice(0,3).reduce((sum,c)=>sum+c.pressure,0),counterPressure:cards.slice(0,3).reduce((sum,c)=>sum+c.counterPressure,0)},images:{},totalImages:0}};
}
