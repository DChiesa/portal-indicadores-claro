(function(){
'use strict';
const SUPABASE_URL='https://frxfoztyctrvsobbawmo.supabase.co';
const SUPABASE_KEY='sb_publishable_or6yc7T71Hpyajn9ctn1FA_BjsB6LhL';
const TABLE='diario_bordo_at1';
const LOCAL='at1_diario_bordo_cache_v4';
const TYPE_COLORS={
  'INTEMPERIE':'#38bdf8',
  'VENTOS E ENERGIA':'#86efac',
  'REDE':'#7e22ce',
  'EVENTO MASSIVO':'#111111',
  'OUTRO':'#0ea5e9'
};
let sb=null,events=[],online=false,allExpanded=false,showAllCities=false,editingId=null;
const $=id=>document.getElementById(id);
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const csv=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
const fmt=d=>{const [y,m,day]=String(d||'').split('-');return day&&m&&y?`${day}/${m}/${y}`:''};
const summary=v=>String(v||'').length>145?String(v).slice(0,145).trim()+'...':String(v||'');
const cityNow=()=>norm($('fCity')?.value||'BAGE');
const productNow=()=>norm($('fType')?.value||'TOTAL');
const setStatus=(text,kind='')=>{const e=$('diaryStatus');if(e){e.className='diary-status '+kind;e.textContent=text}};
function cacheLoad(){try{return JSON.parse(localStorage.getItem(LOCAL)||'[]')}catch{return[]}}
function cacheSave(){try{localStorage.setItem(LOCAL,JSON.stringify(events))}catch(_){}}
function currentPeriod(){const t=$('chartTitle')?.textContent||'',m=t.match(/(\d{2})\/(\d{4})/);return m?{month:+m[1],year:+m[2],days:new Date(+m[2],+m[1],0).getDate()}:null}
function inMonth(date,p){const [y,m]=String(date||'').split('-').map(Number);return y===p.year&&m===p.month}
function overlapsMonth(e,p){const first=`${p.year}-${String(p.month).padStart(2,'0')}-01`,last=`${p.year}-${String(p.month).padStart(2,'0')}-${String(p.days).padStart(2,'0')}`;return e.date<=last&&(e.endDate||e.date)>=first}
function periodEvents(allCities=false){const p=currentPeriod();if(!p)return[];return events.filter(e=>overlapsMonth(e,p)&&(allCities||e.city===cityNow()))}
function visibleEvents(){const product=productNow();return periodEvents(false).filter(e=>product==='TOTAL'||norm(e.product||'TOTAL')===product||norm(e.product||'TOTAL')==='TOTAL')}
function chartInfo(){const c=window.Chart?.getChart?.('chart');if(!c||!c.chartArea||!c.scales?.x)return null;return{chart:c,area:c.chartArea,x:c.scales.x}}
function renderMarkers(){
  const box=document.querySelector('.chartbox'),p=currentPeriod(),info=chartInfo();if(!box||!p||!info)return;
  let layer=box.querySelector('.diary-markers');if(!layer){layer=document.createElement('div');layer.className='diary-markers';box.appendChild(layer)}
  layer.style.inset='0';
  const rect=box.getBoundingClientRect(),canvasRect=info.chart.canvas.getBoundingClientRect();
  const sx=canvasRect.width/info.chart.width,sy=canvasRect.height/info.chart.height;
  const leftOffset=canvasRect.left-rect.left,topOffset=canvasRect.top-rect.top;
  const xPixel=day=>leftOffset+info.x.getPixelForValue(Math.max(0,Math.min(p.days-1,day-1)))*sx;
  const baseBottom=Math.max(0,rect.height-(topOffset+info.area.bottom*sy));
  const list=visibleEvents().sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title,'pt-BR'));
  const daySlots={};
  layer.innerHTML=list.map(e=>{
    const d=Math.max(1,Math.min(p.days,Number(String(e.date).slice(8,10))||1));
    const slot=daySlots[d]||0;daySlots[d]=slot+1;
    const stem=Math.max(72,110+slot*38);
    const x=xPixel(d);
    return `<div class="diary-marker" data-id="${esc(e.id)}" style="left:${x}px;bottom:${baseBottom}px;--event:${esc(e.color)};--stem:${stem}px" title="${esc(e.title)}"><span class="bubble">${esc(e.title)}</span><span class="stem"></span><span class="diary-anchor"></span></div>`;
  }).join('');
  layer.querySelectorAll('[data-id]').forEach(m=>m.onclick=()=>openEvent(m.dataset.id));
}
function scheduleMarkers(){requestAnimationFrame(()=>setTimeout(renderMarkers,60))}
function groupList(list){const groups={};list.forEach(e=>{(groups[e.city]??=[]).push(e)});return groups}
function eventHtml(e){const link=e.link?`<a class="diary-external" href="${esc(e.link)}" target="_blank" rel="noopener noreferrer">ABRIR LINK</a>`:'';return `<article class="diary-event" data-id="${esc(e.id)}"><div class="diary-event-top"><i class="diary-dot" style="background:${esc(e.color)}"></i><span class="diary-event-title">${esc(e.title)}</span><small>${esc(e.product||'TOTAL')} · ${esc(e.eventType||'OUTRO')}</small><button class="diary-link" type="button">${allExpanded?'RESUMIR':'VER TUDO'}</button><button class="diary-edit" type="button">EDITAR</button><button class="diary-delete" type="button">EXCLUIR</button></div><p class="diary-summary">${esc(summary(e.text))}</p><div class="diary-full">${esc(e.text)}${link}</div></article>`}
function render(){
  events.sort((a,b)=>a.city.localeCompare(b.city,'pt-BR')||a.date.localeCompare(b.date)||a.title.localeCompare(b.title,'pt-BR'));
  const list=periodEvents(showAllCities);
  const groups=groupList(list);
  $('diaryList').innerHTML=list.length?Object.entries(groups).map(([city,arr])=>`<section class="diary-city"><div class="diary-city-title">CIDADE: ${esc(city)}</div>${arr.map(e=>`<div class="diary-day"><div class="diary-day-title">${fmt(e.date)}${e.endDate!==e.date?' a '+fmt(e.endDate):''}</div>${eventHtml(e)}</div>`).join('')}</section>`).join(''):'<div class="diary-empty">Nenhum evento cadastrado para o mês selecionado.</div>';
  $('diaryList').querySelectorAll('.diary-event').forEach(a=>{if(allExpanded)a.classList.add('expanded');a.querySelector('.diary-link').onclick=()=>{a.classList.toggle('expanded');a.querySelector('.diary-link').textContent=a.classList.contains('expanded')?'RESUMIR':'VER TUDO'};a.querySelector('.diary-edit').onclick=()=>startEdit(a.dataset.id);a.querySelector('.diary-delete').onclick=()=>removeEvent(a.dataset.id)});
  if($('diaryScope'))$('diaryScope').textContent=showAllCities?'TODAS AS CIDADES DO MÊS':'CIDADE SELECIONADA';
  scheduleMarkers();
}
function openEvent(id){openModal();showAllCities=false;render();setTimeout(()=>{const a=document.querySelector('.diary-event[data-id="'+CSS.escape(id)+'"]');if(a){a.classList.add('expanded');a.scrollIntoView({behavior:'smooth',block:'center'});a.querySelector('.diary-link').textContent='RESUMIR'}},50)}
function resetForm(){editingId=null;$('diaryForm').reset();$('diaryColor').value=TYPE_COLORS.INTEMPERIE;$('diaryEventType').value='INTEMPERIE';$('diaryProduct').value=productNow()==='TOTAL'?'HFC':productNow();$('diarySubmit').textContent='ADICIONAR';$('diaryCancelEdit').hidden=true;setDefaultDates()}
function setDefaultDates(){const p=currentPeriod();if(!p)return;const day=Math.min(new Date().getDate(),p.days),d=`${p.year}-${String(p.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;if(!$('diaryDate').value)$('diaryDate').value=d;if(!$('diaryEndDate').value)$('diaryEndDate').value=$('diaryDate').value}
function startEdit(id){const e=events.find(x=>x.id===id);if(!e)return;editingId=id;$('diaryDate').value=e.date;$('diaryEndDate').value=e.endDate;$('diaryEvent').value=e.title;$('diaryText').value=e.text;$('diaryColor').value=e.color;$('diaryProduct').value=e.product||'TOTAL';$('diaryEventType').value=e.eventType||'OUTRO';$('diaryUrl').value=e.link||'';$('diarySubmit').textContent='SALVAR ALTERAÇÃO';$('diaryCancelEdit').hidden=false;$('diaryDate').scrollIntoView({behavior:'smooth',block:'center'})}
async function connect(){events=cacheLoad();render();let tries=0;while(!window.supabase?.createClient&&tries++<100)await new Promise(r=>setTimeout(r,100));if(!window.supabase?.createClient){setStatus('Biblioteca Supabase indisponível; exibindo cache local.','diary-sync-warn');return}try{sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});const {data,error}=await sb.from(TABLE).select('id,cidade,data,data_fim,titulo,conteudo,cor,produto,tipo_evento,link,created_at,updated_at').order('cidade').order('data');if(error)throw error;events=(data||[]).map(mapRow);online=true;cacheSave();render();setStatus('Sincronização online ativa.','diary-sync-ok')}catch(e){console.error('Diário:',e);setStatus('Execute o SQL de atualização do Diário de Bordo. Cache local mantido.','diary-sync-warn')}}
function mapRow(x){return{id:String(x.id),city:norm(x.cidade),date:x.data,endDate:x.data_fim||x.data,title:x.titulo,text:x.conteudo,color:x.cor||'#0ea5e9',product:norm(x.produto||'TOTAL'),eventType:norm(x.tipo_evento||'OUTRO'),link:x.link||'',createdAt:x.created_at||'',updatedAt:x.updated_at||''}}
async function saveEvent(e){if(!online){setStatus('Gravação indisponível até executar o SQL atualizado.','diary-sync-warn');return false}const payload={cidade:e.city,data:e.date,data_fim:e.endDate,titulo:e.title,conteudo:e.text,cor:e.color,produto:e.product,tipo_evento:e.eventType,link:e.link||null,updated_at:new Date().toISOString()};let result;if(editingId)result=await sb.from(TABLE).update(payload).eq('id',editingId).select('*').single();else result=await sb.from(TABLE).insert(payload).select('*').single();if(result.error){setStatus('Não foi possível salvar: '+result.error.message,'diary-sync-warn');return false}const saved=mapRow(result.data);if(editingId)events=events.map(x=>x.id===editingId?saved:x);else events.push(saved);cacheSave();resetForm();render();setStatus('Evento salvo em '+saved.city+' / '+saved.product+'.','diary-sync-ok');return true}
async function removeEvent(id){if(!confirm('Excluir este evento?')||!online)return;const {error}=await sb.from(TABLE).delete().eq('id',id);if(error){setStatus('Não foi possível excluir: '+error.message,'diary-sync-warn');return}events=events.filter(x=>x.id!==id);cacheSave();render()}
function exportEvents(allCities){const p=currentPeriod(),list=periodEvents(allCities);if(!p||!list.length){setStatus('Não há eventos para exportar neste período.','diary-sync-warn');return}const rows=[['Cidade','Data inicial','Data final','Produto','Tipo','Título','Descrição','Cor','Link','Criado em','Atualizado em'],...list.map(e=>[e.city,e.date,e.endDate,e.product,e.eventType,e.title,e.text,e.color,e.link,e.createdAt,e.updatedAt])];const blob=new Blob(['\ufeff'+rows.map(r=>r.map(csv).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`diario_bordo_${p.year}_${String(p.month).padStart(2,'0')}_${allCities?'todas_cidades':cityNow()}.csv`;a.click();URL.revokeObjectURL(a.href)}
function openModal(){showAllCities=false;$('diaryModal').classList.add('show');$('diaryModal').setAttribute('aria-hidden','false');resetForm();render()}
function closeModal(){$('diaryModal').classList.remove('show');$('diaryModal').setAttribute('aria-hidden','true')}
$('diaryOpen').onclick=openModal;$('diaryClose').onclick=closeModal;$('diaryModal').onclick=e=>{if(e.target===$('diaryModal'))closeModal()};
$('diaryEventType').onchange=e=>{$('diaryColor').value=TYPE_COLORS[e.target.value]||TYPE_COLORS.OUTRO};
$('diaryDate').onchange=()=>{if(!$('diaryEndDate').value||$('diaryEndDate').value<$('diaryDate').value)$('diaryEndDate').value=$('diaryDate').value};
$('diaryCancelEdit').onclick=resetForm;
$('diaryForm').onsubmit=async e=>{e.preventDefault();const start=$('diaryDate').value,end=$('diaryEndDate').value;if(end<start){setStatus('A data final não pode ser anterior à data inicial.','diary-sync-warn');return}let link=$('diaryUrl').value.trim();if(link&&!/^https?:\/\//i.test(link)){setStatus('O link deve começar com http:// ou https://.','diary-sync-warn');return}await saveEvent({city:cityNow(),date:start,endDate:end,title:$('diaryEvent').value.trim(),text:$('diaryText').value.trim(),color:$('diaryColor').value,product:norm($('diaryProduct').value),eventType:norm($('diaryEventType').value),link})};
$('diaryToggleAll').onclick=()=>{allExpanded=!allExpanded;$('diaryToggleAll').textContent=allExpanded?'RESUMIR TODOS':'EXPANDIR TODOS';render()};
$('diaryAllCities').onclick=()=>{showAllCities=!showAllCities;$('diaryAllCities').textContent=showAllCities?'VER CIDADE SELECIONADA':'TODOS OS EVENTOS DO MÊS';render()};
$('diaryExportCity').onclick=()=>exportEvents(false);$('diaryExportAll').onclick=()=>exportEvents(true);
new MutationObserver(()=>{render();scheduleMarkers()}).observe($('chartTitle'),{childList:true,subtree:true,characterData:true});
$('fCity')?.addEventListener('change',()=>setTimeout(render,0));$('fType')?.addEventListener('change',()=>setTimeout(render,0));window.addEventListener('resize',scheduleMarkers);
connect();
})();
