(function(){
'use strict';

const URL='https://frxfoztyctrvsobbawmo.supabase.co';
const KEY='sb_publishable_or6yc7T71Hpyajn9ctn1FA_BjsB6LhL';
const BUCKET='bases-tecnico';
const CURRENT='atual/tecnico_certificado_atual.xlsx';
const FOLDER='historico';
const RX=/^tecnico_certificado_(\d{4})_(\d{2})\.xlsx$/i;
const MONTHS=['','JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
let sb=null, busy=false, selected=CURRENT;

function id(x){return document.getElementById(x)}
function status(text,type='loading'){
  const e=id('tcStatus'); if(e){e.textContent=text;e.dataset.type=type}
  try{parent.postMessage({source:'portal-panel',type:type==='error'?'error':type==='ok'?'ok':'loading',page:'tecnico_certificado.html',text},location.origin)}catch(_){ }
}
function client(){
  if(sb)return sb;
  if(!window.supabase?.createClient)throw new Error('Biblioteca Supabase não carregada');
  sb=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  return sb;
}
function css(){
  const s=document.createElement('style');
  s.textContent=`.tcbox{margin-top:12px;padding:12px;border:1px solid #ffffff55;border-radius:14px;background:#ffffff18}.tcrow{display:flex;gap:8px;align-items:end;flex-wrap:wrap}.tcfield{flex:1;min-width:280px}.tcfield label{color:#fff;font-size:11px;font-weight:900}.tcfield select{width:100%;padding:10px;border:0;border-radius:10px;font-weight:800}.tcrow button{border:0;border-radius:10px;padding:10px 14px;font-weight:900;cursor:pointer}.tcprimary{background:#fff;color:#e30613}.tcdark{background:#171717;color:#fff}#tcStatus{margin-top:9px;color:#fff;font-size:12px}#tcStatus[data-type=error]{color:#ffe0e0}#tcStatus[data-type=ok]{color:#dcfce7}@media(max-width:700px){.tcfield{min-width:100%}.tcrow button{flex:1}}`;
  document.head.appendChild(s);
}
function ui(){
  const hero=document.querySelector('.hero');
  if(!hero)throw new Error('Cabeçalho do dashboard não encontrado');
  const box=document.createElement('div');box.className='tcbox';box.innerHTML=`<div class="tcrow"><div class="tcfield"><label>BASE DISPONÍVEL NO SUPABASE</label><select id="tcSelect"><option value="${CURRENT}">ATUAL — tecnico_certificado_atual.xlsx</option></select></div><button id="tcLoad" class="tcprimary" type="button">CARREGAR</button><button id="tcRefresh" class="tcdark" type="button">ATUALIZAR LISTA</button></div><div id="tcStatus" data-type="loading">Boot V4 carregado. Consultando Supabase...</div>`;hero.appendChild(box);
  id('tcSelect').onchange=e=>selected=e.target.value;
  id('tcLoad').onclick=()=>load(id('tcSelect').value);
  id('tcRefresh').onclick=()=>catalog(true);
}
async function catalog(show){
  try{
    if(show)status('Consultando históricos...');
    const {data,error}=await client().storage.from(BUCKET).list(FOLDER,{limit:1000,offset:0,sortBy:{column:'name',order:'desc'}});
    if(error)throw error;
    const files=(data||[]).map(x=>{const m=x.name.match(RX);if(!m)return null;const y=+m[1],mo=+m[2];if(mo<1||mo>12)return null;return{path:FOLDER+'/'+x.name,label:`HISTÓRICO — ${MONTHS[mo]}/${y}`,y,mo}}).filter(Boolean).sort((a,b)=>b.y-a.y||b.mo-a.mo);
    const sel=id('tcSelect'),keep=sel.value||selected;sel.innerHTML='';sel.add(new Option('ATUAL — tecnico_certificado_atual.xlsx',CURRENT));files.forEach(f=>sel.add(new Option(f.label,f.path)));if([...sel.options].some(o=>o.value===keep))sel.value=keep;else{sel.value=CURRENT;selected=CURRENT}
    status(`Lista atualizada: ${files.length} histórico(s).`,'ok');return files;
  }catch(e){console.error(e);status('Falha ao listar históricos: '+(e.message||e),'error');return[]}
}
async function download(path){
  const bucket=client().storage.from(BUCKET);
  const signed=await bucket.createSignedUrl(path,120);
  if(!signed.error&&signed.data?.signedUrl){const r=await fetch(signed.data.signedUrl,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return r.blob()}
  const d=await bucket.download(path,{}, {cache:'no-store'});if(d.error)throw d.error;return d.data;
}
async function load(path){
  if(busy)return;busy=true;id('tcLoad').disabled=true;id('tcRefresh').disabled=true;
  try{
    selected=path;status('Baixando '+path+'...');const blob=await download(path);const name=path.split('/').pop();
    const input=id('excelFile');if(!input)throw new Error('Campo excelFile não encontrado');
    const file=new File([blob],name,{type:blob.type||'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    status('Base enviada ao dashboard: '+name,'ok');
  }catch(e){console.error(e);status('Falha ao carregar '+path+': '+(e.message||e),'error')}
  finally{busy=false;id('tcLoad').disabled=false;id('tcRefresh').disabled=false}
}
async function start(){
  try{css();ui();const session=await client().auth.getSession();if(session.error)throw session.error;if(!session.data.session)throw new Error('Sessão não encontrada. Entre novamente pelo portal.');await catalog(false);await load(CURRENT);setInterval(async()=>{await catalog(false);if(selected===CURRENT)await load(CURRENT)},300000)}catch(e){console.error(e);status('Falha na inicialização: '+(e.message||e),'error')}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
