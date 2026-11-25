importScripts('offline-assets.js');
const CACHE = 'ctf-browser-20261125-v9';
const CORE = ['./','./index.html','./play.html','./cards.html','./collections.html','./deckbuilder.html','./rules.html','./glossary.html','./first-five-forge.html','./submit.html','./About_Us.html','./play_inline.js','./manifest.json','./icon-ctf.svg','./assets/js/ctf-config.js','./assets/js/data.js','./assets/js/zf1-tutorial-data.js','./assets/js/deck-utils.js','./assets/js/engine.js','./assets/js/card-playability-manifest.js','./assets/js/ai_opponent.js','./assets/js/cpu-browser.js','./assets/js/tutorial_coach.js','./assets/js/first-five-forge.js','./assets/js/ctf-unified-nav.js','./assets/css/first-five-forge.css','./assets/css/ctf-unified-nav.css','./ALPHA/forge-review-data.json','./images/placeholder.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...new Set([...CORE,...self.CTF_OFFLINE_ASSETS])])).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ctf-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.includes('/api/')) return;
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request,copy)); }
    return response;
  }).catch(async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(event.request, {ignoreSearch:true}) || new Response('This resource is not available offline.', {status:503,headers:{'Content-Type':'text/plain'}});
  }));
});
