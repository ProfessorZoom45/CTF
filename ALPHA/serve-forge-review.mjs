// Launch the static Forge review locally: node ALPHA/serve-forge-review.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.CTF_FORGE_PORT || 8765);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.pdf':'application/pdf'};

http.createServer((request,response) => {
  if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  if (pathname.includes('\0')) { response.writeHead(400).end(); return; }
  const filename=path.resolve(root,`.${pathname === '/' ? '/forge-name-review.html' : pathname}`);
  if (!filename.startsWith(root+path.sep)) { response.writeHead(403).end(); return; }
  fs.readFile(filename,(error,content) => {
    if (error) { response.writeHead(404).end(); return; }
    response.writeHead(200,{'Content-Type':types[path.extname(filename).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});
    response.end(request.method==='HEAD' ? undefined : content);
  });
}).listen(port,'127.0.0.1',() => console.log(`Forge preview: http://127.0.0.1:${port}/forge-name-review.html`));
