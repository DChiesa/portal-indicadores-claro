(function(){
  'use strict';

  const C = window.PORTAL_CONFIG;
  if (!C) return console.error('portal-config.js nao carregado');

  const page = decodeURIComponent(location.pathname.split('/').pop() || '').toLowerCase();
  const found = Object.entries(C.FILES || {}).find(([name]) => String(name).toLowerCase() === page);
  if (!found) {
    console.warn('Nenhuma base configurada para esta pagina:', page);
    return;
  }

  const path = found[1];
  let client = null;
  let busy = false;
  let timer = null;

  function q(s){ return document.querySelector(s); }
  function send(type,text){
    const badge = document.getElementById('portalAutoStatus');
    if (badge) {
      badge.className = 'portal-auto-status ' + type;
      const textEl = badge.querySelector('span:last-child');
      if (textEl) textEl.textContent = text;
    }
    if (parent !== window) parent.postMessage({source:'portal-panel',type,page,text}, location.origin);
  }
  function ui(){
    if (document.getElementById('portalPanelBar')) return;
    const bar = document.createElement('div');
    bar.id = 'portalPanelBar';
    bar.className = 'portal-panel-bar';
    bar.innerHTML = '<button id="portalBack" type="button">\u2190 Portal</button>' +
      '<strong>Atualizacao automatica</strong>' +
      '<small>' + path.replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}) + '</small>' +
      '<span id="portalAutoStatus" class="portal-auto-status loading"><span>\u25cf</span><span>Preparando...</span></span>' +
      '<button id="portalRefresh" type="button">Atualizar agora</button>';
    document.body.prepend(bar);
    document.getElementById('portalBack').onclick = function(){
      if (parent === window) location.href = 'index.html';
      else parent.postMessage({source:'portal-panel',type:'home'}, location.origin);
    };
    document.getElementById('portalRefresh').onclick = function(){ load(true); };
  }
  function input(){ return q('input[type="file"]'); }
  function fileType(name){
    const e = String(name).split('.').pop().toLowerCase();
    if (e === 'xlsx' || e === 'xls' || e === 'xlsm') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (e === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (e === 'csv') return 'text/csv';
    return 'text/plain';
  }
  function basename(p){ return String(p).split('/').pop() || 'base'; }
  function supa(){
    if (client) return client;
    if (!window.supabase) throw Error('Biblioteca Supabase nao carregada');
    client = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_PUBLISHABLE_KEY, {
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    return client;
  }
  async function fetchTimeout(url,ms){
    const ac = new AbortController();
    const t = setTimeout(function(){ ac.abort(); }, ms || 60000);
    try { return await fetch(url,{cache:'no-store',signal:ac.signal}); }
    finally { clearTimeout(t); }
  }
  async function objectUrl(){
    const storage = supa().storage.from(C.BUCKET);
    const signed = await storage.createSignedUrl(path,120);
    if (!signed.error && signed.data && signed.data.signedUrl) return signed.data.signedUrl;

    const pub = storage.getPublicUrl(path);
    const publicUrl = pub && pub.data && pub.data.publicUrl;
    if (publicUrl) return publicUrl + (publicUrl.includes('?') ? '&' : '?') + 'v=' + Date.now();

    throw Error('Nao foi possivel gerar URL para ' + path + (signed.error ? ': ' + signed.error.message : ''));
  }
  async function load(manual){
    if (busy) return;
    busy = true;
    try {
      send('loading','Autorizando...');
      const sessionResult = await supa().auth.getSession();
      if (sessionResult.error) throw sessionResult.error;
      if (!sessionResult.data.session) throw Error('Sessao ausente. Entre pelo portal principal.');

      send('loading','Baixando base...');
      const url = await objectUrl();
      const res = await fetchTimeout(url,60000);
      if (!res.ok) throw Error('Falha HTTP ' + res.status + ' ao baixar ' + path);

      const buf = await res.arrayBuffer();
      if (!buf.byteLength) throw Error('Arquivo vazio: ' + path);
      const inp = input();
      if (!inp) throw Error('Campo de importacao nao encontrado neste painel');

      const f = new File([buf],basename(path),{type:fileType(path),lastModified:Date.now()});
      const dt = new DataTransfer();
      dt.items.add(f);
      inp.files = dt.files;
      send('loading','Processando no painel...');
      inp.dispatchEvent(new Event('change',{bubbles:true}));
      setTimeout(function(){
        send('ok','Atualizado ' + new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));
      },1200);
    } catch(e) {
      console.error('Falha no carregamento automatico', {page:page,bucket:C.BUCKET,path:path,error:e});
      send('error', e && e.name === 'AbortError' ? 'Tempo excedido' : (e.message || String(e)));
    } finally {
      busy = false;
    }
  }
  function start(){
    ui();
    setTimeout(function(){ load(false); },300);
    timer = setInterval(function(){ load(false); }, C.AUTO_REFRESH_MS || 300000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start);
  else start();
  window.addEventListener('beforeunload',function(){ if(timer) clearInterval(timer); });
})();
