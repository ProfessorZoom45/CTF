import { DRAFT_KEY, validateDraft, buildSubmission } from './forge-submission.mjs';
const $=id=>document.getElementById(id);
let local=false, endpoint=window.CTF_SUBMISSION_DELIVERY?.endpoint;
let draft, tree, busy=false;
const submissionIds=new Map();
const text=(parent,tag,value,cls='')=>{const element=document.createElement(tag);element.textContent=value;if(cls)element.className=cls;parent.append(element);return element;};
function input(){
  const packageDraft=draft&&{version:draft.version,complete:draft.complete,savedLessons:draft.savedLessons,cards:draft.cards};
  const submitter={name:$('creator-name').value.trim(),email:$('creator-email').value.trim()};
  return {draft:packageDraft,submitter,agreement:$('creator-agreement').checked};
}
async function assignSubmissionId(values,submission){
  const bytes=new TextEncoder().encode(JSON.stringify(values));
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  const fingerprint=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
  const storageKey='ctf:forge-submission-id:'+fingerprint;
  let id=submissionIds.get(fingerprint)||submission.submission_id;
  try{
    const saved=localStorage.getItem(storageKey);
    if(/^[a-zA-Z0-9-]{16,80}$/.test(saved||''))id=saved;
    else localStorage.setItem(storageKey,id);
  }catch{}
  submissionIds.set(fingerprint,id);
  submission.submission_id=id;
  return id;
}
async function solveChallenge(submissionId, signal) {
  const url = new URL(endpoint, location.href);
  url.searchParams.set('id', submissionId);
  const response = await fetch(url, { signal });
  if (!response.ok) throw Error('The review inbox could not start verification.');
  const { expires, signature } = await response.json();
  if (!Number.isSafeInteger(expires) || !/^[a-f0-9]{64}$/.test(signature || '')) throw Error('The inbox sent an invalid verification challenge.');
  const encoder = new TextEncoder();
  for (let start = 0; start < 262144; start += 64) {
    if (signal.aborted || expires <= Date.now()) throw Error('Verification expired. Please retry.');
    const valid = await Promise.all(Array.from({ length: 64 }, async (_, index) => {
      const nonce = start + index;
      const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(signature + ':' + nonce)));
      return hash[0] === 0 && hash[1] < 16 ? nonce : -1;
    }));
    const nonce = valid.find(value => value >= 0);
    if (nonce !== undefined) return { expires, signature, nonce };
  }
  throw Error('Verification could not be completed. Please retry.');
}
function refresh(){
  const ready=tree && validateDraft(draft,tree).length===0;
  $('download-package').disabled=!ready;
  $('send-package').disabled=!ready||!endpoint||busy||!$('submit-forge-form').checkValidity();
}
async function download(){
  const values=input(),draftId=crypto.randomUUID();
  const built=buildSubmission({...values,submission_id:draftId},tree);
  const submissionId=built.ok?await assignSubmissionId(values,built.submission):draftId;
  const payload=built.ok?built.submission:{format:'CTF_FIRST_FIVE_FORGE_V2',...draft};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='CTF_Forge_'+submissionId+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function render(){
  const issues=validateDraft(draft,tree);
  if(issues.length){$('package-error').hidden=false;$('package-error').textContent=issues.join(' ');refresh();return;}
  draft.cards.forEach((card,i)=>{
    const article=document.createElement('article');article.className='card';
    text(article,'small',`${i+1} / 5 · ${i===4?card.trickType:i===3?'Great Fusion Catalyst':card.effectClass+' Catalyst'}`);
    text(article,'h3',card.name);
    if(i<4){text(article,'p',`Rank ${card.rank} · ${card.alignment} / ${card.race} / ${card.skill}`);text(article,'p',`${Number(card.pressure).toLocaleString()} Pressure / ${Number(card.counterPressure).toLocaleString()} Counter Pressure`,'stats');}
    text(article,'p',i===4||card.effectClass!=='Normal'?card.effectText:card.lore);
    if(card.timingWindow)text(article,'p','Timing: '+card.timingWindow);
    if(i<4)text(article,'p','Resolution: '+card.resolution);
    if(i===3)text(article,'p','Materials: '+draft.cards[Number(card.materialOne)].name+' + '+draft.cards[Number(card.materialTwo)].name+'\n'+card.fusionRules);
    $('package-preview').append(article);
  });refresh();
}
async function submit(event){
  event.preventDefault();if(busy)return;
  const values=input();
  const built=buildSubmission({...values,submission_id:crypto.randomUUID()},tree);
  if(!built.ok){$('submission-status').textContent=built.errors.join(' ');return;}
  if(!endpoint)return;
  busy=true;refresh();$('submission-status').textContent=local?'Saving your package to the review inbox…':'Verifying your package…';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  try{
    const submissionId=await assignSubmissionId(values,built.submission);
    const body={submission_id:submissionId,...values};
    if(!local)body.proof=await solveChallenge(submissionId,controller.signal);
    $('submission-status').textContent='Saving your package to the review inbox…';
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    let result;try{result=await response.json();}catch{throw Error('The submission service returned an invalid response.');}
    if(!response.ok||!result.ok)throw Error(result.errors?.join(' ')||result.error||'Submission was not accepted.');
    if(result.submission_id!==submissionId||result.delivery!==(local?'local_inbox':'hosted_inbox'))throw Error('The review inbox did not confirm this package.');
    $('submission-receipt').hidden=false;$('receipt-id').textContent=submissionId;
    $('receipt-copy').textContent=local?'Your five cards were saved to this computer’s review inbox.':'Your five cards are queued in the review inbox. Keep your reference and download a JSON backup.';
    $('submission-status').textContent='Submitted for manual review.';
    try{localStorage.setItem('ctf:last-forge-submission',JSON.stringify({submission_id:submissionId,delivery:result.delivery,receivedAt:result.receivedAt||new Date().toISOString()}));}catch{}
    $('send-package').textContent='Submitted for review';
    $('submission-receipt').scrollIntoView({block:'nearest',behavior:'smooth'});
  }catch(error){
    busy=false;
    $('submission-status').textContent=(error.name==='AbortError'?'The request timed out.':error.message)+' Your draft is still saved. Download the JSON backup or retry.';
    refresh();
  }
  finally{clearTimeout(timer);}
}
$('submit-forge-form').addEventListener('input',()=>{if(!$('submission-receipt').hidden){$('submission-receipt').hidden=true;$('send-package').textContent='Submit five cards for review';busy=false;}refresh();});
$('submit-forge-form').addEventListener('submit',submit);$('download-package').addEventListener('click',download);
try{
  try{const config=await fetch('/api/site-config',{signal:AbortSignal.timeout(5000)});if(config.ok){const delivery=(await config.json()).submissionDelivery;local=delivery==='local_inbox';if(local||delivery==='hosted_inbox')endpoint='/api/card-submissions';}}catch{}
  $('delivery-mode').textContent=local?'Submit saves your package to the review inbox on this computer.':'Submit saves all five cards in the private CTF review inbox.';
  draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
  const response=await fetch('ALPHA/forge-review-data.json');if(!response.ok)throw Error('The Forge rules could not load.');tree=await response.json();render();
  if(!endpoint)throw Error('Submission is unavailable. Your draft can still be downloaded.');
}catch(error){$('package-error').hidden=false;$('package-error').textContent=error.message;}
