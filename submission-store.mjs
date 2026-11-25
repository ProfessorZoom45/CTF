import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildSubmission } from './assets/js/forge-submission.mjs';

const writes = new Map();
export async function saveSubmission(input, tree, directory) {
  const key=path.join(directory,String(input?.submission_id || 'invalid'));
  const previous=writes.get(key) || Promise.resolve();
  const pending=previous.catch(()=>{}).then(()=>persistSubmission(input,tree,directory));
  writes.set(key,pending);
  try{return await pending;}finally{if(writes.get(key)===pending)writes.delete(key);}
}
async function persistSubmission(input, tree, directory) {
  const built=buildSubmission(input,tree);
  if (!built.ok) return {status:400,body:{ok:false,errors:built.errors}};
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify({draft:input.draft,submitter:built.submission.submitter,agreement:input.agreement})).digest('hex');
  const filename=path.join(directory,built.submission.submission_id+'.json');
  const record={...built.submission,fingerprint,receivedAt:new Date().toISOString()};
  await fs.mkdir(directory,{recursive:true});
  try { await fs.writeFile(filename,JSON.stringify(record,null,2),{flag:'wx',mode:0o600}); }
  catch(error) {
    if(error.code!=='EEXIST')throw error;
    const existing=JSON.parse(await fs.readFile(filename,'utf8'));
    if(existing.fingerprint!==fingerprint)return {status:409,body:{ok:false,errors:['This submission ID belongs to a different package. Refresh and review the current draft.']}};
    return {status:200,body:{ok:true,submission_id:existing.submission_id,status:'pending_review',delivery:'local_inbox',receivedAt:existing.receivedAt,duplicate:true}};
  }
  return {status:201,body:{ok:true,submission_id:record.submission_id,status:'pending_review',delivery:'local_inbox',receivedAt:record.receivedAt}};
}
