(function(){
  'use strict';
  const wanted=new URLSearchParams(location.search).get('abrir');
  if(wanted!=='resultado_tecnico')return;
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  let attempts=0;
  const timer=setInterval(function(){
    attempts++;
    const links=[...document.querySelectorAll('a[href],button,[data-file],[data-url]')];
    const target=links.find(el=>{
      const hay=normalize([el.textContent,el.getAttribute('href'),el.dataset.file,el.dataset.url].join(' '));
      return hay.includes('resultado tecnic')||hay.includes('resultado_tecnic');
    });
    if(target){clearInterval(timer);history.replaceState({},'',location.pathname);target.click();return}
    if(attempts>=120){clearInterval(timer);console.error('Atalho: card Resultado Tecnicos nao localizado.')}
  },250);
})();
