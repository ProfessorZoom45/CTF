import { DRAFT_KEY, validateDraft, buildSubmission } from './forge-submission.mjs';
const $=id=>document.getElementById(id);
let local=['127.0.0.1','localhost'].includes(location.hostname),hosted=false;
const cfg=window.CTF_SUBMISSION_DELIVERY || {};
let endpoint=local ? '/api/card-submissions' : cfg.endpoint;
let draft, tree, token='',busy=false,verificationWidgetId;
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
function resetVerification(){
  token='';
  if(verificationWidgetId!==undefined)window.turnstile.reset(verificationWidgetId);
}
function refresh(){
  const ready=tree && validateDraft(draft,tree).length===0;
  $('download-package').disabled=!ready;
  $('send-package').disabled=!ready||busy||!$('submit-forge-form').checkValidity()||(!local&&!token);
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
  if(!local&&!token){$('submission-status').textContent='Complete the verification before sending.';return;}
  busy=true;refresh();$('submission-status').textContent=local?'Saving your package to the review inbox…':'Sending your package for review…';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  let remoteAttempted=false;
  try{
    const submissionId=await assignSubmissionId(values,built.submission);
    if(!local&&!token)throw Error('Verification expired. Complete it before retrying.');
    const body=local?{submission_id:submissionId,...values}:{submission_id:submissionId,file_name:'CTF_Forge_'+submissionId+'.json',turnstile_token:token,json:JSON.stringify(built.submission),images:[]};
    remoteAttempted=!local;
    if(remoteAttempted)token='';
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    let result;try{result=await response.json();}catch{throw Error('The submission service returned an invalid response.');}
    if(!response.ok||!result.ok)throw Error(result.errors?.join(' ')||result.error||'Submission was not accepted.');
    if(local&&(result.submission_id!==submissionId||result.delivery!==(hosted?'hosted_inbox':'local_inbox')))throw Error('The review inbox did not confirm this package.');
    if(!local&&(!result.owner_email_sent||!result.submitter_email_sent))throw Error('The mail service did not accept both emails for delivery.');
    $('submission-receipt').hidden=false;$('receipt-id').textContent=submissionId;
    $('receipt-copy').textContent=hosted?'Your five cards are queued in the online review inbox. Keep this receipt and download a JSON backup.':local?'Your five cards were saved to this computer’s review inbox. No email was sent.':'The mail service accepted the reviewer and confirmation emails for delivery.';
    $('submission-status').textContent='Submitted for manual review.';
    try{localStorage.setItem('ctf:last-forge-submission',JSON.stringify({submission_id:submissionId,delivery:hosted?'hosted_inbox':local?'local_inbox':'email',receivedAt:result.receivedAt||new Date().toISOString()}));}catch{}
    $('send-package').textContent='Submitted for review';
    $('submission-receipt').scrollIntoView({block:'nearest',behavior:'smooth'});
  }catch(error){
    busy=false;
    $('submission-status').textContent=(error.name==='AbortError'?'The request timed out.':error.message)+' Your draft is still saved. Download the JSON backup or retry.';
    if(remoteAttempted)resetVerification();
    refresh();
  }
  finally{clearTimeout(timer);}
}
$('delivery-mode').textContent=local?'Local browser edition: Submit saves your package to the review inbox on this computer.':'Website edition: Submit sends your package to the configured CTF reviewer email service.';
$('submit-forge-form').addEventListener('input',()=>{if(!$('submission-receipt').hidden){$('submission-receipt').hidden=true;$('send-package').textContent='Submit five cards for review';busy=false;if(!local)resetVerification();}refresh();});
$('submit-forge-form').addEventListener('submit',submit);$('download-package').addEventListener('click',download);
try{
  try{const config=await fetch('/api/site-config',{signal:AbortSignal.timeout(5000)});if(config.ok){const delivery=(await config.json()).submissionDelivery;hosted=delivery==='hosted_inbox';local=hosted||delivery==='local_inbox';if(local)endpoint='/api/card-submissions';}}catch{}
  $('delivery-mode').textContent=hosted?'Online edition: Submit saves all five cards to the online review inbox for manual review.':local?'Local browser edition: Submit saves your package to the review inbox on this computer.':'Website edition: Submit sends your package to the configured CTF reviewer email service.';
  draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
  const response=await fetch('ALPHA/forge-review-data.json');if(!response.ok)throw Error('The Forge rules could not load.');tree=await response.json();render();
  if(!local){
    if(!/^https:\/\//.test(endpoint||'')||!cfg.turnstileSiteKey)throw Error('Email submission is not configured for this host. Your package can still be downloaded.');
    const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
    script.onload=()=>{verificationWidgetId=window.turnstile.render($('submission-verification'),{sitekey:cfg.turnstileSiteKey,action:'card_submission',theme:'dark',callback:value=>{token=value;refresh();},'expired-callback':()=>{token='';refresh();},'error-callback':()=>{token='';$('submission-status').textContent='Verification unavailable. Your package can still be downloaded.';refresh();}});};
    script.onerror=()=>{$('submission-status').textContent='Verification could not load. Download the JSON backup and try again later.';};document.head.append(script);
  }
}catch(error){$('package-error').hidden=false;$('package-error').textContent=error.message;}
