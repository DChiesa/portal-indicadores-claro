/* Cache compartilhado dos dashboards - preserva a logica funcional existente. */
(()=>{'use strict';
const VERSION='1.0.0',CACHE='portal-dados-v1',META='portal_dados_cache_meta_v1';
const TTL={historico:180*24*60*60*1000,atual:15*60*1000,config:5*60*1000};
const nativeFetch=window.fetch.bind(window),pending=new Map();
let meta={};try{meta=JSON.parse(localStorage.getItem(META)||'{}')}catch(_){meta={}}
const save=()=>{try{localStorage.setItem(META,JSON.stringify(meta))}catch(_){}};
function isStorage(u){return /\.supabase\.co\/storage\/v1\/object\//i.test(u)&&!/\/list\//i.test(u)}
function normalized(u){const x=new URL(u,location.href);['_ts','ts','t','v','nocache','cacheBust'].forEach(k=>x.searchParams.delete(k));if(x.searchParams.has('token'))x.searchParams.delete('token');return x.origin+x.pathname+(x.searchParams.toString()?'?'+x.searchParams:'')}
function ttl(u){u=u.toLowerCase();if(/historico|history/.test(u))return TTL.historico;if(/config|periodo|versao|version/.test(u))return TTL.config;return TTL.atual}
async function cachedFetch(input,init={}){const req=input instanceof Request?input:new Request(input,init);const url=req.url;if(req.method!=='GET'||!isStorage(url)||init.__semCachePortal)return nativeFetch(input,init);
 const key=normalized(url),age=Date.now()-(meta[key]||0),cache=await caches.open(CACHE),hit=await cache.match(key);
 if(hit&&age<ttl(key))return hit.clone();
 if(pending.has(key))return (await pending.get(key)).clone();
 const job=(async()=>{try{const response=await nativeFetch(input,{...init,cache:'default'});if(response.ok){await cache.put(key,response.clone());meta[key]=Date.now();save()}return response}catch(err){if(hit)return hit.clone();throw err}finally{pending.delete(key)}})();pending.set(key,job);return (await job).clone()}
window.fetch=cachedFetch;
window.PortalDataCache={version:VERSION,async clear(){await caches.delete(CACHE);meta={};save()},async status(){return{version:VERSION,items:Object.keys(meta).length,ttl:TTL}}};
})();
