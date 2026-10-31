(function(){
'use strict';
if(window.__CLARO_REPORT_HEADER__)return;window.__CLARO_REPORT_HEADER__=true;
const OWNER='Demétrius Chiesa',PORTAL_FILE='index.html',FIXED_TITLE='PORTAL DE INDICADORES';
const CATS={manutencao:'Manutenção',instalacao:'Instalação',rede:'Rede',headend:'Headend',backbone:'Backbone',filtro:'Filtro',tecnico:'Técnico'};
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const esc=s=>clean(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentFile=()=>decodeURIComponent(location.pathname.split('/').pop()||'');
function portalUrl(){return new URL(PORTAL_FILE,location.href).href;}
function versionedPortalUrl(){const u=new URL(PORTAL_FILE,location.href);u.searchParams.set('portal_build','20261031-v4');return u.href;}
function goHome(){try{if(window.parent&&window.parent!==window){window.parent.postMessage({type:'PORTAL_GO_HOME',build:'20261031-v4'},location.origin==='null'?'*':location.origin);return;}}catch(_){}try{window.top.location.replace(versionedPortalUrl());}catch(_){location.replace(versionedPortalUrl());}}
function removeLegacy(){
 const selectors=['#clvHeader','#bannerClaroPadrao','.banner-claro-padrao','.banner-claro-acoes','#headerPadraoClaro','.header-padrao-claro','.portal-report-header','.report-standard-header'];
 selectors.forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.remove()));
 document.querySelectorAll('img').forEach(img=>{if(/banner-eventos-operacionais-cluster/i.test(img.getAttribute('src')||'')){const wrap=img.closest('header,section,div');(wrap&&wrap.parentElement===document.body?wrap:img).remove();}});
 document.querySelectorAll('body > header, body > section, body > div').forEach(el=>{if(el.id==='claroReportShell')return;const text=clean(el.textContent).toLowerCase();if(text.includes('certificado de propriedade')&&(text.includes('serviços técnicos')||text.includes('servicos tecnicos'))&&el.getBoundingClientRect().top<350)el.remove();});
}
function sessionUser(){
 const fromUrl=new URLSearchParams(location.search).get('portal_user');if(fromUrl)return clean(fromUrl);
 const candidates=['portal_usuario_nome','usuario_nome','nome_usuario','user_name','portalUserName','nome'];
 for(const k of candidates){const v=localStorage.getItem(k)||sessionStorage.getItem(k);if(v&&v.length<120)return clean(v.replace(/^"|"$/g,''));}
 try{const raw=localStorage.getItem('portalUser');if(raw){const o=JSON.parse(raw);return clean(o.nome||o.name||o.email||'');}}catch(e){}
 return '';
}
function portalClient(){
 const cfg=window.PORTAL_CONFIG||{},key=cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_ANON_KEY;
 return window.supabaseClient||window.sb||((window.supabase&&cfg.SUPABASE_URL&&key)?window.supabase.createClient(cfg.SUPABASE_URL,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null);
}
async function resolveUser(target){let name=sessionUser();try{const u=(await portalClient()?.auth?.getSession?.())?.data?.session?.user;name=clean(u?.email?.split('@')[0]||name);}catch(e){}target.textContent=(name||'usuário conectado').toUpperCase();}
function latestDate(){const clone=document.body.cloneNode(true);clone.querySelectorAll('#claroReportShell,script,style,noscript,template').forEach(x=>x.remove());const text=clone.textContent||'',found=[],now=new Date(),re=/(\b\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4}\b)/g;let m;while((m=re.exec(text))){const d=new Date(+m[3],+m[2]-1,+m[1]);if(d.getFullYear()==+m[3]&&d.getMonth()==+m[2]-1&&d.getDate()==+m[1]&&d<=new Date(now.getFullYear()+1,11,31))found.push({d,label:m[0]});}found.sort((a,b)=>b.d-a.d);return found[0]?.label||'';}
function applyActivePortalUser(value){const login=clean(value).split('@')[0],target=document.getElementById('claroReportUser');if(target&&login)target.textContent=login.toUpperCase();}
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.data?.type!=='PORTAL_ACTIVE_USER')return;applyActivePortalUser(event.data.login);});
function reportTarget(x){return clean(x.arquivo||x.page_path||x.pagina||x.url||'');}
function navigate(target){if(!target)return;const u=new URL(target,location.href);const login=sessionUser();if(login)u.searchParams.set('portal_user',login.split('@')[0]);location.assign(u.href);}
async function loadMenu(){
 const list=document.getElementById('claroMenuList');if(!list||list.dataset.loaded==='1')return;list.innerHTML='<div class="claro-menu-loading">Carregando acessos...</div>';
 try{
  const c=portalClient();if(!c?.rpc)throw new Error('Cliente do portal indisponível');
  const r=await c.rpc('listar_minhas_paginas_portal');if(r.error)throw r.error;
  const pages=(r.data||[]).filter(x=>reportTarget(x));
  const groups=new Map();pages.forEach(x=>{const key=clean(x.categoria||'manutencao').toLowerCase(),arr=groups.get(key)||[];arr.push(x);groups.set(key,arr);});
  let html='<a class="claro-menu-home" href="'+esc(portalUrl())+'"><span>⌂</span><b>Página inicial</b></a>';
  for(const [key,items] of groups){items.sort((a,b)=>clean(a.nome).localeCompare(clean(b.nome),'pt-BR'));html+='<section class="claro-menu-group"><button type="button" class="claro-menu-group-title" aria-expanded="true"><span>'+esc(CATS[key]||key)+'</span><i>⌃</i></button><div>';for(const x of items){const file=reportTarget(x),active=file.toLowerCase()===currentFile().toLowerCase();html+='<button type="button" class="claro-menu-link'+(active?' active':'')+'" data-target="'+esc(file)+'"><span>'+esc(x.nome||file.replace(/\.html?$/i,'').replace(/[_-]+/g,' '))+'</span><i>›</i></button>';}html+='</div></section>';}
  const session=(await c.auth?.getSession?.())?.data?.session,admin=/demetrius377/i.test(session?.user?.email||sessionUser());
  if(admin){const tools=[['Central de Atualização','atualizador_relatorios.html'],['Administrar Permissões','admin_permissoes.html'],['Gerenciar Relatórios','admin_relatorios.html'],['Central de Logins','Central_de_Logins.html'],['Controle de acessos','admin-acessos.html'],['Compilador de indicadores','central_de_resumos_watts.html']];html+='<section class="claro-menu-group"><button type="button" class="claro-menu-group-title" aria-expanded="false"><span>Administração</span><i>⌄</i></button><div hidden>';for(const [name,file] of tools)html+='<button type="button" class="claro-menu-link" data-target="'+file+'"><span>'+name+'</span><i>›</i></button>';html+='</div></section>';}
  list.innerHTML=html;list.dataset.loaded='1';
  list.querySelectorAll('[data-target]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.target)));
  list.querySelectorAll('.claro-menu-group-title').forEach(b=>b.addEventListener('click',()=>{const box=b.nextElementSibling,open=!box.hidden;box.hidden=open;b.setAttribute('aria-expanded',String(!open));b.lastElementChild.textContent=open?'⌄':'⌃';}));
 }catch(e){console.warn('[PortalMenu]',e);list.innerHTML='<a class="claro-menu-home" href="'+esc(portalUrl())+'"><span>⌂</span><b>Página inicial</b></a><p class="claro-menu-error">A lista de acessos está temporariamente indisponível. O relatório continua funcionando normalmente.</p>';}
}
function setupMenu(shell){
 const drawer=shell.querySelector('#claroMenuDrawer'),backdrop=shell.querySelector('#claroMenuBackdrop'),openBtn=shell.querySelector('#claroMenuOpen'),closeBtn=shell.querySelector('#claroMenuClose'),search=shell.querySelector('#claroMenuSearch');let lastFocus;
 const close=()=>{drawer.classList.remove('open');backdrop.classList.remove('open');drawer.setAttribute('aria-hidden','true');document.body.classList.remove('claro-menu-lock');lastFocus?.focus();};
 const open=()=>{lastFocus=document.activeElement;drawer.classList.add('open');backdrop.classList.add('open');drawer.setAttribute('aria-hidden','false');document.body.classList.add('claro-menu-lock');loadMenu().then(()=>search.focus());};
 openBtn.addEventListener('click',open);closeBtn.addEventListener('click',close);backdrop.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer.classList.contains('open'))close();});
 search.addEventListener('input',()=>{const q=clean(search.value).toLocaleLowerCase('pt-BR');shell.querySelectorAll('.claro-menu-link').forEach(x=>x.hidden=q&&!x.textContent.toLocaleLowerCase('pt-BR').includes(q));});
}
function build(){
 if(document.getElementById('claroReportShell'))return;removeLegacy();const shell=document.createElement('div');shell.id='claroReportShell';shell.setAttribute('role','banner');
 shell.innerHTML=`<div class="claro-report-banner"><div class="claro-report-brand" aria-label="Claro"><div class="claro-report-logo">Claro<span class="claro-report-logo-rays" aria-hidden="true"><i></i><i></i><i></i></span></div></div><div class="claro-report-titlebox"><h1 class="claro-report-title">${esc(FIXED_TITLE)}</h1><div class="claro-report-welcome">Olá: <strong id="claroReportUser">usuário conectado</strong></div></div><div class="claro-report-property"><div class="claro-report-certificate">Certificado de propriedade: ${OWNER}</div><div class="claro-report-service" aria-label="Serviços Técnicos BI"><div class="claro-report-service-text"><small>SERVIÇOS</small><b>TÉCNICOS</b></div><div class="claro-report-bi">BI</div></div></div><button id="claroMenuOpen" class="claro-menu-open" type="button" aria-label="Abrir menu do portal" aria-controls="claroMenuDrawer">☰</button></div><div class="claro-report-toolbar"><div class="claro-report-meta"><span>▣ ATUAL: <b id="claroReportDate">--/--</b></span></div><nav class="claro-report-actions" aria-label="Navegação do relatório"><button class="claro-report-btn" id="claroBackPortal" type="button">← Voltar para o portal</button><button class="claro-report-btn" id="claroOpenWindow" type="button">▣ Abrir em nova janela</button></nav></div><div id="claroMenuBackdrop" class="claro-menu-backdrop"></div><aside id="claroMenuDrawer" class="claro-menu-drawer" aria-hidden="true" aria-label="Menu do portal"><header><div><b>Portal de Indicadores</b><small>Acesso rápido</small></div><button id="claroMenuClose" type="button" aria-label="Fechar menu">×</button></header><label class="claro-menu-search"><span>⌕</span><input id="claroMenuSearch" type="search" placeholder="Buscar relatórios..." autocomplete="off"></label><div id="claroMenuList" class="claro-menu-list"></div><footer><span class="claro-menu-avatar">●</span><div><b id="claroMenuUser">Usuário conectado</b><small>Lista conforme suas permissões</small></div></footer></aside>`;
 document.body.insertBefore(shell,document.body.firstChild);resolveUser(shell.querySelector('#claroReportUser')).then(()=>{shell.querySelector('#claroMenuUser').textContent=shell.querySelector('#claroReportUser').textContent;});
 const updateDate=()=>{const d=latestDate();shell.querySelector('#claroReportDate').textContent=d?d.replace(/[-.]/g,'/').split('/').slice(0,2).join('/'):'--/--';};updateDate();let dateTimer;new MutationObserver(()=>{clearTimeout(dateTimer);dateTimer=setTimeout(updateDate,300);}).observe(document.body,{subtree:true,childList:true,characterData:true});document.addEventListener('change',()=>setTimeout(updateDate,500),true);setTimeout(updateDate,1200);setTimeout(updateDate,3000);
 shell.querySelector('#claroBackPortal').addEventListener('click',goHome);shell.querySelector('#claroOpenWindow').addEventListener('click',()=>{const w=window.open(location.href,'_blank','noopener,noreferrer');if(w)w.opener=null;});setupMenu(shell);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
