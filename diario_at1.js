(function(){
'use strict';
const BUILD='6000';
const $=id=>document.getElementById(id);
function status(text,kind=''){const e=$('repoStatus');if(e){e.textContent=text;e.className='repoStatus '+kind}}
function loadOne(primary,fallback,label,test){if(test&&test())return Promise.resolve();return new Promise((resolve,reject)=>{let done=false;const finish=(ok,v)=>{if(done)return;done=true;clearTimeout(timer);ok?resolve(v):reject(v)},timer=setTimeout(()=>finish(false,new Error('Tempo excedido ao carregar '+label)),20000);function attempt(url,canFallback){status('Carregando '+label+'...');const script=document.createElement('script');script.src=url;script.async=false;script.onload=()=>finish(true);script.onerror=()=>{script.remove();if(canFallback&&fallback)attempt(fallback,false);else finish(false,new Error('Não foi possível carregar '+label))};document.head.appendChild(script)}attempt(primary,true)})}
async function start(){try{status('Preparando bibliotecas...');await Promise.all([
loadOne('https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js','https://unpkg.com/chart.js@3.9.1/dist/chart.min.js','Chart.js',()=>!!window.Chart),
loadOne('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js','Excel',()=>!!window.XLSX)
]);await loadOne('./diario_at1_v6_candidata.app.js?v='+BUILD,null,'aplicação Diário AT1',()=>false)}catch(e){status('Falha na inicialização: '+e.message,'err')}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
