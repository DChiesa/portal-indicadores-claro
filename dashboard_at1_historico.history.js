(function(){
'use strict';

const MONTHS={
  1:'JANEIRO',2:'FEVEREIRO',3:'MARÇO',4:'ABRIL',5:'MAIO',6:'JUNHO',
  7:'JULHO',8:'AGOSTO',9:'SETEMBRO',10:'OUTUBRO',11:'NOVEMBRO',12:'DEZEMBRO'
};

// Nomes exatos existentes no Supabase: AAAA_MM (com underline).
const KNOWN_FILES=[
  'dashboard_at1_historico_2026_01.xlsx',
  'dashboard_at1_historico_2026_02.xlsx',
  'dashboard_at1_historico_2026_03.xlsx',
  'dashboard_at1_historico_2026_04.xlsx',
  'dashboard_at1_historico_2026_05.xlsx'
];

let applying=false;

function labelFor(fileName){
  const match=fileName.match(/_(\d{4})_(\d{1,2})\.xlsx$/i);
  if(!match)return 'HISTÓRICO — '+fileName;
  const year=match[1];
  const month=Number(match[2]);
  return `HISTÓRICO — ${MONTHS[month]||String(month).padStart(2,'0')}/${year}`;
}

function applyHistoryOptions(){
  const select=document.getElementById('sourceSelect');
  if(!select||applying)return false;

  applying=true;
  try{
    const selected=select.value;
    const existing=new Set(Array.from(select.options).map(option=>option.value));

    for(const fileName of KNOWN_FILES){
      const path='historico/'+fileName;
      if(existing.has(path))continue;
      select.add(new Option(labelFor(fileName),path));
    }

    if(selected&&Array.from(select.options).some(option=>option.value===selected)){
      select.value=selected;
    }
    return true;
  }finally{
    applying=false;
  }
}

function installObserver(){
  const select=document.getElementById('sourceSelect');
  if(!select)return false;

  applyHistoryOptions();

  // A aplicação principal recria o conteúdo do select após consultar o Supabase.
  // O observer recoloca os históricos sempre que isso acontecer.
  const observer=new MutationObserver(function(){
    setTimeout(applyHistoryOptions,0);
  });
  observer.observe(select,{childList:true});

  document.getElementById('refreshBtn')?.addEventListener('click',function(){
    setTimeout(applyHistoryOptions,800);
    setTimeout(applyHistoryOptions,1800);
  });

  const status=document.getElementById('status');
  if(status&&!/Falha|Baixando/i.test(status.textContent)){
    status.textContent='V5.4 · Base atual e 5 históricos disponíveis.';
  }
  return true;
}

let attempts=0;
const timer=setInterval(function(){
  attempts++;
  if(installObserver()||attempts>=80)clearInterval(timer);
},250);

window.addEventListener('pageshow',function(){
  setTimeout(applyHistoryOptions,0);
});
})();
