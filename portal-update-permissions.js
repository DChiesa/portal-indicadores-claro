/* =============================================================
   PORTAL CLARO - PATCH SEGURO DO CARD CENTRAL DE ATUALIZACAO
   Objetivo: mostrar o card de atualizar para quem tem permissao,
   sem mexer nos relatorios, cores ou estrutura existente.
   Como usar: incluir antes de </body> do index.html:
   <script src="portal-update-permissions.js"></script>
   ============================================================= */
(function(){
  'use strict';

  const CONFIG = {
    // coloque aqui exatamente o caminho da pagina de atualizacao existente no seu portal
    updatePageUrl: 'central-atualizacao.html',
    demetriusLogins: ['demetrius377', 'demetrius377@claro.com.br', 'demetrius377@gmail.com'],
    adminCategoryTitle: 'Administração',
    cardTitle: 'ATUALIZAR',
    cardName: 'Central de Atualização',
    cardSubtitle: 'Bases atuais e históricas'
  };

  function norm(v){ return String(v || '').trim().toLowerCase(); }
  function isDemetrius(email){
    const e = norm(email);
    return CONFIG.demetriusLogins.some(x => e === norm(x) || e.includes(norm(x)));
  }

  async function getCurrentUserEmail(){
    try {
      if (window.supabase && window.supabase.auth) {
        const res = await window.supabase.auth.getUser();
        const email = res && res.data && res.data.user && res.data.user.email;
        if (email) return email;
      }
    } catch(e) { console.warn('[Portal] auth.getUser falhou:', e); }

    // Compatibilidade com portais que guardam usuario no localStorage/sessionStorage
    const keys = ['portal_user','usuarioLogado','currentUser','user','email','sb-user'];
    for (const store of [localStorage, sessionStorage]) {
      for (const k of keys) {
        try {
          const raw = store.getItem(k);
          if (!raw) continue;
          if (raw.includes('@')) {
            try {
              const obj = JSON.parse(raw);
              if (obj.email) return obj.email;
              if (obj.user && obj.user.email) return obj.user.email;
            } catch(_){ return raw; }
          }
        } catch(_) {}
      }
    }
    const txt = document.body ? document.body.innerText : '';
    const m = txt.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return m ? m[0] : '';
  }

  async function canSeeUpdateCenter(email){
    if (isDemetrius(email)) return true;
    if (!window.supabase || !window.supabase.rpc) {
      console.warn('[Portal] Supabase global nao encontrado. Card de atualizacao nao sera exibido.');
      return false;
    }
    try {
      const { data, error } = await window.supabase.rpc('portal_can_see_update_center', { p_email: email });
      if (error) {
        console.warn('[Portal] Erro ao consultar permissao de atualizacao:', error);
        return false;
      }
      return data === true;
    } catch(e) {
      console.warn('[Portal] Falha ao consultar permissao:', e);
      return false;
    }
  }

  function findMainContainer(){
    return document.querySelector('#cardsContainer') ||
           document.querySelector('#reportsContainer') ||
           document.querySelector('.cards-grid') ||
           document.querySelector('main') ||
           document.body;
  }

  function cardAlreadyExists(){
    const all = Array.from(document.querySelectorAll('a,button,div,section,article'));
    return all.some(el => norm(el.textContent).includes('central de atualização') || norm(el.textContent).includes('central de atualizacao'));
  }

  function createCard(){
    const a = document.createElement('a');
    a.href = CONFIG.updatePageUrl;
    a.className = 'portal-card portal-card-update admin-card update-card';
    a.setAttribute('data-card-update-center','true');
    a.style.textDecoration = 'none';
    a.innerHTML = `
      <div class="card-top" style="background:#17466f;color:#fff;min-height:96px;display:flex;align-items:center;justify-content:center;border-radius:18px 18px 0 0;position:relative;">
        <div style="font-weight:900;font-size:22px;letter-spacing:.5px;">${CONFIG.cardTitle}</div>
        <div style="position:absolute;right:10px;top:10px;background:#fff;color:#17466f;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:900;">›</div>
      </div>
      <div class="card-bottom" style="background:#fff;color:#111;padding:18px 20px;border-radius:0 0 18px 18px;display:flex;gap:12px;align-items:center;">
        <div style="width:42px;height:42px;border-radius:12px;background:#edf3fb;display:flex;align-items:center;justify-content:center;font-size:22px;">🔐</div>
        <div>
          <div style="font-weight:800;font-size:14px;">${CONFIG.cardName}</div>
          <div style="font-size:12px;color:#667085;">${CONFIG.cardSubtitle}</div>
        </div>
      </div>`;
    return a;
  }

  function injectCard(){
    if (cardAlreadyExists()) return;
    const container = findMainContainer();

    // tenta localizar uma grade/admin existente sem quebrar estrutura atual
    const adminSection = Array.from(document.querySelectorAll('section,div'))
      .find(el => norm(el.textContent).includes('administração') || norm(el.textContent).includes('administracao'));

    const card = createCard();
    if (adminSection) {
      const grid = adminSection.querySelector('.cards-grid,.grid,[class*=card]') || adminSection;
      grid.appendChild(card);
      return;
    }

    const section = document.createElement('section');
    section.setAttribute('data-update-section','true');
    section.style.margin = '18px 0';
    section.innerHTML = `<div style="color:#fff;font-weight:800;margin:0 0 10px 0;">${CONFIG.adminCategoryTitle} <span style="font-size:12px;opacity:.85;">1 módulo</span></div>`;
    const grid = document.createElement('div');
    grid.className = 'cards-grid update-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fit,minmax(230px,1fr))';
    grid.style.gap = '16px';
    grid.appendChild(card);
    section.appendChild(grid);
    container.appendChild(section);
  }

  async function start(){
    const email = await getCurrentUserEmail();
    const allowed = await canSeeUpdateCenter(email);
    if (allowed) injectCard();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
