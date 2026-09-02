(function () {
  'use strict';
  const CERTIFICADO = 'Certificado de propriedade e criação: Demétrius Chiesa';
  const INTERVALO_PRESENCA = 45000;
  const INTERVALO_LISTA = 30000;
  let supabaseClient = null;
  let timerPresenca = null;
  let timerLista = null;
  let iniciado = false;
  let presencaEmCurso = false;
  let listaEmCurso = false;

  function obterCliente() {
    if (supabaseClient) return supabaseClient;
    try { supabaseClient = window.getPortalSupabase(); return supabaseClient; }
    catch (e) { console.warn('Cliente Supabase:', e); return null; }
  }
  function instalarEstilo() {
    if (document.getElementById('portalOnlineStyle')) return;
    const style = document.createElement('style'); style.id = 'portalOnlineStyle';
    style.textContent = '.portal-property-footer{width:100%;padding:13px 18px 16px;text-align:center;color:#fff;background:#050b18dd;border-top:1px solid #ffffff2d;font:600 11px/1.45 "Segoe UI",Arial,sans-serif}.portal-property-certificate{font-weight:900;letter-spacing:.15px}.portal-online-line{margin-top:5px;color:#d8e2ee;font-size:10px;font-weight:500}.portal-online-dot{display:inline-block;width:7px;height:7px;margin-right:5px;border-radius:50%;background:#35c66b;box-shadow:0 0 0 3px #35c66b25}.portal-online-names{word-break:break-word}';
    document.head.appendChild(style);
  }
  function instalarRodape() {
    instalarEstilo(); let footer = document.getElementById('portalPropertyFooter'); if (footer) return footer;
    footer = document.createElement('footer'); footer.id = 'portalPropertyFooter'; footer.className = 'portal-property-footer';
    footer.innerHTML = '<div class="portal-property-certificate">'+CERTIFICADO+'</div><div id="portalOnlineText" class="portal-online-line"><span class="portal-online-dot"></span>Conectados agora: verificando...</div>';
    const portal = document.getElementById('portal'); if (portal) portal.appendChild(footer); else document.body.appendChild(footer); return footer;
  }
  function erroDePool(error) { return /504|gateway|timeout|timed out|connection pool|PGRST003/i.test(String(error?.message||error?.code||error||'')); }
  async function registrarPresenca() {
    if (presencaEmCurso || document.getElementById('portal')?.classList.contains('hidden')) return;
    const client = obterCliente(); if (!client) return; presencaEmCurso = true;
    try { const {data}=await client.auth.getSession(); if (!data.session) return; const r=await client.rpc('registrar_presenca_portal',{p_pagina:location.pathname.split('/').pop()||'index.html'}); if(r.error&&!erroDePool(r.error))console.warn('Presença:',r.error); }
    finally { presencaEmCurso=false; }
  }
  async function atualizarLista() {
    if (listaEmCurso || document.getElementById('portal')?.classList.contains('hidden')) return;
    const client=obterCliente(), alvo=document.getElementById('portalOnlineText'); if(!client||!alvo)return; listaEmCurso=true;
    try { const {data:sessao}=await client.auth.getSession(); if(!sessao.session){alvo.textContent='Conectados agora: sessão não iniciada';return;} const {data,error}=await client.rpc('listar_usuarios_online_portal'); if(error){if(!erroDePool(error))console.warn('Usuários conectados:',error);alvo.textContent='Conectados agora: indisponível';return;} const nomes=[...new Set((data||[]).map(x=>x.nome).filter(Boolean))]; alvo.textContent=nomes.length?'Conectados agora ('+nomes.length+'): '+nomes.join(' · '):'Conectados agora: nenhum usuário ativo'; }
    finally { listaEmCurso=false; }
  }
  async function iniciar() {
    if(iniciado)return; iniciado=true; instalarRodape(); await registrarPresenca(); await atualizarLista();
    timerPresenca=setInterval(registrarPresenca,INTERVALO_PRESENCA); timerLista=setInterval(atualizarLista,INTERVALO_LISTA);
  }
  window.addEventListener('portal:ready', iniciar);
  if (!document.getElementById('portal')?.classList.contains('hidden')) iniciar();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&iniciado){registrarPresenca();atualizarLista();}});
})();
(function(){if(document.querySelector('script[src*="portal-admin-tools.js"]'))return;var s=document.createElement('script');s.src='./portal-admin-tools.js?v=20260814';s.defer=true;document.head.appendChild(s)})();

