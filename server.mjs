import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { saveSubmission } from './submission-store.mjs';
import { RoomService } from './room-service.mjs';
import { PrivateDuel } from './match-referee.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.CTF_PORT || 8028);
const rooms = new RoomService();
const privateRooms = new RoomService({createDuel:()=>new PrivateDuel()});
const reviewDirectory = path.resolve(root,'../output/browser-submissions');
const forgeTree = JSON.parse(fs.readFileSync(path.join(root,'ALPHA/forge-review-data.json'),'utf8'));
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.gif':'image/gif', '.jpg':'image/jpeg', '.pdf':'application/pdf' };
http.createServer(async (req, res) => {
  const pathname = new URL(req.url,'http://localhost').pathname;
  if(pathname==='/api/site-config'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({submissionDelivery:'local_inbox'}));return;}
  const isPrivateRoomRoute = pathname.startsWith('/api/private-multiplayer/');
  const roomPrefix = isPrivateRoomRoute ? '/api/private-multiplayer/' : '/api/multiplayer/';
  if(pathname.startsWith(roomPrefix)){
    const json=(status,body)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(body));
    const origin=`http://${req.headers.host}`;
    if(req.method==='POST'&&req.headers.origin!==origin){json(403,{error:'Open the CTF website before using this room.'});return;}
    if(pathname===roomPrefix+'config'){json(200,{transport:isPrivateRoomRoute?'private-referee':'relay',shareUrl:origin+'/',maxPlayers:2});return;}
    let result;
    const service=isPrivateRoomRoute?privateRooms:rooms;
    const parts=pathname.slice(roomPrefix.length).split('/');
    const token=String(req.headers.authorization||'').replace(/^Bearer /,'');
    try{
      let body={};if(req.method==='POST'){const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>1100000){json(413,{error:'Game message is too large.'});return;}chunks.push(chunk);}body=JSON.parse(Buffer.concat(chunks).toString()||'{}');}
      if(parts[0]==='rooms'&&parts.length===1&&req.method==='POST')result=service.create();
      else if(parts[0]==='rooms'&&parts.length===3){const code=parts[1];if(parts[2]==='join'&&req.method==='POST')result=service.join(code,token);else if(parts[2]==='events'&&req.method==='GET')result=service.events(code,token,Number(new URL(req.url,origin).searchParams.get('after'))||0);else if(parts[2]==='messages'&&req.method==='POST')result=service.send(code,token,body);}
      if(!result){json(404,{error:'Room endpoint not found.'});return;}json(result.status,result.body);
    }catch{json(400,{error:'Invalid room request.'});}return;
  }
  if (pathname === '/api/card-submissions') {
    const respond=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
    if(req.method!=='POST'){respond(405,{ok:false,error:'Use POST to submit a finalized package.'});return;}
    const permitted=[`http://127.0.0.1:${port}`,`http://localhost:${port}`];
    if(!permitted.includes(req.headers.origin) || !String(req.headers['content-type']).startsWith('application/json')){respond(403,{ok:false,error:'Submit from the local CTF website.'});return;}
    try {
      const chunks=[];let bytes=0;
      for await(const chunk of req){bytes+=chunk.length;if(bytes>256*1024){respond(413,{ok:false,error:'Submission exceeds 256 KB. Download the package and contact the reviewer.'});return;}chunks.push(chunk);}
      let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{respond(400,{ok:false,error:'Invalid JSON.'});return;}
      const result=await saveSubmission(input,forgeTree,reviewDirectory);respond(result.status,result.body);
    }catch(error){console.error('Submission could not be saved:',error.message);respond(500,{ok:false,error:'The review inbox could not save this package. Keep your JSON backup and retry.'});}
    return;
  }
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405).end('Method not allowed');return;}
  let filename;
  try { filename = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
  catch { res.writeHead(400).end('Bad request'); return; }
  if (filename !== root && !filename.startsWith(root + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
  if (fs.existsSync(filename) && fs.statSync(filename).isDirectory()) filename = path.join(filename, 'index.html');
  if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff' });
  fs.createReadStream(filename).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Carry The Flame: http://127.0.0.1:${port}/`));
