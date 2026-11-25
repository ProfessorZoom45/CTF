import { DRAFT_KEY, validateDraft, buildSubmission } from './forge-submission.mjs';
const $=id=>document.getElementById(id);
let local=['127.0.0.1','localhost'].includes(location.hostname),hosted=false;
const cfg=window.CTF_SUBMISSION_DELIVERY || {};
let endpoint=local ? '/api/card-submissions' : cfg.endpoint;
let draft, tree, token='',busy=false,submissionId=crypto.randomUUID();
const text=(parent,tag,value,cls='')=>{const element=document.createElement(tag);element.textContent=value;if(cls)element.className=cls;parent.append(element);return element;};
function input(){return {submission_id:submissionId,draft,submitter:{name:$('creator-name').value,email:$('creator-email').value},agreement:$('creator-agreement').checked};}
function refresh(){
  const ready=tree && validateDraft(draft,tree).length===0;
  $('download-package').disabled=!ready;
  $('send-package').disabled=!ready||busy||!$('submit-forge-form').checkValidity()||(!local&&!token);
}
function download(){
  const built=buildSubmission(input(),tree);
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
  const built=buildSubmission(input(),tree);
  if(!built.ok){$('submission-status').textContent=built.errors.join(' ');return;}
  if(!local&&!token){$('submission-status').textContent='Complete the verification before sending.';return;}
  busy=true;refresh();$('submission-status').textContent=local?'Saving your package to the local review inbox…':'Sending your package for review…';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  try{
    const body=local?input():{submission_id:submissionId,file_name:'CTF_Forge_'+submissionId+'.json',turnstile_token:token,json:JSON.stringify(built.submission),images:[]};
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    let result;try{result=await response.json();}catch{throw Error('The submission service returned an invalid response.');}
    if(!response.ok||!result.ok)throw Error(result.errors?.join(' ')||result.error||'Submission was not accepted.');
    if(local&&result.delivery!==(hosted?'hosted_inbox':'local_inbox'))throw Error('The review inbox did not confirm receipt.');
    if(!local&&(!result.owner_email_sent||!result.submitter_email_sent))throw Error('The reviewer and confirmation emails were not both confirmed.');
    $('submission-receipt').hidden=false;$('receipt-id').textContent=submissionId;
    $('receipt-copy').textContent=hosted?'Your five cards were saved to the online review inbox. Keep this receipt and download a JSON backup.':local?'Your five cards were saved to this computer’s review inbox. No email was sent.':'Your five cards were emailed to the reviewer, and a confirmation email was sent to you.';
    $('submission-status').textContent='Submitted for manual review.';
    try{localStorage.setItem('ctf:last-forge-submission',JSON.stringify({submission_id:submissionId,delivery:hosted?'hosted_inbox':local?'local_inbox':'email',receivedAt:result.receivedAt||new Date().toISOString()}));}catch{}
    $('send-package').textContent='Submitted for review';
    $('submission-receipt').scrollIntoView({block:'nearest',behavior:'smooth'});
  }catch(error){busy=false;$('submission-status').textContent=(error.name==='AbortError'?'The request timed out.':error.message)+' Your draft is still saved. Download the JSON backup or retry.';refresh();}
  finally{clearTimeout(timer);}
}
$('delivery-mode').textContent=local?'Local browser edition: Submit saves your package to the review inbox on this computer.':'Website edition: Submit sends your package to the configured CTF reviewer email service.';
$('submit-forge-form').addEventListener('input',()=>{if(!$('submission-receipt').hidden){submissionId=crypto.randomUUID();$('submission-receipt').hidden=true;$('send-package').textContent='Submit five cards for review';busy=false;}refresh();});
$('submit-forge-form').addEventListener('submit',submit);$('download-package').addEventListener('click',download);
try{
  try{const config=await fetch('/api/site-config',{signal:AbortSignal.timeout(5000)});if(config.ok){const delivery=(await config.json()).submissionDelivery;hosted=delivery==='hosted_inbox';local=hosted||delivery==='local_inbox';if(local)endpoint='/api/card-submissions';}}catch{}
  $('delivery-mode').textContent=hosted?'Online edition: Submit saves all five cards to the online review inbox for manual review.':local?'Local browser edition: Submit saves your package to the review inbox on this computer.':'Website edition: Submit sends your package to the configured CTF reviewer email service.';
  draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
  const response=await fetch('ALPHA/forge-review-data.json');if(!response.ok)throw Error('The Forge rules could not load.');tree=await response.json();render();
  if(!local){
    if(!/^https:\/\//.test(endpoint||'')||!cfg.turnstileSiteKey)throw Error('Email submission is not configured for this host. Your package can still be downloaded.');
    const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
    script.onload=()=>window.turnstile.render($('submission-verification'),{sitekey:cfg.turnstileSiteKey,action:'card_submission',theme:'dark',callback:value=>{token=value;refresh();},'expired-callback':()=>{token='';refresh();},'error-callback':()=>{token='';$('submission-status').textContent='Verification unavailable. Your package can still be downloaded.';refresh();}});
    script.onerror=()=>{$('submission-status').textContent='Verification could not load. Download the JSON backup and try again later.';};document.head.append(script);
  }
}catch(error){$('package-error').hidden=false;$('package-error').textContent=error.message;}
