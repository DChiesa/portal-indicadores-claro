(function(){
'use strict';
const C=window.PORTAL_CONFIG;
if(!C) return console.error('portal-config.js não carregado');
const page=decodeURIComponent(location.pathname.split('/').pop()||'').toLowerCase();
const paths=Object.entries(C.FILES);
const found=paths.find(([name])=>name.toLowerCase()===page);
if(!found) return;
const path=found[1];
let client=null,busy=false,timer=null;
function q(s){return document.querySelector(s)}
function send(type,text){
  const badge=document.getElementById('portalAutoStatus');
  if(badge){badge.className='portal-auto-status '+type;badge.querySelector('span:last-child').textContent=text}
  parent.postMessage({source:'portal-panel',type,page,text},location.origin);
}
function ui(){
 const bar=document.createElement('div');bar.className='portal-panel-bar';bar.innerHTML='<button id="portalBack" type="button">← Portal</button><div><b>Atualização automática</b><small>'+path+'</small></div><div id="portalAutoStatus" class="portal-auto-status loading"><i></i><span>Preparando...</span></div><button id="portalRefresh" type="button">Atualizar agora</button>';
 document.body.prepend(bar);
 document.getElementById('portalBack').onclick=()=>parent===window?location.href='index.html':parent.postMessage({source:'portal-panel',type:'home'},location.origin);
 document.getElementById('portalRefresh').onclick=()=>load(true);
}
function input(){return q('input[type="file"]')}
function fileType(name){const e=name.split('.').pop().toLowerCase();if(e==='xlsx'||e==='xls'||e==='xlsm')return'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';if(e==='docx')return'application/vnd.openxmlformats-officedocument.wordprocessingml.document';if(e==='csv')return'text/csv';return'text/plain'}
function basename(p){return p.split('/').pop()||'base'}
function supa(){if(client)return client;if(!window.supabase)throw Error('Biblioteca Supabase não carregada');client=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});return client}
async function fetchTimeout(url,ms=60000){const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);try{return await fetch(url,{cache:'no-store',signal:ac.signal})}finally{clearTimeout(t)}}
async function load(manual=false){
 if(busy)return;busy=true;
 try{
  send('loading','Autorizando...');
  const {data:{session},error:se}=await supa().auth.getSession();if(se)throw se;if(!session)throw Error('Sessão ausente. Entre pelo portal principal.');
  const {data,error}=await supa().storage.from(C.BUCKET).createSignedUrl(path,120);if(error)throw error;if(!data?.signedUrl)throw Error('URL temporária não gerada');
  send('loading','Baixando base...');
  const res=await fetchTimeout(data.signedUrl);if(!res.ok)throw Error('Falha HTTP '+res.status);
  const buf=await res.arrayBuffer();if(!buf.byteLength)throw Error('Arquivo vazio');
  const inp=input();if(!inp)throw Error('Campo de importação não encontrado neste painel');
  const f=new File([buf],basename(path),{type:fileType(path),lastModified:Date.now()});
  const dt=new DataTransfer();dt.items.add(f);inp.files=dt.files;
  send('loading','Processando no painel...');
  inp.dispatchEvent(new Event('change',{bubbles:true}));
  setTimeout(()=>send('ok','Atualizado '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})),1200);
 }catch(e){console.error(e);send('error',e.name==='AbortError'?'Tempo excedido':e.message)}finally{busy=false}
}
function start(){ui();setTimeout(()=>load(false),300);timer=setInterval(()=>load(false),C.AUTO_REFRESH_MS)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.addEventListener('beforeunload',()=>timer&&clearInterval(timer));
})();
