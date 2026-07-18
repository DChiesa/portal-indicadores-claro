(function () {
  'use strict';

  const SUPABASE_URL = 'https://frxfoztyctrvsobbawmo.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_or6yc7T71Hpyajn9ctn1FA_BjsB6LhL';
  const BUCKET = 'bases-tecnico';
  const CURRENT_PATH = 'atual/tecnico_certificado_atual.xlsx';
  const HISTORY_FOLDER = 'historico';
  const HISTORY_PATTERN = /^tecnico_certificado_(\d{4})_(\d{2})\.xlsx$/i;
  const REFRESH_MS = 5 * 60 * 1000;
  const MONTHS = [
    '', 'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];

  let client = null;
  let loading = false;
  let selectedPath = CURRENT_PATH;

  function byId(id) {
    return document.getElementById(id);
  }

  function getClient() {
    if (client) return client;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Biblioteca Supabase não carregada.');
    }

    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
    return client;
  }

  function sendPortalStatus(type, text) {
    try {
      window.parent.postMessage({
        source: 'portal-panel',
        type,
        page: 'tecnico_certificado.html',
        text
      }, window.location.origin);
    } catch (_) {}
  }

  function setStatus(type, text) {
    const box = byId('tcStorageStatus');
    const label = byId('tcStorageStatusText');
    if (box) box.className = 'tc-storage-status ' + type;
    if (label) label.textContent = text;
    sendPortalStatus(type === 'error' ? 'error' : type === 'ok' ? 'ok' : 'loading', text);
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .tc-storage-tools{display:flex;align-items:flex-end;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:10px}
      .tc-storage-field{min-width:270px;flex:1 1 310px}
      .tc-storage-field label{display:block;margin:0 0 5px;color:#ffe4e6;font-size:10px;font-weight:900;text-transform:uppercase}
      .tc-storage-select{width:100%;min-width:270px;padding:10px 34px 10px 12px;border:0;border-radius:12px;background:#fff;color:#171717;font-weight:800;box-shadow:0 6px 16px #0002}
      .tc-storage-status{display:flex;align-items:center;gap:8px;margin-top:10px;padding:9px 11px;border:1px solid #ffffff44;border-radius:12px;background:#ffffff1f;color:#fff;font-size:12px}
      .tc-storage-status::before{content:'';width:9px;height:9px;border-radius:50%;background:#f59e0b;flex:0 0 auto}
      .tc-storage-status.ok::before{background:#22c55e}.tc-storage-status.error::before{background:#ef4444}
      .tc-storage-status.loading::before{background:#f59e0b;animation:tcPulse 1s infinite}
      @keyframes tcPulse{50%{opacity:.25}}
      @media(max-width:700px){.tc-storage-tools{align-items:stretch}.tc-storage-field{min-width:100%}.tc-storage-select{min-width:100%}.tc-storage-tools .btn{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function buildToolbar() {
    if (byId('tcBaseSelect')) return;

    const hero = document.querySelector('.hero');
    if (!hero) throw new Error('Cabeçalho .hero não encontrado no Técnico Certificado.');

    const tools = document.createElement('div');
    tools.className = 'tc-storage-tools';
    tools.innerHTML = `
      <div class="tc-storage-field">
        <label for="tcBaseSelect">Base disponível no Supabase</label>
        <select id="tcBaseSelect" class="tc-storage-select" aria-label="Selecionar base atual ou histórica">
          <option value="${CURRENT_PATH}">ATUAL — tecnico_certificado_atual.xlsx</option>
        </select>
      </div>
      <button class="btn" id="tcLoadBaseBtn" type="button">Carregar base</button>
      <button class="btn dark" id="tcRefreshListBtn" type="button">Atualizar lista</button>
    `;

    const status = document.createElement('div');
    status.id = 'tcStorageStatus';
    status.className = 'tc-storage-status loading';
    status.innerHTML = '<span id="tcStorageStatusText">Preparando conexão com o Supabase...</span>';

    hero.appendChild(tools);
    hero.appendChild(status);

    byId('tcBaseSelect').addEventListener('change', function (event) {
      selectedPath = event.target.value;
    });
    byId('tcLoadBaseBtn').addEventListener('click', function () {
      loadPath(byId('tcBaseSelect').value);
    });
    byId('tcRefreshListBtn').addEventListener('click', function () {
      refreshCatalog(true);
    });
  }

  function parseHistory(item) {
    if (!item || !item.name) return null;
    const match = item.name.match(HISTORY_PATTERN);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return null;

    return {
      path: HISTORY_FOLDER + '/' + item.name,
      year,
      month,
      label: 'HISTÓRICO — ' + MONTHS[month] + '/' + year
    };
  }

  async function listHistory() {
    const { data, error } = await getClient()
      .storage
      .from(BUCKET)
      .list(HISTORY_FOLDER, {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'desc' }
      });

    if (error) throw error;

    return (data || [])
      .map(parseHistory)
      .filter(Boolean)
      .sort((a, b) => b.year - a.year || b.month - a.month);
  }

  function applyCatalog(files) {
    const select = byId('tcBaseSelect');
    if (!select) return;

    const keep = select.value || selectedPath || CURRENT_PATH;
    select.innerHTML = '';
    select.add(new Option('ATUAL — tecnico_certificado_atual.xlsx', CURRENT_PATH));

    files.forEach(function (file) {
      select.add(new Option(file.label, file.path));
    });

    if (Array.from(select.options).some(option => option.value === keep)) {
      select.value = keep;
    } else {
      select.value = CURRENT_PATH;
      selectedPath = CURRENT_PATH;
    }
  }

  async function refreshCatalog(showStatus) {
    try {
      if (showStatus) setStatus('loading', 'Consultando históricos do Técnico Certificado...');
      const files = await listHistory();
      applyCatalog(files);
      setStatus('ok', 'Lista atualizada: ' + files.length + ' histórico(s) disponível(is).');
      return files;
    } catch (error) {
      console.error('Erro ao listar históricos do Técnico Certificado:', error);
      setStatus('error', 'Falha ao listar históricos: ' + (error.message || error));
      return [];
    }
  }

  function processWorkbookDirect(workbook, sourceLabel) {
    const analyticName = workbook.SheetNames.find(name => up(name) === 'ANALITICO') || workbook.SheetNames[0];
    if (!analyticName) throw new Error('O arquivo não possui planilhas.');

    const supportName = workbook.SheetNames.find(name => name !== analyticName);
    const rows = XLSX.utils.sheet_to_json(
      workbook.Sheets[analyticName],
      { defval: '' }
    ).map(normHead);

    state.apoio = new Map();

    if (supportName) {
      XLSX.utils.sheet_to_json(
        workbook.Sheets[supportName],
        { defval: '' }
      ).map(normHead).forEach(row => {
        const login = up(getVal(row, COLS.login));
        const name = norm(getVal(row, COLS.nome));
        if (login && name) state.apoio.set(login, name);
      });
    }

    state.raw = rows.map(row => {
      const login = up(getVal(row, COLS.login));
      const serviceType = norm(getVal(row, COLS.tipo)) || 'Não informado';
      const group = norm(getVal(row, COLS.grupo)) || 'Não informado';

      return {
        login,
        nome: norm(getVal(row, COLS.nome)) || state.apoio.get(login) || '',
        cidade: norm(getVal(row, COLS.cidade)) || 'Não informado',
        dataNota: dt(getVal(row, COLS.dataNota)),
        dataAgenda: dt(getVal(row, COLS.dataAgenda)),
        pontos: num(getVal(row, COLS.pontos)),
        revisita: num(getVal(row, COLS.revisita)),
        tec1Padrao: num(getVal(row, COLS.tec1Padrao)),
        tec1Total: num(getVal(row, COLS.tec1Total)),
        tipoServico: serviceType,
        grupo: group,
        grupoResumo: grupoRes(group, serviceType),
        contrato: norm(getVal(row, COLS.contrato)),
        baixa: norm(getVal(row, COLS.baixa)),
        time: norm(getVal(row, COLS.time)) || 'Não informado',
        horaInicio: fh(getVal(row, COLS.horaInicio)),
        horaFim: fh(getVal(row, COLS.horaFim)),
        janelaInicial: fh(getVal(row, COLS.janelaInicial)),
        janelaFinal: fh(getVal(row, COLS.janelaFinal)),
        retornoCred: num(getVal(row, COLS.retorno)),
        original: row
      };
    }).filter(row => row.login);

    periods();
    filters();
    applyAll();

    return state.raw.length;
  }

  async function downloadFresh(path) {
    const bucket = getClient().storage.from(BUCKET);
    const signed = await bucket.createSignedUrl(path, 120);

    if (!signed.error && signed.data && signed.data.signedUrl) {
      const response = await fetch(signed.data.signedUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('Download HTTP ' + response.status);
      return response.blob();
    }

    const downloaded = await bucket.download(path, {}, { cache: 'no-store' });
    if (downloaded.error) throw downloaded.error;
    if (!downloaded.data) throw new Error('O Supabase não retornou o arquivo.');
    return downloaded.data;
  }

  async function loadPath(path) {
    if (!path || loading) return;
    loading = true;

    const loadButton = byId('tcLoadBaseBtn');
    const refreshButton = byId('tcRefreshListBtn');
    if (loadButton) loadButton.disabled = true;
    if (refreshButton) refreshButton.disabled = true;

    try {
      selectedPath = path;
      setStatus('loading', 'Baixando ' + path + '...');

      const blob = await downloadFresh(path);
      const buffer = await blob.arrayBuffer();
      setStatus('loading', 'Processando indicadores de ' + path.split('/').pop() + '...');

      const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: true
      });

      const total = processWorkbookDirect(workbook, path);
      const fileName = path.split('/').pop();
      const now = new Date().toLocaleString('pt-BR');

      setStatus(
        'ok',
        total.toLocaleString('pt-BR') + ' registros · ' + fileName + ' · ' + now
      );
    } catch (error) {
      console.error('Erro ao carregar base do Técnico Certificado:', error);
      setStatus('error', 'Falha ao carregar ' + path + ': ' + (error.message || error));
    } finally {
      loading = false;
      if (loadButton) loadButton.disabled = false;
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  async function start() {
    injectStyles();
    buildToolbar();

    const sessionResult = await getClient().auth.getSession();
    if (sessionResult.error) {
      setStatus('error', 'Falha ao recuperar sessão: ' + sessionResult.error.message);
      return;
    }
    if (!sessionResult.data.session) {
      setStatus('error', 'Sessão do portal não encontrada. Volte ao portal e entre novamente.');
      return;
    }

    await refreshCatalog(false);
    await loadPath(CURRENT_PATH);

    setInterval(async function () {
      await refreshCatalog(false);
      if (selectedPath === CURRENT_PATH) {
        await loadPath(CURRENT_PATH);
      }
    }, REFRESH_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
