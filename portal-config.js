window.PORTAL_CONFIG = Object.freeze({
  SUPABASE_URL: "https://frxfoztyctrvsobbawmo.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_or6yc7T71Hpyajn9ctn1FA_BjsB6LhL",
  BUCKET: "bases-tecnico",
  AUTO_REFRESH_MS: 5 * 60 * 1000,
  FILES: Object.freeze({
    "dashboard_at1_historico.html": "atual/at1.xlsx",
    "analise_do_qualinet_atualizado.html": "atual/qualinet.txt",
    "dashboard_tnps_claro.html": "atual/tnps.xlsx",
    "painel_nr35_visao_tecnico.html": "atual/nr35.xlsx",
    "painel_certidao_atendimento.html": "atual/certidao_atendimento.xlsx",
    "painel_quebra_total.html": "atual/quebra_total.xlsx",
    "painel_recomendacoes.html": "atual/recomendacoes.xlsx",
    "relatorio_flag_24h_graf_diario.html": "atual/flag_24h.xlsx",
    "tecnico_certificado.html": "atual/tecnico_certificado_atual.xlsx"
  })
});

window.APP_CONFIG = Object.freeze({
  SUPABASE_URL: window.PORTAL_CONFIG.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: window.PORTAL_CONFIG.SUPABASE_PUBLISHABLE_KEY,
  BUCKET: window.PORTAL_CONFIG.BUCKET,
  ARQUIVO_ATUAL: "atual/tecnico_certificado_atual.xlsx",
  PASTA_HISTORICO: "historico"
});

/* Inicialização segura do histórico AT1.
   Evita editar novamente o HTML principal do dashboard. */
(function iniciarHistoricoAT1() {
  const pagina = decodeURIComponent(location.pathname.split('/').pop() || '').toLowerCase();
  if (pagina !== 'dashboard_at1_historico.html') return;

  function limparTextoInvalido() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const remover = [];
    while (walker.nextNode()) {
      const texto = walker.currentNode.nodeValue || '';
      if (texto.includes('at1-historico-supabase-fix.jsscript')) remover.push(walker.currentNode);
    }
    remover.forEach((node) => node.remove());
  }

  function carregarCorrecao() {
    limparTextoInvalido();
    if (document.querySelector('script[data-at1-historico-fix]')) return;

    const script = document.createElement('script');
    script.src = './at1-historico-supabase-fix.js?v=20260718-2';
    script.async = false;
    script.dataset.at1HistoricoFix = 'true';
    script.onerror = function () {
      console.error('Não foi possível carregar at1-historico-supabase-fix.js. Verifique se o arquivo está na raiz do repositório.');
    };
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', carregarCorrecao, { once: true });
  } else {
    carregarCorrecao();
  }
})();
