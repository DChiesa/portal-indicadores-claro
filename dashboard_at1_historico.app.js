(function(){
'use strict';
var statusEl=document.getElementById('status');
if(statusEl)statusEl.textContent='V5.0 · Aplicação carregada; conectando ao Supabase...';

const $=id=>document.getElementById(id), norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase(), esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtInt=v=>Number(v||0).toLocaleString('pt-BR'), fmtPct=(v,d=2)=>Number(v||0).toFixed(d).replace('.',',')+'%';
const METAS={TOTAL:.024,GPON:.015,HFC:.025,HIBRIDO:.035};
const SUPABASE_URL='https://frxfoztyctrvsobbawmo.supabase.co';
const SUPABASE_KEY='sb_publishable_or6yc7T71Hpyajn9ctn1FA_BjsB6LhL';
const BUCKET='bases-tecnico';
const CURRENT_PATH='at1.xlsx';
const HISTORY_FOLDER='historico';
const REFRESH_MS=5*60*1000;
const HISTORY_RE=/^dashboard_at1_historico_(\d{4})\.(\d{2})\.xlsx$/i;
let sb=null, chart=null, refreshTimer=null;
let state={analitico:[],base:[],city:'BAGE',type:'TOTAL',start:'',end:'',node:'TODOS',baixa:'TODOS',file:null,sourceKind:'current',lastCatalog:[]};
function postPortal(type,text){try{parent.postMessage({source:'portal-panel',type,page:'dashboard_at1_historico.html',text},location.origin)}catch(_){}}
function setStatus(msg,kind=''){
 $('status').textContent=msg;$('statusbar').className='statusbar '+kind;
 postPortal(kind==='err'?'error':kind==='ok'?'ok':'loading',msg);
}
function humanError(e){
 const raw=String((e&&e.message)||e||'Erro desconhecido');
 if(/session|jwt|unauthorized|401/i.test(raw))return 'Sessão não autorizada pelo Supabase. Volte ao portal, entre novamente e abra o AT1.';
 if(/row-level|rls|policy|403/i.test(raw))return 'Acesso negado pelo Storage. A sessão existe, mas a política SELECT de storage.objects não autorizou o bucket bases-tecnico.';
 if(/not found|404/i.test(raw))return 'Arquivo não encontrado no bucket '+BUCKET+': '+CURRENT_PATH+'.';
 if(/Tempo excedido/i.test(raw))return raw+'. Verifique bloqueio de rede/CDN no navegador.';
 return raw;
}
function getField(r,names){const keys=Object.keys(r||{});for(const name of names){const k=keys.find(x=>norm(x)===norm(name));if(k!==undefined)return r[k]}return''}
function num(v){if(v==null||v==='')return 0;if(typeof v==='number')return v;let s=String(v).trim().replace(/\s/g,'').replace('%','');if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');return Number(s)||0}
function dateParts(v){if(v==null||v==='')return null;if(v instanceof Date&&!isNaN(v))return mk(v.getFullYear(),v.getMonth()+1,v.getDate());if(typeof v==='number'&&!isNaN(v)){const d=new Date(Math.round((v-25569)*864e5));return mk(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate())}let s=String(v).trim(),m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return mk(+m[1],+m[2],+m[3]);m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m)return mk(+m[3],+m[2],+m[1]);const d=new Date(s);return isNaN(d)?null:mk(d.getFullYear(),d.getMonth()+1,d.getDate())}function mk(y,m,d){return{y,m,d,key:`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}}
function city(r){return norm(getField(r,['MUNICIPIO','MUNICÍPIO','CIDADE','CIDADE BASE']))}function node(r){return String(getField(r,['CD_NODE','NODE'])).trim()}function baixa(r){return String(getField(r,['CD_BAIXA','CODIGO_BAIXA','CÓDIGO DE BAIXA','COD BAIXA'])).trim()}function tipo(r){const v=norm(getField(r,['DSC_SEG_PRODUTO','DSC_SEGMENTACAO','TECNOLOGIA','TECNINOLOGIA','TECNILOGIA','PRODUTO','TIPO_AT1','NM_TECNOLOGIA','NM_TIPO_TECNOLOGIA']));if(v.includes('GPON'))return'GPON';if(v.includes('HFC'))return'HFC';if(v.includes('HIBR'))return'HIBRIDO';if(v.includes('TOTAL'))return'TOTAL';return v}function statusOS(r){return norm(getField(r,['NM_STATUS_OS']))}function expurgo(r){return norm(getField(r,['EXPURGO_AT1']))}function generated(r){return dateParts(getField(r,['DATA','Data_nota','DATA_NOTA','DT_ABERTURA']))}function executed(r){return dateParts(getField(r,['DT_FIM_EXECUCAO']))}function rowDate(r){return generated(r)||executed(r)}function isAT1(r){return statusOS(r)==='EXECUTADA'&&expurgo(r)==='NAO'}function isG1(r){return ['EXECUTADA','CANCELADA'].includes(statusOS(r))}
function matches(r,detail=true){const d=rowDate(r);return city(r)===state.city&&(state.type==='TOTAL'||tipo(r)===state.type)&&(!detail||(!state.start||d?.key>=state.start)&&(!state.end||d?.key<=state.end)&&(state.node==='TODOS'||node(r)===state.node)&&(state.baixa==='TODOS'||baixa(r)===state.baixa))}
function baseValue(){const rows=state.base.filter(r=>city(r)===state.city);for(const r of rows){const keys=Object.keys(r);const key=state.type==='TOTAL'?keys.find(k=>norm(k)==='TOTAL'||norm(k).includes('BASE TOTAL')):keys.find(k=>norm(k).includes(state.type));if(key&&num(r[key])>0)return num(r[key])}const infos=rows.map(r=>({r,tech:tipo(r),v:num(getField(r,['BASE','BASE CLIENTE','BASE_CLIENTE','QTD','CLIENTE']))})).filter(x=>x.v>0);if(state.type==='TOTAL'){const t=infos.find(x=>x.tech==='TOTAL');if(t)return t.v;const parts=infos.filter(x=>['GPON','HFC','HIBRIDO'].includes(x.tech));if(parts.length)return parts.reduce((a,x)=>a+x.v,0)}const exact=infos.find(x=>x.tech===state.type);return exact?.v||infos.find(x=>x.tech==='TOTAL')?.v||Math.max(0,...infos.map(x=>x.v))}
function period(rows){const ds=rows.map(rowDate).filter(Boolean).sort((a,b)=>a.key.localeCompare(b.key));const p=ds.at(-1)||mk(new Date().getFullYear(),new Date().getMonth()+1,1);return{y:p.y,m:p.m,days:new Date(p.y,p.m,0).getDate(),last:Math.max(1,...ds.filter(x=>x.y===p.y&&x.m===p.m).map(x=>x.d))}}
function fillSelect(id,values,current,all){const e=$(id);e.innerHTML=`<option value="TODOS">${all}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');e.value=values.includes(current)?current:'TODOS';return e.value}
function populate(){const cities=[...new Set(state.analitico.map(city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));$('fCity').innerHTML=cities.map(v=>`<option>${esc(v)}</option>`).join('');if(!cities.includes(state.city))state.city=cities[0]||'BAGE';$('fCity').value=state.city;$('fType').value=state.type;const baseRows=state.analitico.filter(r=>city(r)===state.city&&(state.type==='TOTAL'||tipo(r)===state.type));state.node=fillSelect('fNode',[...new Set(baseRows.map(node).filter(Boolean))].sort(),state.node,'TODOS OS NODES');state.baixa=fillSelect('fBaixa',[...new Set(baseRows.filter(r=>state.node==='TODOS'||node(r)===state.node).map(baixa).filter(Boolean))].sort(),state.baixa,'TODOS OS CÓDIGOS');$('fStart').value=state.start;$('fEnd').value=state.end}
function top(rows,getter,dateGetter,p,limit=20,only){const map=new Map();for(const r of rows){if(only&&!only(r))continue;const k=getter(r),d=dateGetter(r)||rowDate(r);if(!k||!d||d.y!==p.y||d.m!==p.m)continue;if(!map.has(k))map.set(k,{label:k,total:0,days:{}});const o=map.get(k);o.total++;o.days[d.d]=(o.days[d.d]||0)+1}return[...map.values()].sort((a,b)=>b.total-a.total||a.label.localeCompare(b.label)).slice(0,limit)}
function heat(id,label,items,p,total){let h=`<table class="heat"><thead><tr><th>${label}</th>`;for(let d=1;d<=p.days;d++)h+=`<th>${d}</th>`;h+='<th>TOTAL</th><th>%</th></tr></thead><tbody>';for(const x of items){h+=`<tr><td class="label">${esc(x.label)}</td>`;for(let d=1;d<=p.days;d++){const v=x.days[d]||0,c=v===0?'c0':v===1?'c1':v<=3?'c2':v<=5?'c3':'c4';h+=`<td class="${c}">${v||''}</td>`}h+=`<td>${x.total}</td><td>${fmtPct(total?x.total/total*100:0)}</td></tr>`}if(!items.length)h+=`<tr><td colspan="${p.days+3}">Sem dados para o filtro selecionado.</td></tr>`;$(id).innerHTML=h+'</tbody></table>'}
function render(){populate();const rows=state.analitico.filter(r=>matches(r,true)),all=state.analitico.filter(r=>matches(r,false)),p=period(all.length?all:rows),base=baseValue(),meta=METAS[state.type]??METAS.TOTAL,current=state.sourceKind==='current',divisor=current?p.last:p.days,exec=rows.filter(isAT1).length,g1=rows.filter(isG1).length,ger=rows.length,at1=base?(current?exec/divisor*p.days/base*100:exec/base*100):0,g1p=base?(current?g1/divisor*p.days/base*100:g1/base*100):0;
$('kAt1').textContent=fmtPct(at1);$('kG1').textContent=fmtPct(g1p);$('kExec').textContent=fmtInt(exec);$('kGer').textContent=fmtInt(ger);$('kBase').textContent=fmtInt(base);$('kMeta').textContent=fmtPct(meta*100,1);$('mReg').textContent=fmtInt(rows.length);$('mNodes').textContent=fmtInt(new Set(rows.map(node).filter(Boolean)).size);$('mBaixas').textContent=fmtInt(new Set(rows.map(baixa).filter(Boolean)).size);$('mAt1').textContent=fmtInt(exec);
const labels=Array.from({length:p.days},(_,i)=>String(i+1)),ex=Array(p.days).fill(0),ge=Array(p.days).fill(0);for(const r of rows){const ed=executed(r),gd=rowDate(r);if(isAT1(r)&&ed&&ed.y===p.y&&ed.m===p.m)ex[ed.d-1]++;if(gd&&gd.y===p.y&&gd.m===p.m)ge[gd.d-1]++}let ac=0;const proj=ex.map((v,i)=>{ac+=v;return base?ac/(i+1)*p.days/base*100:0});if(chart)chart.destroy();Chart.register(ChartDataLabels);chart=new Chart($('chart'),{data:{labels,datasets:[{type:'bar',label:'VT EXECUTADA',data:ex,backgroundColor:ex.map(v=>v<=base*meta/p.days?'#16803a':'#d00000'),yAxisID:'y'},{type:'line',label:'VT GERADA',data:ge,borderColor:'#f79009',borderDash:[6,5],pointRadius:2,yAxisID:'y'},{type:'line',label:'PROJEÇÃO',data:proj,borderColor:'#101828',borderWidth:3,pointRadius:0,yAxisID:'p'}]},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom'},datalabels:{color:'#344054',anchor:'end',align:'top',formatter:(v,c)=>v?(c.dataset.yAxisID==='p'?fmtPct(v):fmtInt(v)):''}},scales:{y:{beginAtZero:true},p:{position:'right',grid:{drawOnChartArea:false},ticks:{callback:v=>v+'%'}}}}});$('chartTitle').textContent=`Evolução diária - ${state.city} / ${state.type} - ${String(p.m).padStart(2,'0')}/${p.y}`;
const map=new Map();for(const r of rows){const n=node(r)||'-',b=baixa(r)||'-',k=n+'|'+b;if(!map.has(k))map.set(k,{n,b,total:0,at1:0,g1:0});const o=map.get(k);o.total++;if(isAT1(r))o.at1++;if(isG1(r))o.g1++}let h='<table><thead><tr><th>NODE</th><th>CÓD. BAIXA</th><th>TOTAL</th><th>AT1</th><th>G1</th></tr></thead><tbody>';for(const o of [...map.values()].sort((a,b)=>b.total-a.total).slice(0,30))h+=`<tr><td>${esc(o.n)}</td><td>${esc(o.b)}</td><td>${o.total}</td><td>${o.at1}</td><td>${o.g1}</td></tr>`;$('detail').innerHTML=h+(map.size?'':'<tr><td colspan="5">Sem dados.</td></tr>')+'</tbody></table>';
heat('nodeHeat','NODE',top(rows,node,executed,p,20,isAT1),p,exec);heat('baixaHeat','CÓD. BAIXA',top(rows,baixa,rowDate,p,20),p,ger);const gap=at1-meta*100,tn=top(rows,node,executed,p,1,isAT1)[0],tb=top(rows,baixa,rowDate,p,1)[0];$('insights').innerHTML=`<ul><li>AT1 ${current?'projetado':'fechado'}: <b>${fmtPct(at1)}</b>; meta: <b>${fmtPct(meta*100,1)}</b>; diferença: <b>${fmtPct(Math.abs(gap))} p.p. ${gap>0?'acima':'abaixo'}</b>.</li><li>G1 ${current?'projetado':'fechado'}: <b>${fmtPct(g1p)}</b>. Base cliente considerada: <b>${fmtInt(base)}</b>.</li><li>Período identificado no arquivo: <b>${String(p.m).padStart(2,'0')}/${p.y}</b>. ${current?`Projeção dividida até o dia <b>${p.last}</b> e expandida para <b>${p.days}</b> dias.`:'Mês tratado como fechamento real.'}</li><li>Top NODE: <b>${esc(tn?.label||'-')}</b> (${fmtInt(tn?.total||0)}). Top código de baixa: <b>${esc(tb?.label||'-')}</b> (${fmtInt(tb?.total||0)}).</li></ul>`}
function createClient(){
 if(!window.supabase || !window.supabase.createClient)throw new Error('Biblioteca Supabase não carregou. Atualize a página com Ctrl+F5.');
 return window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
}
function timeout(promise,ms,label){
 return Promise.race([
  promise,
  new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tempo excedido em '+label)),ms))
 ])
}
async function sessionInfo(){
 const result=await timeout(sb.auth.getSession(),8000,'validação da sessão');
 if(result.error)throw result.error;
 return (result.data&&result.data.session)||null;
}
async function listFolder(folder){
 const {data,error}=await timeout(sb.storage.from(BUCKET).list(folder,{limit:1000,offset:0,sortBy:{column:'name',order:'asc'}}),15000,'listagem da pasta '+(folder||'raiz'));
 if(error)throw error;
 return (data||[]).filter(x=>x.id!==null&&/\.xlsx?$/i.test(x.name)).map(x=>({
  name:x.name,path:folder?folder+'/'+x.name:x.name,updated:x.updated_at||x.created_at||'',folder:folder||'raiz'
 }));
}
function historyLabel(item){
 const m=item.name.match(HISTORY_RE);if(!m)return item.name;
 const names=['','JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
 return `${names[Number(m[2])]||m[2]}/${m[1]} — ${item.name}`;
}
async function refreshCatalog(loadCurrent=false){
 const selected=$('sourceSelect').value||state.file||CURRENT_PATH;
 setStatus('V5.0 · Consultando arquivos no bucket bases-tecnico...');
  let history=[], warnings=[];
 try{history=(await listFolder(HISTORY_FOLDER)).filter(x=>HISTORY_RE.test(x.name))}catch(e){warnings.push('histórico: '+humanError(e))}
 history.sort((a,b)=>b.name.localeCompare(a.name));
 state.lastCatalog=[{name:'at1.xlsx',path:CURRENT_PATH,folder:'raiz',kind:'current'},...history.map(x=>({...x,kind:'history'}))];
 const select=$('sourceSelect');select.innerHTML='';
 select.add(new Option('ATUAL — at1.xlsx',CURRENT_PATH));
 for(const item of history)select.add(new Option('HISTÓRICO — '+historyLabel(item),item.path));
 select.value=state.lastCatalog.some(x=>x.path===selected)?selected:CURRENT_PATH;
 const text=`Base atual localizada por caminho fixo; ${history.length} histórico(s) listado(s)`+(warnings.length?' · '+warnings.join(' | '):'');
 setStatus(text,warnings.length?'':'ok');
 if(loadCurrent)await loadPath(CURRENT_PATH,'current');
 return state.lastCatalog;
}
async function fetchWorkbook(path){
 const direct=await timeout(sb.storage.from(BUCKET).download(path,{}, {cache:'no-store'}),20000,'download de '+path);
 if(!direct.error&&direct.data)return await direct.data.arrayBuffer();
 const signed=await timeout(sb.storage.from(BUCKET).createSignedUrl(path,120),15000,'URL assinada de '+path);
 if(signed.error||!signed.data||!signed.data.signedUrl)throw direct.error||signed.error||new Error('Não foi possível acessar '+path);
 const sep=signed.data.signedUrl.indexOf('?')>=0?'&':'?';
 const response=await timeout(fetch(signed.data.signedUrl+sep+'_ts='+Date.now(),{cache:'no-store'}),20000,'transferência de '+path);
 if(!response.ok)throw new Error('HTTP '+response.status+' ao baixar '+path);
 return await response.arrayBuffer();
}
function findSheet(wb,names,fallbackIndex){
 const wanted=names.map(norm);
 const name=wb.SheetNames.find(n=>wanted.includes(norm(n)))||wb.SheetNames[fallbackIndex];
 return name||null;
}
async function loadPath(path,forcedKind){
 if(!path)return;
 $('loadBtn').disabled=true;$('refreshBtn').disabled=true;
 setStatus('Baixando '+path+'...');
 try{
    const buf=await fetchWorkbook(path);
  if(!buf?.byteLength)throw new Error('Arquivo vazio: '+path);
  setStatus('Lendo planilha e validando abas...');
  const wb=XLSX.read(buf,{type:'array',cellDates:true});
  const an=findSheet(wb,['ANALITICO','ANALÍTICO'],0);
  const bn=findSheet(wb,['BASE','BASE CLIENTE','BASE_CLIENTE'],1);
  if(!an)throw new Error('Aba ANALITICO não encontrada. Abas disponíveis: '+wb.SheetNames.join(', '));
  if(!bn)throw new Error('Aba BASE não encontrada. Abas disponíveis: '+wb.SheetNames.join(', '));
  const analitico=XLSX.utils.sheet_to_json(wb.Sheets[an],{defval:'',raw:true});
  const base=XLSX.utils.sheet_to_json(wb.Sheets[bn],{defval:'',raw:true});
  if(!analitico.length)throw new Error('A aba '+an+' não contém registros.');
  if(!base.length)throw new Error('A aba '+bn+' não contém registros de base cliente.');
  state.analitico=analitico;state.base=base;state.file=path;
  state.sourceKind=forcedKind||(path===CURRENT_PATH?'current':'history');
  state.city='BAGE';state.type='TOTAL';state.start='';state.end='';state.node='TODOS';state.baixa='TODOS';
  render();
  const now=new Date();$('updated').textContent='Carregado em '+now.toLocaleString('pt-BR');
  $('fileInfo').textContent=`Supabase: ${BUCKET}/${path} | Abas: ${an} e ${bn} | ${fmtInt(analitico.length)} registros`;
  setStatus('Base carregada com sucesso: '+path,'ok');
 }catch(e){
  console.error('AT1 load error',e);
  setStatus('Falha: '+humanError(e),'err');
 }finally{$('loadBtn').disabled=false;$('refreshBtn').disabled=false}
}
async function connect(){
 try{
  setStatus('V5.0 · Iniciando cliente Supabase...');
  sb=createClient();
  const session=await sessionInfo().catch(e=>{console.warn('Sessão não recuperada:',e);return null});
  setStatus(session?'V5.0 · Sessão localizada; consultando Storage...':'V5.0 · Sem sessão persistida; testando política disponível...');
  await refreshCatalog(true);
  if(refreshTimer)clearInterval(refreshTimer);
  refreshTimer=setInterval(async()=>{
   try{
    const viewingCurrent=state.sourceKind==='current';
    await refreshCatalog(false);
    if(viewingCurrent)await loadPath(CURRENT_PATH,'current');
   }catch(e){setStatus('Atualização automática: '+humanError(e),'err')}
  },REFRESH_MS);
 }catch(e){
  console.error('AT1 connect error',e);
  setStatus('Falha V5.0: '+humanError(e),'err');
 }
}
$('refreshBtn').onclick=async()=>{try{await refreshCatalog(false)}catch(e){setStatus('Falha: '+humanError(e),'err')}};
$('loadBtn').onclick=()=>loadPath($('sourceSelect').value,$('sourceSelect').value===CURRENT_PATH?'current':'history');
window.addEventListener('beforeunload',()=>refreshTimer&&clearInterval(refreshTimer));
$('fCity').onchange=e=>{state.city=e.target.value;state.node=state.baixa='TODOS';render()};$('fType').onchange=e=>{state.type=e.target.value;state.node=state.baixa='TODOS';render()};$('fStart').onchange=e=>{state.start=e.target.value;render()};$('fEnd').onchange=e=>{state.end=e.target.value;render()};$('fNode').onchange=e=>{state.node=e.target.value;state.baixa='TODOS';render()};$('fBaixa').onchange=e=>{state.baixa=e.target.value;render()};$('clearBtn').onclick=()=>{state.start=state.end='';state.node=state.baixa='TODOS';render()};$('pngBtn').onclick=async()=>{const c=await html2canvas($('dashboardRoot'),{scale:2,backgroundColor:'#f2f4f7'}),a=document.createElement('a');a.href=c.toDataURL('image/png');a.download=`dashboard_at1_${state.city}_${state.type}.png`;a.click()};
connect();

})();
