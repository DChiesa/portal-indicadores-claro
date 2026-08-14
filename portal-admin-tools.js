(function(){
'use strict';
const ADMIN_IDS=['demetrius377','demetrius377@claro.com.br','demetrius377@gmail.com'];
let sb;
const norm=v=>String(v||'').trim().toLowerCase();
const client=()=>sb||(sb=window.supabase&&window.PORTAL_CONFIG?window.supabase.createClient(window.PORTAL_CONFIG.SUPABASE_URL,window.PORTAL_CONFIG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null);
function isAdmin(email){return ADMIN_IDS.some(x=>norm(email).includes(norm(x)))}
async function registrar(){try{const c=client();if(!c)return;const s=(await c.auth.getSession()).data.session;if(!s)return;const page=decodeURIComponent(location.pathname.split('/').pop()||'index.html');await c.rpc('portal_registrar_acesso',{p_pagina:page,p_login:s.user.email||s.user.user_metadata?.login||'',p_user_agent:navigator.userAgent.slice(0,500)});}catch(e){console.warn('Registro de acesso:',e)}}
async function card(){
 try{
  if(!/(^|\/)index\.html$/i.test(location.pathname)&&location.pathname!='/')return;
  const c=client();if(!c)return;const s=(await c.auth.getSession()).data.session;if(!s||!isAdmin(s.user.email))return;
  if(document.getElementById('adminAccessLogCard'))return;
  const headers=[...document.querySelectorAll('*')].filter(e=>/^Administra[cç][aã]o(?:\s+\d+\s+m[oó]dulos)?$/i.test((e.textContent||'').trim())&&e.children.length<4);
  const header=headers[0]; if(!header)return;
  let section=header.parentElement; let grid=section?.querySelector(':scope > div:last-child');
  if(!grid||grid===header){grid=section?.nextElementSibling}
  if(!grid)return;
  const exemplar=[...grid.children].find(x=>/Central de Logins|Gerenciar Relat[oó]rios|Administrar Permiss[oõ]es/i.test(x.textContent||''));
  const a=document.createElement('a');a.id='adminAccessLogCard';a.href='admin-acessos.html';
  if(exemplar)a.className=exemplar.className;
  a.style.textDecoration='none';a.style.color='inherit';
  a.innerHTML='<div style="background:linear-gradient(135deg,#12365a,#245c89);color:#fff;min-height:138px;display:grid;place-items:center;padding:18px;border-radius:16px 16px 0 0;font-size:23px;font-weight:900;text-align:center">LOG DE ACESSOS</div><div style="background:#fff;padding:18px;border-radius:0 0 16px 16px;min-height:82px"><b>Controle de acessos</b><div style="font-size:12px;color:#667085;margin-top:5px">Diário, semanal e mensal</div></div>';
  grid.appendChild(a);
  const txt=header.textContent||'';header.textContent=txt.replace(/(Administra[cç][aã]o)\s+\d+\s+m[oó]dulos/i,'$1  5 módulos');
 }catch(e){console.warn('Card de acessos:',e)}
}
async function start(){await registrar();await card()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();