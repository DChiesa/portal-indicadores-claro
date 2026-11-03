/* Cache persistente compartilhado dos dashboards do portal.
 * Mantem arquivos do Supabase no Cache Storage e revalida a versao remota
 * no maximo uma vez por hora usando HEAD/ETag/Last-Modified.
 */
(()=>{'use strict';
const VERSION='3.0.0';
const CACHE='portal-dados-v3';
const OLD_CACHES=['portal-dados-v1','portal-dados-v2'];
const META='portal_dados_cache_meta_v3';
const RECHECK_MS=60*60*1000; // 1 hora
const pending=new Map();
const nativeFetch=window.fetch.bind(window);
let meta={};
try{meta=JSON.parse(localStorage.getItem(META)||'{}')||{}}catch(_){meta={}}
const save=()=>{try{localStorage.setItem(META,JSON.stringify(meta))}catch(_){}};
function isStorage(url){return /\.supabase\.co\/storage\/v1\/object\//i.test(url)&&!/\/list(?:\?|\/|$)/i.test(url)}
function keyFor(url){const u=new URL(url,location.href);['_ts','ts','t','v','nocache','cacheBust','token'].forEach(k=>u.searchParams.delete(k));u.hash='';return u.origin+u.pathname+(u.searchParams.toString()?'?'+u.searchParams:'')}
function validators(headers){return{etag:headers.get('etag')||'',modified:headers.get('last-modified')||'',length:headers.get('content-length')||''}}
function sameVersion(a,b){if(!a||!b)return false;if(a.etag&&b.etag)return a.etag===b.etag;if(a.modified&&b.modified)return a.modified===b.modified&&(!a.length||!b.length||a.length===b.length);return false}
async function remoteVersion(req){const headers=new Headers(req.headers);headers.delete('range');const probe=new Request(req.url,{method:'HEAD',headers,credentials:req.credentials,mode:req.mode,redirect:req.redirect,referrer:req.referrer,referrerPolicy:req.referrerPolicy,cache:'no-store'});const response=await nativeFetch(probe);if(!response.ok)throw new Error('HEAD '+response.status);return validators(response.headers)}
async function store(cache,key,response){await cache.put(key,response.clone());const v=validators(response.headers);meta[key]={...v,checkedAt:Date.now(),savedAt:Date.now()};save()}
async function cachedFetch(input,init={}){
 const req=input instanceof Request?input:new Request(input,init);
 if(req.method!=='GET'||!isStorage(req.url)||init.__semCachePortal)return nativeFetch(input,init);
 const key=keyFor(req.url);
 if(pending.has(key))return(await pending.get(key)).clone();
 const job=(async()=>{
  const cache=await caches.open(CACHE),hit=await cache.match(key,{ignoreVary:true,ignoreSearch:false}),info=meta[key]||null;
  if(hit){
   if(info&&Date.now()-(info.checkedAt||0)<RECHECK_MS)return hit.clone();
   try{
    const remote=await remoteVersion(req);
    if(sameVersion(info,remote)){meta[key]={...info,...remote,checkedAt:Date.now()};save();return hit.clone()}
    if(!remote.etag&&!remote.modified){meta[key]={...info,checkedAt:Date.now()};save();return hit.clone()}
   }catch(error){console.warn('[PortalDataCache] Validacao remota indisponivel; usando cache local.',error);return hit.clone()}
  }
  const response=await nativeFetch(req,{cache:'no-store'});if(response.ok)await store(cache,key,response);return response;
 })();
 pending.set(key,job);try{return(await job).clone()}finally{pending.delete(key)}
}
window.fetch=cachedFetch;
window.PortalDataCache={version:VERSION,async clear(){await Promise.all([CACHE,...OLD_CACHES].map(x=>caches.delete(x)));meta={};save()},async status(){const cache=await caches.open(CACHE),keys=await cache.keys();return{version:VERSION,items:keys.length,metadata:Object.keys(meta).length,recheckMs:RECHECK_MS,recheckMinutes:RECHECK_MS/60000}},async remove(url){const key=keyFor(url),cache=await caches.open(CACHE);await cache.delete(key,{ignoreVary:true});delete meta[key];save()}};
OLD_CACHES.forEach(x=>caches.delete(x).catch(()=>{}));
})();
