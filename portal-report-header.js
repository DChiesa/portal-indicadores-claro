(function(){
'use strict';
if(window.__CLARO_REPORT_HEADER__)return;window.__CLARO_REPORT_HEADER__=true;
const OWNER='Demétrius Chiesa';
const PORTAL_FILE='index.html';
const FIXED_TITLE='PORTAL DE INDICADORES';
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const esc=s=>clean(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function reportTitle(){
 const explicit=document.documentElement.dataset.reportTitle||document.body?.dataset.reportTitle;
 let t=clean(explicit||document.title||'Relatório');
 return t.replace(/\s*[|\-–]\s*Portal de Indicadores Claro.*$/i,'').replace(/\s*[|\-–]\s*Supabase\s*v?[\d.]+.*$/i,'')||'Relatório';
}
function portalUrl(){return new URL(PORTAL_FILE,location.href).href;}
function removeLegacy(){
 const selectors=['#clvHeader','#bannerClaroPadrao','.banner-claro-padrao','.banner-claro-acoes','#headerPadraoClaro','.header-padrao-claro','.portal-report-header','.report-standard-header'];
 selectors.forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.remove()));
 document.querySelectorAll('img').forEach(img=>{if(/banner-eventos-operacionais-cluster/i.test(img.getAttribute('src')||'')){const wrap=img.closest('header,section,div');(wrap&&wrap.parentElement===document.body?wrap:img).remove();}});
 document.querySelectorAll('body > header, body > section, body > div').forEach(el=>{
   if(el.id==='claroReportShell')return;
   const text=clean(el.textContent).toLowerCase();
   if(text.includes('certificado de propriedade')&&(text.includes('serviços técnicos')||text.includes('servicos tecnicos'))&&el.getBoundingClientRect().top<350) el.remove();
 });
}
function sessionUser(){
 const fromUrl=new URLSearchParams(location.search).get('portal_user');if(fromUrl)return clean(fromUrl);
 const candidates=['portal_usuario_nome','usuario_nome','nome_usuario','user_name','portalUserName','nome'];
 for(const k of candidates){const v=localStorage.getItem(k)||sessionStorage.getItem(k);if(v&&v.length<120)return clean(v.replace(/^"|"$/g,''));}
 try{const raw=localStorage.getItem('portalUser');if(raw){const o=JSON.parse(raw);return clean(o.nome||o.name||o.email||'');}}catch(e){}
 return '';
}
async function resolveUser(target){
 let name=sessionUser();
 try{
   const cfg=window.PORTAL_CONFIG||{};
   const key=cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_ANON_KEY;
   const client=window.supabaseClient||window.sb||((window.supabase&&cfg.SUPABASE_URL&&key)?window.supabase.createClient(cfg.SUPABASE_URL,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null);
   if(client?.auth?.getSession){const r=await client.auth.getSession();const u=r?.data?.session?.user;name=clean(u?.email?.split('@')[0]||name);}
 }catch(e){}
 target.textContent=(name||'usuário conectado').toUpperCase();
}
function latestDate(){
 const clone=document.body.cloneNode(true);clone.querySelectorAll('#claroReportShell,script,style,noscript,template').forEach(x=>x.remove());
 const text=clone.textContent||'';const found=[];const now=new Date();
 const re=/(\b\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4}\b)/g;let m;
 while((m=re.exec(text))){const d=new Date(+m[3],+m[2]-1,+m[1]);if(d.getFullYear()==+m[3]&&d.getMonth()==+m[2]-1&&d.getDate()==+m[1]&&d<=new Date(now.getFullYear()+1,11,31))found.push({d,label:m[0]});}
 found.sort((a,b)=>b.d-a.d);return found[0]?.label||'';
}
function applyActivePortalUser(value){
 const login=clean(value).split('@')[0];const target=document.getElementById('claroReportUser');if(target&&login)target.textContent=login.toUpperCase();
}
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.data?.type!=='PORTAL_ACTIVE_USER')return;applyActivePortalUser(event.data.login);});
function build(){
 if(document.getElementById('claroReportShell'))return;
 removeLegacy();
 const shell=document.createElement('div');shell.id='claroReportShell';shell.setAttribute('role','banner');
 shell.innerHTML=`<div class="claro-report-banner"><div class="claro-report-brand" aria-label="Claro"><div class="claro-report-logo">Claro<span class="claro-report-logo-rays" aria-hidden="true"><i></i><i></i><i></i></span></div></div><div class="claro-report-titlebox"><h1 class="claro-report-title">${esc(FIXED_TITLE)}</h1><div class="claro-report-welcome">Olá: <strong id="claroReportUser">usuário conectado</strong></div></div><div class="claro-report-property"><div class="claro-report-certificate">Certificado de propriedade: ${OWNER}</div><div class="claro-report-service" aria-label="Serviços Técnicos BI"><div class="claro-report-service-text"><small>SERVIÇOS</small><b>TÉCNICOS</b></div><div class="claro-report-bi">BI</div></div></div></div><div class="claro-report-meta"><span>▣ ATUAL: <b id="claroReportDate">--/--</b></span></div><nav class="claro-report-actions" aria-label="Navegação do relatório"><button class="claro-report-btn" id="claroBackPortal" type="button">← Voltar para o portal</button><button class="claro-report-btn" id="claroOpenWindow" type="button">▣ Abrir em nova janela</button></nav>`;
 document.body.insertBefore(shell,document.body.firstChild);
 const user=shell.querySelector('#claroReportUser');resolveUser(user);
 const updateDate=()=>{const d=latestDate();shell.querySelector('#claroReportDate').textContent=d?d.replace(/[-.]/g,'/').split('/').slice(0,2).join('/'):'--/--';};
 updateDate();let dateTimer;new MutationObserver(()=>{clearTimeout(dateTimer);dateTimer=setTimeout(updateDate,300);}).observe(document.body,{subtree:true,childList:true,characterData:true});
 document.addEventListener('change',()=>setTimeout(updateDate,500),true);setTimeout(updateDate,1200);setTimeout(updateDate,3000);
 shell.querySelector('#claroBackPortal').addEventListener('click',()=>location.assign(portalUrl()));
 shell.querySelector('#claroOpenWindow').addEventListener('click',()=>{const w=window.open(location.href,'_blank','noopener,noreferrer');if(w)w.opener=null;});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
