'use strict';
const CACHE='portal-manutencao-v1';
const FALLBACK='./manutencao.html';
const ASSETS=[FALLBACK,'./assets/manutencao.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('portal-manutencao-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||event.request.mode!=='navigate')return;
  event.respondWith(fetch(event.request).then(response=>response.status>=500?caches.match(FALLBACK):response).catch(()=>caches.match(FALLBACK)));
});
