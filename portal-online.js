(function () {
  'use strict';

  const CERTIFICADO = 'Certificado de propriedade e criação: Demétrius Chiesa';
  const INTERVALO_PRESENCA = 45000;
  const INTERVALO_LISTA = 30000;
  let supabaseClient = null;
  let timerPresenca = null;
  let timerLista = null;

  function obterCliente() {
    if (supabaseClient) return supabaseClient;
    if (!window.supabase || !window.PORTAL_CONFIG) return null;
    supabaseClient = window.supabase.createClient(
      window.PORTAL_CONFIG.SUPABASE_URL,
      window.PORTAL_CONFIG.SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    );
    return supabaseClient;
  }

  function instalarEstilo() {
    if (document.getElementById('portalOnlineStyle')) return;
    const style = document.createElement('style');
    style.id = 'portalOnlineStyle';
    style.textContent = `
      .portal-property-footer{
        width:100%;padding:13px 18px 16px;text-align:center;
        color:#fff;background:#050b18dd;border-top:1px solid #ffffff2d;
        font:600 11px/1.45 "Segoe UI",Arial,sans-serif;
      }
      .portal-property-certificate{font-weight:900;letter-spacing:.15px}
      .portal-online-line{margin-top:5px;color:#d8e2ee;font-size:10px;font-weight:500}
      .portal-online-dot{display:inline-block;width:7px;height:7px;margin-right:5px;
        border-radius:50%;background:#35c66b;box-shadow:0 0 0 3px #35c66b25}
      .portal-online-names{word-break:break-word}
    `;
    document.head.appendChild(style);
  }

  function instalarRodape() {
    instalarEstilo();
    let footer = document.getElementById('portalPropertyFooter');
    if (footer) return footer;

    footer = document.createElement('footer');
    footer.id = 'portalPropertyFooter';
    footer.className = 'portal-property-footer';
    footer.innerHTML = `
      <div class="portal-property-certificate">${CERTIFICADO}</div>
      <div class="portal-online-line">
        <span class="portal-online-dot"></span>
        <span id="portalOnlineText">Conectados agora: verificando...</span>
      </div>
    `;

    const portal = document.getElementById('portal');
    if (portal) portal.appendChild(footer);
    else document.body.appendChild(footer);
    return footer;
  }

  async function registrarPresenca() {
    const client = obterCliente();
    if (!client) return;
    const { data } = await client.auth.getSession();
    if (!data.session) return;
    await client.rpc('registrar_presenca_portal', {
      p_pagina: location.pathname.split('/').pop() || 'index.html'
    });
  }

  async function atualizarLista() {
    const client = obterCliente();
    const alvo = document.getElementById('portalOnlineText');
    if (!client || !alvo) return;

    const { data: sessao } = await client.auth.getSession();
    if (!sessao.session) {
      alvo.textContent = 'Conectados agora: sessão não iniciada';
      return;
    }

    const { data, error } = await client.rpc('listar_usuarios_online_portal');
    if (error) {
      console.warn('Usuários conectados:', error);
      alvo.textContent = 'Conectados agora: indisponível';
      return;
    }

    const nomes = [...new Set((data || []).map(item => item.nome).filter(Boolean))];
    alvo.innerHTML = nomes.length
      ? `Conectados agora (${nomes.length}): <span class="portal-online-names">${nomes.map(escapar).join(' · ')}</span>`
      : 'Conectados agora: nenhum usuário ativo';
  }

  function escapar(valor) {
    return String(valor).replace(/[&<>"']/g, caractere => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[caractere]);
  }

  async function iniciar() {
    instalarRodape();
    await registrarPresenca();
    await atualizarLista();
    clearInterval(timerPresenca);
    clearInterval(timerLista);
    timerPresenca = setInterval(registrarPresenca, INTERVALO_PRESENCA);
    timerLista = setInterval(atualizarLista, INTERVALO_LISTA);
  }

  window.addEventListener('pageshow', iniciar);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      registrarPresenca();
      atualizarLista();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  } else {
    iniciar();
  }
})();

(function(){if(document.querySelector('script[src*="portal-admin-tools.js"]'))return;var s=document.createElement('script');s.src='./portal-admin-tools.js?v=20260814';s.defer=true;document.head.appendChild(s)})();
