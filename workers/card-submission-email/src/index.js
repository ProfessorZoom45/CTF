const MAX_JSON_BYTES=20*1024*1024;
const RESEND_ENDPOINT='https://api.resend.com/emails';

export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const corsHeaders=getCorsHeaders(origin,env.ALLOWED_ORIGIN);

  if(request.method==='OPTIONS'){
   if(!corsHeaders)return new Response(null,{status:403});
   return new Response(null,{status:204,headers:corsHeaders});
  }

  if(request.method!=='POST'||new URL(request.url).pathname!=='/submit-card'){
   return jsonResponse({ok:false,error:'not_found'},404,corsHeaders);
  }
  if(!corsHeaders)return jsonResponse({ok:false,error:'origin_not_allowed'},403,null);
  if(!env.RESEND_API_KEY||!env.TURNSTILE_SECRET){
   return jsonResponse({ok:false,error:'service_not_configured'},503,corsHeaders);
  }

  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  if(!env.SUBMISSION_RATE_LIMITER){
   return jsonResponse({ok:false,error:'rate_limiter_not_configured'},503,corsHeaders);
  }
  const rateLimit=await env.SUBMISSION_RATE_LIMITER.limit({key:ip});
  if(!rateLimit.success)return jsonResponse({ok:false,error:'rate_limited'},429,corsHeaders);

  let rawBody;
  try{
   rawBody=await request.text();
  }catch{
   return jsonResponse({ok:false,error:'invalid_request'},400,corsHeaders);
  }
  if(new TextEncoder().encode(rawBody).byteLength>MAX_JSON_BYTES+1024*1024){
   return jsonResponse({ok:false,error:'request_too_large'},413,corsHeaders);
  }

  let body;
  try{body=JSON.parse(rawBody)}catch{return jsonResponse({ok:false,error:'invalid_json'},400,corsHeaders)}
  const submissionId=cleanId(body.submission_id);
  const fileName=cleanFileName(body.file_name);
  const jsonText=typeof body.json==='string'?body.json:'';
  if(!submissionId||!fileName||!jsonText||typeof body.turnstile_token!=='string'){
   return jsonResponse({ok:false,error:'missing_fields'},400,corsHeaders);
  }
  if(new TextEncoder().encode(jsonText).byteLength>MAX_JSON_BYTES){
   return jsonResponse({ok:false,error:'attachment_too_large'},413,corsHeaders);
  }

  let submission;
  try{submission=JSON.parse(jsonText)}catch{return jsonResponse({ok:false,error:'invalid_attachment_json'},400,corsHeaders)}
  if(submission.submission_id!==submissionId||!validSubmission(submission)){
   return jsonResponse({ok:false,error:'invalid_submission'},400,corsHeaders);
  }

  const turnstile=await verifyTurnstile(body.turnstile_token,ip,env);
  if(!turnstile.success||turnstile.action!=='card_submission'||
     turnstile.hostname!==env.EXPECTED_TURNSTILE_HOSTNAME){
   return jsonResponse({ok:false,error:'verification_failed'},403,corsHeaders);
  }

  const attachment=bytesToBase64(new TextEncoder().encode(jsonText));
  const submitter=submission.submitter;
  const emailRequest={
   from:env.EMAIL_FROM,
   to:[env.EMAIL_TO],
   reply_to:submitter.email,
   subject:`CTF Custom Card Submission — ${safeSubject(submitter.name)}`,
   text:buildEmailText(submission,fileName),
   attachments:[{filename:fileName,content:attachment}],
   tags:[
    {name:'submission_type',value:'custom_cards'},
    {name:'submission_id',value:submissionId}
   ]
  };

  let resendResponse;
  try{
   resendResponse=await fetch(RESEND_ENDPOINT,{
    method:'POST',
    headers:{
     'Authorization':`Bearer ${env.RESEND_API_KEY}`,
     'Content-Type':'application/json',
     'Idempotency-Key':`ctf-card-${submissionId}`
    },
    body:JSON.stringify(emailRequest)
   });
  }catch{
   return jsonResponse({ok:false,error:'email_provider_unavailable'},502,corsHeaders);
  }

  if(!resendResponse.ok){
   return jsonResponse({ok:false,error:'email_delivery_failed'},502,corsHeaders);
  }
  const result=await resendResponse.json();
  return jsonResponse({ok:true,email_id:result.id},200,corsHeaders);
 }
};

function getCorsHeaders(origin,allowedOrigin){
 if(!origin||origin!==allowedOrigin)return null;
 return {
  'Access-Control-Allow-Origin':allowedOrigin,
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type',
  'Access-Control-Max-Age':'86400',
  'Vary':'Origin',
  'Cache-Control':'no-store'
 };
}

function jsonResponse(body,status,corsHeaders){
 const headers={'Content-Type':'application/json','Cache-Control':'no-store',...(corsHeaders||{})};
 return new Response(JSON.stringify(body),{status,headers});
}

async function verifyTurnstile(token,ip,env){
 try{
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({secret:env.TURNSTILE_SECRET,response:token,remoteip:ip})
  });
  return await response.json();
 }catch{return {success:false}}
}

function validSubmission(submission){
 return !!(submission&&submission.submitter&&
  typeof submission.submitter.name==='string'&&submission.submitter.name.trim()&&
  typeof submission.submitter.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.submitter.email)&&
  Array.isArray(submission.cards)&&submission.cards.length===5&&
  typeof submission.timestamp==='string');
}

function cleanId(value){
 return typeof value==='string'&&/^[a-zA-Z0-9_-]{12,80}$/.test(value)?value:'';
}

function cleanFileName(value){
 if(typeof value!=='string')return '';
 const cleaned=value.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120);
 return cleaned.toLowerCase().endsWith('.json')?cleaned:'';
}

function safeSubject(value){
 return String(value||'Creator').replace(/[\r\n]+/g,' ').trim().slice(0,80)||'Creator';
}

function buildEmailText(submission,fileName){
 const pool=submission.poolUsed||{};
 return [
  'A new Carry The Flame custom-card set was submitted.',
  '',
  `Submission ID: ${submission.submission_id}`,
  `Submitter: ${submission.submitter.name}`,
  `Reply email: ${submission.submitter.email}`,
  `Submitted: ${submission.timestamp}`,
  `Cards: ${submission.cards.length}`,
  `Pool: ${pool.pressure||0}/4500 PR · ${pool.counterPressure||0}/4500 CP`,
  `Images: ${submission.totalImages||0}`,
  '',
  `The complete submission is attached as ${fileName}.`
 ].join('\n');
}

function bytesToBase64(bytes){
 let binary='';
 const chunkSize=0x8000;
 for(let i=0;i<bytes.length;i+=chunkSize){
  binary+=String.fromCharCode(...bytes.subarray(i,i+chunkSize));
 }
 return btoa(binary);
}
