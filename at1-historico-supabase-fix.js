/* AT1 Historico - carregamento mensal pelo Supabase Storage */
(function () {
  'use strict';

  const HISTORICO_DIR = 'historico';
  const ATUAL_PATH = 'atual/at1.xlsx';
  const PREFIX_RE = /^dashboard_at1_historico_(\d{4})\.(\d{2})\.xlsx$/i;
  const MONTHS = {
    JANEIRO: 1, FEVEREIRO: 2, MARCO: 3, 'MARÇO': 3,
    ABRIL: 4, MAIO: 5, JUNHO: 6, JULHO: 7,
    AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10,
    NOVEMBRO: 11, DEZEMBRO: 12
  };
  const MONTH_NAMES = [
    '', 'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];

  let client = null;
  let catalog = [];
  let loading = false;
  let historicalActive = null;
  let observerTimer = null;

  const $ = (id) => document.getElementById(id);
  const normalize = (value) => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toUpperCase();

  function config() {
    const c = window.PORTAL_CONFIG || window.APP_CONFIG;
    if (!c) throw new Error('portal-config.js não foi carregado.');
    return {
      url: c.SUPABASE_URL,
      key: c.SUPABASE_PUBLISHABLE_KEY,
      bucket: c.BUCKET || 'bases-tecnico'
    };
  }

  function supa() {
    if (client) return client;
    if (!window.supabase) throw new Error('Biblioteca Supabase não carregada.');
    const c = config();
    client = window.supabase.createClient(c.url, c.key, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    return client;
  }

  function setStatus(text, type = 'loading') {
    const line = $('statusLine');
    if (line) line.textContent = text;
    const badge = $('portalAutoStatus');
    if (badge) {
      badge.className = 'portal-auto-status ' + type;
      const label = badge.querySelector('span:last-child');
      if (label) label.textContent = text;
    }
    try {
      parent.postMessage({ source: 'portal-panel', type, page: 'dashboard_at1_historico.html', text }, location.origin);
    } catch (_) {}
  }

  function selectedMonth() {
    const select = $('monthSelect');
    if (!select) return null;
    const raw = normalize(select.value || select.selectedOptions?.[0]?.textContent);
    const key = Object.keys(MONTHS).find((name) => normalize(name) === raw || raw.includes(normalize(name)));
    return key ? MONTHS[key] : null;
  }

  async function ensureSession() {
    const { data, error } = await supa().auth.getSession();
    if (error) throw error;
    if (!data?.session) throw new Error('Sessão ausente. Entre novamente pelo portal.');
  }

  async function loadCatalog() {
    await ensureSession();
    const c = config();
    const { data, error } = await supa().storage.from(c.bucket).list(HISTORICO_DIR, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    });
    if (error) throw error;
    catalog = (data || []).map((item) => {
      const match = String(item.name || '').match(PREFIX_RE);
      return match ? {
        name: item.name,
        path: HISTORICO_DIR + '/' + item.name,
        year: Number(match[1]),
        month: Number(match[2]),
        updatedAt: item.updated_at || item.created_at || ''
      } : null;
    }).filter(Boolean);
    return catalog;
  }

  function findHistorical(month) {
    return catalog
      .filter((item) => item.month === month)
      .sort((a, b) => b.year - a.year)[0] || null;
  }

  async function fetchArrayBuffer(path) {
    const c = config();
    const { data, error } = await supa().storage.from(c.bucket).createSignedUrl(path, 120);
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('URL temporária não foi gerada para ' + path + '.');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(data.signedUrl, {
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Falha HTTP ' + response.status + ' ao baixar ' + path + '.');
      const buffer = await response.arrayBuffer();
      if (!buffer.byteLength) throw new Error('O arquivo ' + path + ' está vazio.');
      return buffer;
    } finally {
      clearTimeout(timeout);
    }
  }

  function injectIntoDashboard(buffer, month, sourcePath) {
    const input = $('excelInput');
    if (!input) throw new Error('Campo excelInput não encontrado no painel AT1.');

    // O nome amigável preserva a lógica original que reconhece AT1 JANEIRO.xlsx etc.
    const friendlyName = 'AT1 ' + MONTH_NAMES[month] + '.xlsx';
    const file = new File([buffer], friendlyName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      lastModified: Date.now()
    });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dataset.supabaseSource = sourcePath;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function loadSelectedMonth(options = {}) {
    if (loading) return;
    loading = true;
    try {
      const month = selectedMonth();
      if (!month) throw new Error('Selecione um mês válido.');

      setStatus('Consultando histórico do AT1...', 'loading');
      await loadCatalog();
      const historical = findHistorical(month);
      const now = new Date();
      const isCalendarCurrentMonth = month === now.getMonth() + 1;

      let path;
      let label;
      if (historical) {
        path = historical.path;
        label = MONTH_NAMES[month] + '/' + historical.year;
        historicalActive = { month, path, label };
      } else if (isCalendarCurrentMonth) {
        path = ATUAL_PATH;
        label = MONTH_NAMES[month] + ' — base atual';
        historicalActive = null;
      } else {
        throw new Error(
          'Arquivo não encontrado em histórico para ' + MONTH_NAMES[month] +
          '. Esperado: dashboard_at1_historico_AAAA.' + String(month).padStart(2, '0') + '.xlsx'
        );
      }

      setStatus('Baixando ' + label + '...', 'loading');
      const buffer = await fetchArrayBuffer(path);
      setStatus('Processando ' + label + '...', 'loading');
      injectIntoDashboard(buffer, month, path);

      setTimeout(() => {
        setStatus('Histórico carregado: ' + label + ' · ' + (buffer.byteLength / 1024 / 1024).toFixed(2).replace('.', ',') + ' MB', 'ok');
      }, 1200);
    } catch (error) {
      console.error('AT1 histórico:', error);
      const message = error?.name === 'AbortError' ? 'Tempo excedido ao baixar o histórico.' : (error?.message || String(error));
      setStatus('Erro no histórico: ' + message, 'error');
    } finally {
      loading = false;
    }
  }

  function markAvailableMonths() {
    const select = $('monthSelect');
    if (!select) return;
    Array.from(select.options).forEach((option) => {
      const raw = normalize(option.value || option.textContent);
      const key = Object.keys(MONTHS).find((name) => raw.includes(normalize(name)));
      const month = key ? MONTHS[key] : null;
      if (!month) return;
      const item = findHistorical(month);
      const baseText = MONTH_NAMES[month];
      option.textContent = item ? baseText + ' · histórico ' + item.year : baseText;
      option.dataset.historical = item ? item.path : '';
    });
  }

  function protectHistoricalFromAutoRefresh() {
    const badge = $('portalAutoStatus');
    if (!badge || !window.MutationObserver) return;
    const observer = new MutationObserver(() => {
      if (!historicalActive || loading) return;
      const text = badge.textContent || '';
      // O auto-loader geral acabou de recolocar atual/at1.xlsx. Reaplica o mês histórico selecionado.
      if (/Atualizado\s+\d{1,2}:\d{2}/i.test(text)) {
        clearTimeout(observerTimer);
        observerTimer = setTimeout(() => {
          if (historicalActive && selectedMonth() === historicalActive.month) loadSelectedMonth({ restore: true });
        }, 1400);
      }
    });
    observer.observe(badge, { childList: true, subtree: true, characterData: true });
  }

  async function start() {
    const button = $('loadMonth');
    const select = $('monthSelect');
    if (!button || !select) {
      console.error('Controles monthSelect/loadMonth não encontrados.');
      return;
    }

    // Captura antes do manipulador antigo, que tentava usar apenas uma pasta local.
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      loadSelectedMonth();
    }, true);

    try {
      await loadCatalog();
      markAvailableMonths();
      const available = catalog.map((item) => MONTH_NAMES[item.month] + '/' + item.year).join(', ');
      setStatus(available ? 'Históricos disponíveis: ' + available : 'Nenhum histórico AT1 encontrado.', available ? 'ok' : 'error');
    } catch (error) {
      console.error(error);
      setStatus('Não foi possível consultar histórico: ' + (error.message || error), 'error');
    }

    protectHistoricalFromAutoRefresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
