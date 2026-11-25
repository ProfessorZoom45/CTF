const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const missing = [];
let syntaxCount = 0, referenceCount = 0;
for (const name of fs.readdirSync(root).filter(n => n.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root,name),'utf8');
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const ref = match[1].split(/[?#]/)[0];
    if (!ref || ref.includes('${') || /^(https?:|data:|mailto:|tel:|javascript:|\/\/)/i.test(ref)) continue;
    referenceCount++;
    if (!fs.existsSync(path.resolve(root,ref))) missing.push({page:name,ref});
  }
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc=|application\/(ld\+json|json)|type=["']module/.test(match[1]) || !match[2].trim()) continue;
    try { new vm.Script(match[2], {filename:name}); syntaxCount++; }
    catch(error) { missing.push({page:name,syntax:error.message}); }
  }
}
for (const name of fs.readdirSync(path.join(root,'assets/js')).filter(n=>n.endsWith('.js'))) {
  try { const code = fs.readFileSync(path.join(root,'assets/js',name),'utf8'); new vm.Script('(async()=>{' + code.replace(/^import .*;\r?\n/gm,'').replace(/import\.meta\.url/g, '"http://localhost/"') + '\n})()',{filename:name}); syntaxCount++; }
  catch(error) { missing.push({page:name,syntax:error.message}); }
}
new vm.Script(fs.readFileSync(path.join(root,'play_inline.js'),'utf8'));
const artworkContext = vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(root,'assets/js/verified-card-images.js'),'utf8'),artworkContext);
const verifiedArt = artworkContext.window.CTF_VERIFIED_IMAGES;
for (const [id, ref] of Object.entries(verifiedArt)) {
  let directory = root;
  for (const part of ref.split('/')) {
    if (!fs.readdirSync(directory).includes(part)) {
      missing.push({card:id,ref,reason:'Missing exact filename on GitHub Pages'});
      break;
    }
    directory = path.join(directory,part);
  }
}
console.log(JSON.stringify({syntaxCount,referenceCount,verifiedArtCount:Object.keys(verifiedArt).length,issues:missing},null,2));
process.exitCode = missing.length ? 1 : 0;
