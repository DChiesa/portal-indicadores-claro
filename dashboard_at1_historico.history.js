(function(){
'use strict';
const MONTHS={1:'JANEIRO',2:'FEVEREIRO',3:'MARÇO',4:'ABRIL',5:'MAIO',6:'JUNHO',7:'JULHO',8:'AGOSTO',9:'SETEMBRO',10:'OUTUBRO',11:'NOVEMBRO',12:'DEZEMBRO'};
const known=['2026_01','2026_02','2026_03','2026_04','2026_05'];
function apply(){
 const select=document.getElementById('sourceSelect');
 if(!select)return false;
 const existing=new Set(Array.from(select.options).map(o=>o.value));
 for(const period of known){
  const [year,month]=period.split('.');
  const path=`historico/dashboard_at1_historico_${period}.xlsx`;
  if(existing.has(path))continue;
  const option=new Option(`HISTÓRICO — ${MONTHS[Number(month)]}/${year}`,path);
  select.add(option);
 }
 const status=document.getElementById('status');
 if(status&&!/Falha|Baixando|carregada com sucesso/i.test(status.textContent)){
  status.textContent='V5.3 · Base atual e históricos disponíveis no seletor.';
 }
 return true;
}
let attempts=0;
const timer=setInterval(()=>{attempts++;if(apply()||attempts>80)clearInterval(timer)},250);
window.addEventListener('pageshow',apply);
})();
